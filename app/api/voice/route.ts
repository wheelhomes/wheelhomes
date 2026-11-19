import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const MAX_B64_LENGTH = 250_000;
const MAX_ROOMS = 500;

interface VoiceFrame {
    seq: number;
    senderId: string;
    b64: string;
    rate: number;
    ts: number;
}

interface CallVoiceRoom {
    seq: number;
    frames: VoiceFrame[];
    updatedAt: number;
}

// Persist across hot-reloads in dev mode
const globalForVoice = globalThis as unknown as {
    __wheelhomesVoiceRooms?: Map<string, CallVoiceRoom>;
};

const rooms: Map<string, CallVoiceRoom> =
    globalForVoice.__wheelhomesVoiceRooms ??
    (globalForVoice.__wheelhomesVoiceRooms = new Map<string, CallVoiceRoom>());

function pruneOldRooms() {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [key, room] of rooms.entries()) {
        if (room.updatedAt < cutoff) {
            rooms.delete(key);
        }
    }
}

async function isCallParticipant(callId: string, uid: string): Promise<boolean> {
    try {
        const callSnap = await adminDb().collection("calls").doc(callId).get();
        if (!callSnap.exists) return false;
        const data = callSnap.data() || {};
        return data.callerId === uid || data.calleeId === uid;
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const caller = await requireAuth(req);
        if (caller instanceof NextResponse) return caller;

        const body = await req.json();
        const callId = String(body.callId || "").trim();
        const senderId = String(body.senderId || "").trim();
        const b64 = String(body.b64 || "").trim();
        const rate = Number(body.rate) || 16000;

        if (!callId || !senderId || !b64 || b64.length > MAX_B64_LENGTH) {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        if (senderId !== caller.uid || !(await isCallParticipant(callId, caller.uid))) {
            return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }

        pruneOldRooms();
        if (!rooms.has(callId) && rooms.size >= MAX_ROOMS) {
            return NextResponse.json({ ok: false, error: "Server busy" }, { status: 503 });
        }

        let room = rooms.get(callId);
        if (!room) {
            room = { seq: 0, frames: [], updatedAt: Date.now() };
            rooms.set(callId, room);
        }

        room.seq += 1;
        room.updatedAt = Date.now();
        room.frames.push({
            seq: room.seq,
            senderId: caller.uid,
            b64,
            rate,
            ts: room.updatedAt,
        });

        // Keep only the most recent 6 frames (~3 seconds)
        if (room.frames.length > 6) {
            room.frames.splice(0, room.frames.length - 6);
        }

        return NextResponse.json({ ok: true, seq: room.seq });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const caller = await requireAuth(req);
    if (caller instanceof NextResponse) return caller;

    const { searchParams } = new URL(req.url);
    const callId = (searchParams.get("callId") || "").trim();
    const afterSeq = Number(searchParams.get("afterSeq") || "0");

    if (!callId) {
        return NextResponse.json({ frames: [], latestSeq: 0 });
    }

    if (!(await isCallParticipant(callId, caller.uid))) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const room = rooms.get(callId);
    if (!room) {
        return NextResponse.json({ frames: [], latestSeq: 0 });
    }

    // If caller is joining fresh (afterSeq === 0), only return the newest frame so there is zero backlog
    const frames =
        afterSeq <= 0
            ? room.frames.slice(-1)
            : room.frames.filter((f) => f.seq > afterSeq);

    return NextResponse.json({
        frames,
        latestSeq: room.seq,
    });
}

