"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { db } from "@/lib/firebase";
import {
    answerCall,
    CallSession,
    setCallStatus,
    startCall,
    teardownSession,
} from "@/lib/call-service";
import { sendNotification } from "@/lib/notifications";

type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active" | "ended";

interface PeerInfo {
    callId?: string;
    name: string;
    requestCode?: string;
    jobId?: string;
}

interface Props {
    userId: string;
    userName: string;
}

const RING_TIMEOUT_MS = 45000;

/** Looping synthesized ringtone / ringback using Web Audio. */
function useRingtone() {
    const ctxRef = useRef<AudioContext | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stop = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    const play = useCallback(
        (kind: "incoming" | "ringback") => {
            stop();
            try {
                const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                if (!ctxRef.current) ctxRef.current = new Ctx();
                const ctx = ctxRef.current!;
                ctx.resume?.();
                const burst = () => {
                    const now = ctx.currentTime;
                    const notes =
                        kind === "incoming"
                            ? [
                                  [784, 0],
                                  [1175, 0.18],
                                  [784, 0.5],
                                  [1175, 0.68],
                              ]
                            : [
                                  [440, 0],
                                  [480, 0],
                              ];
                    notes.forEach(([freq, offset]) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "sine";
                        osc.frequency.value = freq;
                        const dur = kind === "incoming" ? 0.22 : 1.2;
                        const vol = kind === "incoming" ? 0.22 : 0.07;
                        gain.gain.setValueAtTime(0, now + offset);
                        gain.gain.linearRampToValueAtTime(vol, now + offset + 0.02);
                        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);
                        osc.connect(gain).connect(ctx.destination);
                        osc.start(now + offset);
                        osc.stop(now + offset + dur + 0.05);
                    });
                };
                burst();
                timerRef.current = setInterval(burst, kind === "incoming" ? 2000 : 3000);
            } catch {}
        },
        [stop]
    );

    useEffect(() => stop, [stop]);
    return { play, stop };
}

function formatDuration(sec: number) {
    const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export const GlobalCallManager: React.FC<Props> = ({ userId, userName }) => {
    const [phase, setPhase] = useState<Phase>("idle");
    const [peer, setPeer] = useState<PeerInfo | null>(null);
    const [muted, setMuted] = useState(false);
    const [speakerOff, setSpeakerOff] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [endReason, setEndReason] = useState("");
    const [error, setError] = useState("");

    const sessionRef = useRef<CallSession | null>(null);
    const callIdRef = useRef<string | null>(null);
    const phaseRef = useRef<Phase>("idle");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const callDocUnsubRef = useRef<(() => void) | null>(null);
    const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handledIncomingRef = useRef<Set<string>>(new Set());
    const { play, stop } = useRingtone();

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    const attachRemoteAudio = (session: CallSession) => {
        if (audioRef.current) {
            audioRef.current.srcObject = session.remoteStream;
            audioRef.current.play().catch(() => {});
        }
        session.pc.onconnectionstatechange = () => {
            const st = session.pc.connectionState;
            if (st === "connected") {
                setPhase("active");
            }
        };
    };

    const finish = useCallback(
        (reason: string, updateRemote: boolean, status: "ended" | "declined" | "missed" = "ended") => {
            stop();
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
            callDocUnsubRef.current?.();
            callDocUnsubRef.current = null;
            const id = callIdRef.current;
            if (updateRemote && id) setCallStatus(id, status);
            teardownSession(sessionRef.current);
            sessionRef.current = null;
            callIdRef.current = null;
            setEndReason(reason);
            setPhase("ended");
            setTimeout(() => {
                if (phaseRef.current === "ended") {
                    setPhase("idle");
                    setPeer(null);
                    setSeconds(0);
                    setMuted(false);
                    setSpeakerOff(false);
                    setError("");
                }
            }, 1800);
        },
        [stop]
    );

    /** Watch the call doc so either side reacts to accept/decline/hang up. */
    const watchCallDoc = useCallback(
        (callId: string) => {
            callDocUnsubRef.current?.();
            callDocUnsubRef.current = onSnapshot(doc(db, "chats", callId), (snap) => {
                const data = snap.data();
                if (!data) return;
                if (data.status === "accepted" && (phaseRef.current === "outgoing" || phaseRef.current === "connecting")) {
                    stop();
                    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
                    setPhase("active");
                }
                if (data.status === "declined") finish("Call declined", false);
                if (data.status === "ended" && phaseRef.current !== "ended" && phaseRef.current !== "idle")
                    finish("Call ended", false);
                if (data.status === "missed" && phaseRef.current === "incoming") finish("Missed call", false);
            });
        },
        [finish, stop]
    );

    // ---------- Outgoing call (triggered from any Call button) ----------
    useEffect(() => {
        const handler = async (e: Event) => {
            const detail = (e as CustomEvent).detail as {
                calleeId: string;
                calleeName: string;
                jobId?: string;
                requestCode?: string;
            };
            if (!detail?.calleeId || phaseRef.current !== "idle") return;
            if (detail.calleeId === userId) return;

            setPeer({ name: detail.calleeName, requestCode: detail.requestCode, jobId: detail.jobId });
            setPhase("outgoing");
            setError("");
            play("ringback");
            try {
                const session = await startCall({
                    callerId: userId,
                    callerName: userName,
                    calleeId: detail.calleeId,
                    calleeName: detail.calleeName,
                    jobId: detail.jobId,
                    requestCode: detail.requestCode,
                });
                sessionRef.current = session;
                callIdRef.current = session.callId;
                attachRemoteAudio(session);
                watchCallDoc(session.callId);

                ringTimeoutRef.current = setTimeout(() => {
                    if (phaseRef.current === "outgoing") {
                        finish("No answer", true, "missed");
                        sendNotification(
                            detail.calleeId,
                            `Missed call from ${userName} 📞`,
                            detail.requestCode
                                ? `You missed an online call about request #${detail.requestCode}.`
                                : "You missed an online voice call.",
                            "info",
                            undefined,
                            { jobId: detail.jobId, requestCode: detail.requestCode }
                        ).catch(() => {});
                    }
                }, RING_TIMEOUT_MS);
            } catch (err: any) {
                stop();
                setError(
                    err?.name === "NotAllowedError"
                        ? "Microphone permission was blocked. Allow mic access to make calls."
                        : err?.message || "Could not start the call."
                );
                finish("Call failed", false);
            }
        };
        window.addEventListener("wheelhomes:start-call", handler);
        return () => window.removeEventListener("wheelhomes:start-call", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, userName, play, stop, finish, watchCallDoc]);

    // ---------- Incoming call listener ----------
    useEffect(() => {
        if (!userId) return;
        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", userId)
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                snap.docChanges().forEach((c) => {
                    if (c.type !== "added" && c.type !== "modified") return;
                    const d = c.doc.data();
                    if (!d?.isVoiceCall || d.calleeId !== userId || d.status !== "ringing") return;
                    if (handledIncomingRef.current.has(c.doc.id)) return;
                    handledIncomingRef.current.add(c.doc.id);

                    // Ignore stale rings (older than the ring timeout)
                    const createdMs = d.createdAt?.toMillis?.() ?? Date.now();
                    if (Date.now() - createdMs > RING_TIMEOUT_MS) return;

                    if (phaseRef.current !== "idle") {
                        setCallStatus(c.doc.id, "declined"); // busy
                        return;
                    }
                    callIdRef.current = c.doc.id;
                    setPeer({
                        callId: c.doc.id,
                        name: d.callerName || "Wheelhomes User",
                        requestCode: d.requestCode || undefined,
                        jobId: d.jobId || undefined,
                    });
                    setPhase("incoming");
                    play("incoming");
                    watchCallDoc(c.doc.id);
                });
            },
            () => {}
        );
        return () => unsub();
    }, [userId, play, watchCallDoc]);

    // ---------- Call timer ----------
    useEffect(() => {
        if (phase !== "active") return;
        const t = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, [phase]);

    // Hang up if the tab closes mid-call
    useEffect(() => {
        const onUnload = () => {
            if (callIdRef.current && phaseRef.current !== "idle") {
                setCallStatus(callIdRef.current, "ended");
            }
        };
        window.addEventListener("beforeunload", onUnload);
        return () => window.removeEventListener("beforeunload", onUnload);
    }, []);

    const handleAccept = async () => {
        const id = callIdRef.current;
        if (!id) return;
        stop();
        setPhase("connecting");
        try {
            const session = await answerCall(id, userId);
            sessionRef.current = session;
            attachRemoteAudio(session);
            setPhase("active");
        } catch (err: any) {
            setError(
                err?.name === "NotAllowedError"
                    ? "Microphone permission was blocked."
                    : err?.message || "Could not answer the call."
            );
            finish("Call failed", true);
        }
    };

    const handleDecline = () => finish("Call declined", true, "declined");
    const handleHangUp = () => finish("Call ended", true, "ended");

    const toggleMute = () => {
        const next = !muted;
        sessionRef.current?.localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
        setMuted(next);
    };

    const toggleSpeaker = () => {
        const next = !speakerOff;
        if (audioRef.current) audioRef.current.muted = next;
        sessionRef.current?.setSpeakerMuted?.(next);
        setSpeakerOff(next);
    };

    const initials = (peer?.name || "W")
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const statusLabel =
        phase === "outgoing"
            ? "Ringing…"
            : phase === "incoming"
                ? "Incoming voice call"
                : phase === "connecting"
                    ? "Connecting…"
                    : phase === "active"
                        ? formatDuration(seconds)
                        : endReason;

    return (
        <>
            <audio ref={audioRef} autoPlay playsInline className="hidden" />
            {phase !== "idle" && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-emerald-700 to-emerald-900 text-white shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200 font-bold flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> Wheelhomes Voice Call
                        </p>

                        <div className="relative mt-8 mb-5">
                            {(phase === "incoming" || phase === "outgoing") && (
                                <>
                                    <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                                    <span className="absolute -inset-3 rounded-full border border-white/20 animate-pulse" />
                                </>
                            )}
                            <div className="relative w-28 h-28 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center text-4xl font-extrabold">
                                {initials}
                            </div>
                        </div>

                        <h2 className="text-2xl font-extrabold text-center">{peer?.name}</h2>
                        {peer?.requestCode && (
                            <span className="mt-2 px-2.5 py-0.5 rounded-md bg-white/15 text-xs font-mono font-bold">
                                #{peer.requestCode}
                            </span>
                        )}
                        <p
                            className={`mt-3 text-sm ${phase === "active" ? "font-mono text-lg text-emerald-100" : "text-emerald-100"}`}
                        >
                            {statusLabel}
                        </p>
                        {error && <p className="mt-3 text-xs text-red-200 text-center">{error}</p>}

                        {phase === "incoming" ? (
                            <div className="mt-10 flex items-center justify-center gap-16">
                                <button
                                    onClick={handleDecline}
                                    className="flex flex-col items-center gap-2 cursor-pointer"
                                >
                                    <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg">
                                        <PhoneOff className="w-7 h-7" />
                                    </span>
                                    <span className="text-xs text-emerald-100">Decline</span>
                                </button>
                                <button
                                    onClick={handleAccept}
                                    className="flex flex-col items-center gap-2 cursor-pointer"
                                >
                                    <span className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg animate-bounce">
                                        <Phone className="w-7 h-7" />
                                    </span>
                                    <span className="text-xs text-emerald-100">Accept</span>
                                </button>
                            </div>
                        ) : phase === "ended" ? (
                            <div className="mt-10 h-16" />
                        ) : (
                            <div className="mt-10 flex items-center justify-center gap-6">
                                <button
                                    onClick={toggleMute}
                                    disabled={phase === "outgoing"}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${muted ? "bg-white text-emerald-800" : "bg-white/15 hover:bg-white/25"} disabled:opacity-40`}
                                    title={muted ? "Unmute" : "Mute"}
                                >
                                    {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                </button>
                                <button
                                    onClick={handleHangUp}
                                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg cursor-pointer"
                                    title="Hang up"
                                >
                                    <PhoneOff className="w-7 h-7" />
                                </button>
                                <button
                                    onClick={toggleSpeaker}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${speakerOff ? "bg-white text-emerald-800" : "bg-white/15 hover:bg-white/25"}`}
                                    title={speakerOff ? "Unmute speaker" : "Mute speaker"}
                                >
                                    {speakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

