"use client";

import { useState } from 'react';
import { RequestServices, Request } from '@/lib/services/request-service';

export default function TestLifecyclePage() {
    const [requestId, setRequestId] = useState<string | null>(null);
    const [requestData, setRequestData] = useState<Request | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString()}: ${msg}`]);

    const handleCreate = async () => {
        try {
            addLog("Creating request...");
            const id = await RequestServices.createRequest({ userId: 'test-user-1', serviceId: 'service-123' });
            setRequestId(id);
            addLog(`Request created with ID: ${id}`);
            await refreshData(id);
        } catch (e: any) {
            addLog(`Error creating: ${e.message}`);
        }
    };

    const refreshData = async (id: string) => {
        try {
            const data = await RequestServices.getRequest(id);
            setRequestData(data);
            addLog(`Data refreshed. Status: ${data?.status}`);
        } catch (e: any) {
            addLog(`Error fetching: ${e.message}`);
        }
    };

    const handleAssign = async () => {
        if (!requestId) return;
        try {
            addLog("Assigning request...");
            await RequestServices.assignRequest(requestId, 'provider-abc');
            addLog("Assigned.");
            await refreshData(requestId);
        } catch (e: any) {
            addLog(`Error assigning: ${e.message}`);
        }
    };

    const handleStart = async () => {
        if (!requestId) return;
        try {
            addLog("Starting job...");
            await RequestServices.startJob(requestId, 60);
            addLog("Job started.");
            await refreshData(requestId);
        } catch (e: any) {
            addLog(`Error starting: ${e.message}`);
        }
    };

    const handleComplete = async () => {
        if (!requestId) return;
        try {
            addLog("Completing job...");
            await RequestServices.completeJob(requestId, false, "Great job", []);
            addLog("Job completed.");
            await refreshData(requestId);
        } catch (e: any) {
            addLog(`Error completing: ${e.message}`);
        }
    };

    const handlePartial = async () => {
        if (!requestId) return;
        try {
            addLog("Marking partial...");
            await RequestServices.completeJob(requestId, true, "Needs more work", []);
            addLog("Job partially completed.");
            await refreshData(requestId);
        } catch (e: any) {
            addLog(`Error partial completion: ${e.message}`);
        }
    };

    const handleCancel = async () => {
        if (!requestId) return;
        try {
            addLog("Cancelling request...");
            await RequestServices.cancelRequest(requestId, "Changed mind");
            addLog("Cancelled.");
            await refreshData(requestId);
        } catch (e: any) {
            addLog(`Error cancelling: ${e.message}`);
        }
    };

    return (
        <div className="p-10 font-sans">
            <h1 className="text-2xl font-bold mb-4">Request Lifecycle Tester</h1>
            <div className="space-x-4 mb-6">
                <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded">Create</button>
                <button onClick={handleAssign} disabled={!requestId} className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50">Assign</button>
                <button onClick={handleStart} disabled={!requestId} className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50">Start Job</button>
                <button onClick={handleComplete} disabled={!requestId} className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50">Complete</button>
                <button onClick={handlePartial} disabled={!requestId} className="bg-purple-300 text-white px-4 py-2 rounded disabled:opacity-50">Partial</button>
                <button onClick={handleCancel} disabled={!requestId} className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50">Cancel</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="border p-4 rounded bg-gray-50">
                    <h2 className="font-bold mb-2">Current Request Data</h2>
                    <pre className="text-xs overflow-auto h-64">{JSON.stringify(requestData, null, 2)}</pre>
                </div>
                <div className="border p-4 rounded bg-gray-50">
                    <h2 className="font-bold mb-2">Logs</h2>
                    <div className="text-xs overflow-auto h-64">
                        {logs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
