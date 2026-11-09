"use client";

const SOUND_MUTE_KEY = "woc_chat_sound_muted";

let sharedAudioCtx: AudioContext | null = null;
let cachedIncomingWavUrl: string | null = null;
let lastIncomingPlayMs = 0;
let unlockBound = false;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return null;
        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioCtx();
        }
        if (sharedAudioCtx.state === "suspended") {
            sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
    } catch (_) {
        return null;
    }
}

/**
 * Generates an in-memory 16-bit PCM WAV data URI for the two-tone WhatsApp-style
 * notification chime (G5 -> D6) so `new Audio(dataUri).play()` works even when
 * Web Audio oscillators are throttled in background tabs.
 */
function getIncomingWavDataUri(): string {
    if (cachedIncomingWavUrl) return cachedIncomingWavUrl;

    const sampleRate = 22050;
    const durationSec = 0.48;
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // Note 1: G5 (783.99 Hz) from 0.00s to 0.16s
        if (t < 0.16) {
            const env1 = Math.sin((Math.min(t, 0.015) / 0.015) * (Math.PI / 2)) * Math.exp(-t * 18);
            sample += Math.sin(2 * Math.PI * 783.99 * t) * env1 * 0.45;
            sample += Math.sin(2 * Math.PI * 1567.98 * t) * env1 * 0.12;
        }

        // Note 2: D6 (1174.66 Hz) from 0.10s to 0.48s
        if (t >= 0.10) {
            const t2 = t - 0.10;
            const env2 = Math.sin((Math.min(t2, 0.015) / 0.015) * (Math.PI / 2)) * Math.exp(-t2 * 9.5);
            sample += Math.sin(2 * Math.PI * 1174.66 * t2) * env2 * 0.55;
            sample += Math.sin(2 * Math.PI * 2349.32 * t2) * env2 * 0.15;
        }

        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(44 + i * 2, clamped * 32767, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    cachedIncomingWavUrl = `data:audio/wav;base64,${btoa(binary)}`;
    return cachedIncomingWavUrl;
}

/**
 * Automatically unlocks browser audio playback on the user's first interaction.
 */
export function ensureChatAudioUnlocked(): void {
    if (typeof window === "undefined" || unlockBound) return;
    unlockBound = true;

    const unlock = () => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }
        getIncomingWavDataUri();
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
}

export function isChatSoundMuted(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return localStorage.getItem(SOUND_MUTE_KEY) === "true";
    } catch (_) {
        return false;
    }
}

export function setChatSoundMuted(muted: boolean): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(SOUND_MUTE_KEY, muted ? "true" : "false");
    } catch (_) {}
}

/**
 * Plays a crisp, WhatsApp-inspired two-tone incoming message notification chime
 * (G5 -> D6) whenever a new message drops for the receiver.
 */
export function playIncomingChatSound(force = false): void {
    if (typeof window === "undefined") return;
    if (!force && isChatSoundMuted()) return;

    const nowMs = Date.now();
    if (!force && nowMs - lastIncomingPlayMs < 900) {
        return; // Deduplicate simultaneous triggers from global + local listeners
    }
    lastIncomingPlayMs = nowMs;

    // 1. Play HTML5 Audio WAV chime (works reliably even when tab is in background)
    try {
        const audio = new Audio(getIncomingWavDataUri());
        audio.volume = 0.85;
        audio.play().catch(() => {});
    } catch (_) {}

    // 2. Also layer Web Audio API chime if context is active
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(783.99, now);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.18);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(1174.66, now + 0.11);
        gain2.gain.setValueAtTime(0.001, now + 0.11);
        gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.13);
        gain2.gain.exponentialRampToValueAtTime(0.0008, now + 0.46);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.11);
        osc2.stop(now + 0.48);
    } catch (_) {}
}

/**
 * Plays a subtle, soft WhatsApp-style outgoing message "pop" sound when sending.
 */
export function playOutgoingChatSound(): void {
    if (isChatSoundMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.065);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    } catch (_) {}
}
