"use client";

import { useState } from 'react';
import { createRequest, updateRequestStatus, updateETA, addRequestMessage } from '@/lib/db/requests';
import { RequestStatus } from '@/lib/types';
// import { useAuth } from '@/lib/hooks/useAuth'; // Removed non-existent hook
// If no useAuth, I'll use direct firebase auth for the test
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

export default function TestDBPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [requestId, setRequestId] = useState<string | null>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString()}: ${msg}`]);

    const runTest = async () => {
        try {
            addLog("Starting Test...");

            // 1. Auth check
            let user = auth.currentUser;
            if (!user) {
                addLog("No user signed in. Attempting anonymous sign in...");
                const result = await signInAnonymously(auth);
                user = result.user;
                addLog(`Signed in anonymously as ${user.uid}`);
            } else {
                addLog(`Already signed in as ${user.uid}`);
            }

            if (!user) {
                addLog("Failed to authenticate.");
                return;
            }

            // 2. Create Request
            addLog("Creating Request...");
            const id = await createRequest(user.uid, {
                serviceType: "Test Plumbing",
                description: "Leaky faucet test",
                location: { address: "123 Test St" },
                attachments: [],
                price: 100,
                currency: "USD"
            });
            setRequestId(id);
            addLog(`Request created with ID: ${id}`);

            // 3. Update Status
            addLog("Updating Status to ACCEPTED...");
            await updateRequestStatus(id, RequestStatus.ASSIGNED, user.uid, "Provider accepted");
            addLog("Status updated.");

            // 4. Update ETA
            addLog("Updating ETA...");
            const eta = new Date();
            eta.setHours(eta.getHours() + 2);
            await updateETA(id, eta, user.uid);
            addLog("ETA updated.");

            // 5. Add Message
            addLog("Adding Chat Message...");
            await addRequestMessage(id, user.uid, "Hello, when can you arrive?");
            addLog("Message added.");

            addLog("TEST COMPLETE SUCCESS.");

        } catch (e: any) {
            addLog(`ERROR: ${e.message}`);
            console.error(e);
        }
    };

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Database Verification</h1>
            <button
                onClick={runTest}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Run DB Test
            </button>

            <div className="mt-6 bg-gray-100 p-4 rounded h-96 overflow-auto font-mono text-sm">
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>
        </div>
    );
}
