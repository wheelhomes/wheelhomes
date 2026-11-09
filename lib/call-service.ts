"use client";

/**
 * WhatsApp-style online voice calls (WebRTC P2P + Firestore Wideband Voice Relay).
 *
 * Works in both local development and live production:
 * 1. Direct WebRTC P2P (`RTCPeerConnection` + STUN) for sub-50ms native audio in production.
 * 2. Automatic Firestore `voice_${userId}` wideband PCM relay (with voice activity detection
 *    `rawRms > 0.008` so silent frames are never sent) for NAT/emulator traversal.
 */

import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
    iceCandidatePoolSize: 4,
};

export type CallStatus = "ringing" | "accepted" | "declined" | "ended" | "missed";

export interface CallSession {
    callId: string;
    pc: RTCPeerConnection;
    localStream: MediaStream;
    remoteStream: MediaStream;
    unsubs: Array<() => void>;
    setSpeakerMuted?: (muted: boolean) => void;
}

export interface StartCallParams {
    callerId: string;
    callerName: string;
    calleeId: string;
    calleeName: string;
    jobId?: string;
    requestCode?: string;
}

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = 7200; // 450ms at 16000Hz wideband

let unlockedAudioCtx: AudioContext | null = null;

/**
 * Must be called synchronously inside a user click/tap handler (BEFORE any `await`)
 * so Chrome/Edge/Safari immediately unlock the AudioContext in "running" state.
 */
export function ensureUnlockedAudioContext(): AudioContext {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!unlockedAudioCtx || unlockedAudioCtx.state === "closed") {
        unlockedAudioCtx = new Ctx();
    }
    if (unlockedAudioCtx.state === "suspended") {
        unlockedAudioCtx.resume().catch(() => {});
    }
    return unlockedAudioCtx;
}

async function getMic(audioCtx: AudioContext): Promise<{ stream: MediaStream; isRealMic: boolean }> {
    try {
        if (navigator.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });
            return { stream, isRealMic: true };
        }
    } catch (err) {
        console.warn("Microphone fallback activated (no mic or permission blocked):", err);
    }
    const dest = audioCtx.createMediaStreamDestination();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(dest);
    osc.start();
    return { stream: dest.stream, isRealMic: false };
}

function buildPeer(localStream: MediaStream) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const remoteStream = new MediaStream();
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    pc.ontrack = (ev) => {
        ev.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
    };
    return { pc, remoteStream };
}

function int16ToBase64(samples: Int16Array): string {
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    let binary = "";
    const step = 0x4000;
    for (let i = 0; i < bytes.length; i += step) {
        binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + step))
        );
    }
    return btoa(binary);
}

function base64ToInt16(b64: string): Int16Array {
    const binary = atob(b64);
    const len = binary.length - (binary.length % 2);
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
}

function attachVoiceRelay(
    callRef: ReturnType<typeof doc>,
    audioCtx: AudioContext,
    localStream: MediaStream,
    isRealMic: boolean,
    myUserId: string,
    pc: RTCPeerConnection
) {
    audioCtx.resume?.().catch(() => {});

    let isCallAccepted = false;
    let isDisposed = false;
    let speakerMuted = false;
    let seqOut = 0;
    const lastSeqBySender: Record<string, number> = {};
    let nextPlayTime = 0;
    const myField = `voice_${myUserId}`;

    // 1. Capture & downsample local mic to 16000 Hz 16-bit PCM (only when speaking)
    const source = audioCtx.createMediaStreamSource(localStream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    const silenceGain = audioCtx.createGain();
    silenceGain.gain.value = 0;

    const sampleBuffer: number[] = [];

    processor.onaudioprocess = (e) => {
        if (isDisposed || !isCallAccepted || !isRealMic) return;
        if (pc.connectionState === "connected") return;

        const track = localStream.getAudioTracks()[0];
        if (!track || !track.enabled) return;

        const input = e.inputBuffer.getChannelData(0);
        const ratio = audioCtx.sampleRate / TARGET_SAMPLE_RATE;

        for (let i = 0; i < input.length; i += ratio) {
            const idx = Math.min(Math.floor(i), input.length - 1);
            const val = Math.max(-1, Math.min(1, input[idx]));
            sampleBuffer.push(val);
        }

        if (sampleBuffer.length >= CHUNK_SAMPLES) {
            const raw = sampleBuffer.splice(0, CHUNK_SAMPLES);
            let rawSumSq = 0;
            for (let i = 0; i < raw.length; i++) {
                rawSumSq += raw[i] * raw[i];
            }
            const rawRms = Math.sqrt(rawSumSq / raw.length);

            // Real speech gate: only transmit when someone is actually speaking (> 0.006)
            if (rawRms > 0.006) {
                seqOut += 1;
                const chunk = new Int16Array(raw.length);
                for (let i = 0; i < raw.length; i++) {
                    const boosted = Math.max(-1, Math.min(1, raw[i] * 2.2));
                    chunk[i] = boosted < 0 ? boosted * 0x8000 : boosted * 0x7fff;
                }
                const b64 = int16ToBase64(chunk);
                updateDoc(callRef, {
                    [myField]: {
                        seq: seqOut,
                        senderId: myUserId,
                        b64,
                        rate: TARGET_SAMPLE_RATE,
                    },
                }).catch(() => {});
            }
        }
    };

    source.connect(processor);
    processor.connect(silenceGain);
    silenceGain.connect(audioCtx.destination);

    // 2. Play incoming PCM chunks from the counterparty
    const playIncomingChunk = (b64: string, rate = TARGET_SAMPLE_RATE) => {
        if (isDisposed || speakerMuted) return;
        if (pc.connectionState === "connected") return;
        try {
            if (audioCtx.state === "suspended") {
                audioCtx.resume().catch(() => {});
            }
            const pcm16 = base64ToInt16(b64);
            if (pcm16.length === 0) return;

            const audioBuffer = audioCtx.createBuffer(1, pcm16.length, rate);
            const channelData = audioBuffer.getChannelData(0);
            const fadeLen = Math.min(80, Math.floor(pcm16.length / 10));
            for (let i = 0; i < pcm16.length; i++) {
                let env = 2.4;
                if (i < fadeLen) env *= i / fadeLen;
                else if (i > pcm16.length - fadeLen) env *= (pcm16.length - i) / fadeLen;
                channelData[i] = Math.max(-1, Math.min(1, (pcm16[i] / 32768.0) * env));
            }

            const bufferSource = audioCtx.createBufferSource();
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(audioCtx.destination);

            const now = audioCtx.currentTime;
            if (nextPlayTime < now) {
                nextPlayTime = now + 0.08;
            }
            bufferSource.start(nextPlayTime);
            nextPlayTime += audioBuffer.duration;
        } catch {}
    };

    const onSnapshotUpdate = (data: any) => {
        if (!data) return;
        if (data.status === "accepted") {
            isCallAccepted = true;
        }
        for (const [key, val] of Object.entries(data)) {
            if (key === myField) continue;
            if (!key.startsWith("voice_") && key !== "voiceChunk") continue;
            const vc = val as any;
            if (
                vc &&
                typeof vc.senderId === "string" &&
                vc.senderId !== myUserId &&
                typeof vc.seq === "number" &&
                vc.seq > (lastSeqBySender[vc.senderId] || 0) &&
                typeof vc.b64 === "string"
            ) {
                lastSeqBySender[vc.senderId] = vc.seq;
                playIncomingChunk(vc.b64, vc.rate || TARGET_SAMPLE_RATE);
            }
        }
    };

    const cleanup = () => {
        isDisposed = true;
        try {
            processor.disconnect();
            source.disconnect();
            silenceGain.disconnect();
        } catch {}
    };

    return {
        onSnapshotUpdate,
        cleanup,
        setAccepted: () => {
            isCallAccepted = true;
        },
        setSpeakerMuted: (m: boolean) => {
            speakerMuted = m;
        },
    };
}

/** Caller: creates the call doc + WebRTC offer + Voice relay. */
export async function startCall(params: StartCallParams): Promise<CallSession> {
    const audioCtx = ensureUnlockedAudioContext();
    const { stream: localStream, isRealMic } = await getMic(audioCtx);
    const { pc, remoteStream } = buildPeer(localStream);

    const callRef = await addDoc(collection(db, "chats"), {
        participants: [params.callerId, params.calleeId],
        isVoiceCall: true,
        callerId: params.callerId,
        callerName: params.callerName,
        calleeId: params.calleeId,
        calleeName: params.calleeName,
        jobId: params.jobId || null,
        requestCode: params.requestCode || null,
        status: "ringing",
        platform: "web",
        callerCandidates: [],
        calleeCandidates: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    const relay = attachVoiceRelay(callRef, audioCtx, localStream, isRealMic, params.callerId, pc);

    pc.onicecandidate = (ev) => {
        if (ev.candidate) {
            const c = ev.candidate.toJSON();
            updateDoc(callRef, {
                callerCandidates: arrayUnion({
                    candidate: c.candidate || "",
                    sdpMid: c.sdpMid ?? null,
                    sdpMLineIndex: c.sdpMLineIndex ?? null,
                }),
                updatedAt: serverTimestamp(),
            }).catch(() => {});
        }
    };

    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await updateDoc(callRef, {
        offer: { type: offer.type, sdp: offer.sdp },
        updatedAt: serverTimestamp(),
    });

    const unsubs: Array<() => void> = [relay.cleanup];
    const addedCandidates = new Set<string>();

    unsubs.push(
        onSnapshot(callRef, async (snap) => {
            const data = snap.data();
            if (!data) return;
            relay.onSnapshotUpdate(data);
            if (data.answer && !pc.currentRemoteDescription) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch {}
            }
            const cands: any[] = Array.isArray(data.calleeCandidates) ? data.calleeCandidates : [];
            for (const c of cands) {
                const key = `${c.candidate}_${c.sdpMid}_${c.sdpMLineIndex}`;
                if (!addedCandidates.has(key) && c.candidate) {
                    addedCandidates.add(key);
                    pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
            }
        })
    );

    return {
        callId: callRef.id,
        pc,
        localStream,
        remoteStream,
        unsubs,
        setSpeakerMuted: relay.setSpeakerMuted,
    };
}

/** Callee: answers an incoming call. */
export async function answerCall(callId: string, calleeUserId?: string): Promise<CallSession> {
    const audioCtx = ensureUnlockedAudioContext();
    const callRef = doc(db, "chats", callId);
    const snap = await getDoc(callRef);
    const data = snap.data();
    if (!data || (data.status && data.status !== "ringing" && data.status !== "accepted")) {
        throw new Error("Call is no longer available.");
    }

    const myId = calleeUserId || String(data.calleeId || "");
    const { stream: localStream, isRealMic } = await getMic(audioCtx);
    const { pc, remoteStream } = buildPeer(localStream);
    const relay = attachVoiceRelay(callRef, audioCtx, localStream, isRealMic, myId, pc);
    relay.setAccepted();

    pc.onicecandidate = (ev) => {
        if (ev.candidate) {
            const c = ev.candidate.toJSON();
            updateDoc(callRef, {
                calleeCandidates: arrayUnion({
                    candidate: c.candidate || "",
                    sdpMid: c.sdpMid ?? null,
                    sdpMLineIndex: c.sdpMLineIndex ?? null,
                }),
                updatedAt: serverTimestamp(),
            }).catch(() => {});
        }
    };

    if (data.offer?.sdp && data.offer?.type) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(callRef, {
            answer: { type: answer.type, sdp: answer.sdp },
            status: "accepted",
            answeredAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } else {
        await updateDoc(callRef, {
            status: "accepted",
            answeredAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    const unsubs: Array<() => void> = [relay.cleanup];
    const addedCandidates = new Set<string>();

    unsubs.push(
        onSnapshot(callRef, (s) => {
            const d = s.data();
            relay.onSnapshotUpdate(d);
            const cands: any[] = Array.isArray(d?.callerCandidates) ? d!.callerCandidates : [];
            for (const c of cands) {
                const key = `${c.candidate}_${c.sdpMid}_${c.sdpMLineIndex}`;
                if (!addedCandidates.has(key) && c.candidate) {
                    addedCandidates.add(key);
                    pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
            }
        })
    );

    return {
        callId,
        pc,
        localStream,
        remoteStream,
        unsubs,
        setSpeakerMuted: relay.setSpeakerMuted,
    };
}

export async function setCallStatus(callId: string, status: CallStatus) {
    try {
        await updateDoc(doc(db, "chats", callId), {
            status,
            updatedAt: serverTimestamp(),
            ...(status === "ended" || status === "declined" || status === "missed"
                ? { endedAt: serverTimestamp() }
                : {}),
        });
    } catch {}
}

export function teardownSession(session: CallSession | null) {
    if (!session) return;
    session.unsubs.forEach((u) => u());
    session.localStream.getTracks().forEach((t) => t.stop());
    session.remoteStream.getTracks().forEach((t) => t.stop());
    try {
        session.pc.close();
    } catch {}
}

/** Fire this from any button to start a call through the global call manager. */
export function requestOnlineCall(detail: {
    calleeId: string;
    calleeName: string;
    jobId?: string;
    requestCode?: string;
}) {
    if (typeof window === "undefined") return;
    try {
        ensureUnlockedAudioContext();
    } catch {}
    window.dispatchEvent(new CustomEvent("wheelhomes:start-call", { detail }));
}
