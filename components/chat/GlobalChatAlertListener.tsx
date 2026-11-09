"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { MessageSquare, Bell, Briefcase, ShieldCheck, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { ensureChatAudioUnlocked, playIncomingChatSound } from "@/lib/chat-sound";
import { formatRequestCode } from "@/lib/job-utils";

interface IncomingToast {
    id: string;
    notifId?: string;
    jobId?: string;
    senderName: string;
    requestCode?: string;
    text: string;
    category?: "chat" | "job" | "escrow" | "system";
    link?: string;
}

interface GlobalChatAlertListenerProps {
    userId: string;
    userRole?: string;
}

export const GlobalChatAlertListener: React.FC<GlobalChatAlertListenerProps> = ({
    userId,
    userRole,
}) => {
    const router = useRouter();
    const [toast, setToast] = useState<IncomingToast | null>(null);
    const seenJobMessagesRef = useRef<Map<string, string>>(new Map());
    const seenNotifIdsRef = useRef<Set<string>>(new Set());
    const subcollectionUnsubsRef = useRef<Map<string, () => void>>(new Map());

    useEffect(() => {
        ensureChatAudioUnlocked();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const seenJobs = seenJobMessagesRef.current;
        const seenNotifs = seenNotifIdsRef.current;
        const subUnsubs = subcollectionUnsubsRef.current;

        const ensureMessageSubListener = (jobId: string, jobData: any) => {
            if (subUnsubs.has(jobId)) return;
            let firstSnap = true;
            const seenMsgIds = new Set<string>();

            const unsub = onSnapshot(
                collection(db, "job_requests", jobId, "messages"),
                (snap) => {
                    if (firstSnap) {
                        snap.docs.forEach((d) => seenMsgIds.add(d.id));
                        firstSnap = false;
                        return;
                    }
                    snap.docChanges().forEach((change) => {
                        if (change.type === "added" && !seenMsgIds.has(change.doc.id)) {
                            seenMsgIds.add(change.doc.id);
                            const md = change.doc.data();
                            if (md.senderId && md.senderId !== userId) {
                                playIncomingChatSound();

                                // Stamp DELIVERED receipt when message reaches receiver's active app
                                if (!md.delivered && !md.read) {
                                    updateDoc(doc(db, "job_requests", jobId), {
                                        ...(userRole === "service_provider"
                                            ? { providerLastDeliveredAt: serverTimestamp() }
                                            : { clientLastDeliveredAt: serverTimestamp() }),
                                        ...(jobData.lastMessageStatus !== "read"
                                            ? { lastMessageStatus: "delivered" }
                                            : {}),
                                    }).catch(() => {});
                                }

                                const reqCode = formatRequestCode({ id: jobId, ...jobData });
                                const senderName = String(
                                    md.senderName && !["You", "User"].includes(md.senderName)
                                        ? md.senderName
                                        : userRole === "service_provider"
                                            ? `Client (#${reqCode})`
                                            : jobData.providerName || jobData.hodName || "Service Provider"
                                );
                                setToast({
                                    id: `${jobId}_${change.doc.id}`,
                                    jobId,
                                    senderName,
                                    requestCode: reqCode,
                                    text: String(md.text || ""),
                                });
                            }
                        }
                    });
                },
                () => {}
            );
            subUnsubs.set(jobId, unsub);
        };

        const watchJobQuery = (q: any) => {
            let isFirstSnapshot = true;
            return onSnapshot(
                q,
                (snapshot: any) => {
                    snapshot.docs.forEach((docSnap: any) => {
                        const d = docSnap.data();
                        ensureMessageSubListener(docSnap.id, d);
                        const msgText = String(d.lastMessage || "").trim();
                        const timeSec =
                            d.lastMessageTime?.seconds ||
                            d.updatedAt ||
                            "";
                        const signature = `${msgText}__${timeSec}`;
                        const prevSig = seenJobs.get(docSnap.id);

                        seenJobs.set(docSnap.id, signature);

                        if (isFirstSnapshot) return;

                        // If lastMessage changed and the sender is not the current user, play tune & show toast
                        if (msgText && prevSig !== undefined && prevSig !== signature) {
                            const senderId = String(d.lastMessageSenderId || "");
                            if (senderId && senderId === userId) return;

                            playIncomingChatSound();

                            const reqCode = formatRequestCode({ id: docSnap.id, ...d });
                            const senderName = String(
                                d.lastMessageSenderName ||
                                    (userRole === "service_provider"
                                        ? d.clientName && d.clientName !== "Unknown Client"
                                            ? d.clientName
                                            : `Client (#${reqCode})`
                                        : d.providerName || d.hodName || "Service Provider")
                            );

                            setToast({
                                id: `${docSnap.id}_${Date.now()}`,
                                jobId: docSnap.id,
                                senderName,
                                requestCode: reqCode,
                                text: msgText,
                            });
                        }
                    });
                    isFirstSnapshot = false;
                },
                () => {}
            );
        };

        const unsubs: Array<() => void> = [];

        if (userRole === "service_provider") {
            unsubs.push(
                watchJobQuery(
                    query(collection(db, "job_requests"), where("providerId", "==", userId))
                )
            );
            unsubs.push(
                watchJobQuery(
                    query(
                        collection(db, "job_requests"),
                        where("invitedProviderIds", "array-contains", userId)
                    )
                )
            );
        } else {
            unsubs.push(
                watchJobQuery(
                    query(collection(db, "job_requests"), where("clientId", "==", userId))
                )
            );
            unsubs.push(
                watchJobQuery(
                    query(collection(db, "job_requests"), where("userId", "==", userId))
                )
            );
        }

        // Also listen to notifications collection for instant sound + in-app toast on any incoming notification
        const watchNotifQuery = (field: "recipientId" | "userId") => {
            let firstNotifSnapshot = true;
            return onSnapshot(
                query(
                    collection(db, "notifications"),
                    where(field, "==", userId),
                    limit(25)
                ),
                (snapshot) => {
                    snapshot.docs.forEach((docSnap) => {
                        const alreadySeen = seenNotifs.has(docSnap.id);
                        seenNotifs.add(docSnap.id);
                        if (firstNotifSnapshot || alreadySeen) return;

                        const nd = docSnap.data();
                        if (!nd.read && !nd.isRead) {
                            playIncomingChatSound();

                            const titleStr = String(nd.title || "New Alert");
                            const bodyStr = String(nd.message || nd.body || "");
                            const lowerTitle = titleStr.toLowerCase();
                            const isChat =
                                nd.type === "chat" ||
                                nd.type === "chat_message" ||
                                lowerTitle.includes("message") ||
                                lowerTitle.includes("chat");
                            const isEscrow =
                                nd.type === "escrow" ||
                                lowerTitle.includes("escrow") ||
                                lowerTitle.includes("payment") ||
                                lowerTitle.includes("paid");
                            const isJob =
                                !isChat &&
                                !isEscrow &&
                                (nd.type === "job_update" ||
                                    lowerTitle.includes("job") ||
                                    lowerTitle.includes("request") ||
                                    lowerTitle.includes("hod") ||
                                    lowerTitle.includes("assistant") ||
                                    lowerTitle.includes("dispatched") ||
                                    lowerTitle.includes("completed"));

                            const jobId = String(nd.payload?.jobId || nd.jobId || nd.requestId || "");
                            const reqCode = String(nd.payload?.requestCode || "");

                            setToast({
                                id: `notif_${docSnap.id}`,
                                notifId: docSnap.id,
                                jobId: jobId || undefined,
                                senderName: titleStr,
                                requestCode: reqCode || undefined,
                                text: bodyStr,
                                category: isChat ? "chat" : isEscrow ? "escrow" : isJob ? "job" : "system",
                                link: nd.link || nd.payload?.link || undefined,
                            });
                        }
                    });
                    firstNotifSnapshot = false;
                },
                () => {}
            );
        };
        unsubs.push(watchNotifQuery("recipientId"));
        unsubs.push(watchNotifQuery("userId"));

        return () => {
            unsubs.forEach((u) => u());
            subUnsubs.forEach((u) => u());
            subUnsubs.clear();
        };
    }, [userId, userRole]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 7000);
        return () => clearTimeout(timer);
    }, [toast]);

    if (!toast) return null;

    const isEscrowToast = toast.category === "escrow";
    const isJobToast = toast.category === "job";
    const isSystemToast = toast.category === "system";

    return (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-full bg-white border border-orange-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-3 duration-200">
            <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isEscrowToast
                        ? "bg-emerald-100 text-emerald-700"
                        : isJobToast
                            ? "bg-blue-100 text-blue-700"
                            : isSystemToast
                                ? "bg-purple-100 text-purple-700"
                                : "bg-orange-100 text-orange-600"
                }`}
            >
                {isEscrowToast ? (
                    <ShieldCheck className="w-5 h-5" />
                ) : isJobToast ? (
                    <Briefcase className="w-5 h-5" />
                ) : isSystemToast ? (
                    <Bell className="w-5 h-5" />
                ) : (
                    <MessageSquare className="w-5 h-5" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-gray-900 truncate max-w-[200px]">
                        {toast.senderName}
                    </span>
                    {toast.requestCode && (
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-mono font-bold">
                            #{toast.requestCode}
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mt-1">{toast.text}</p>
                <div className="mt-2 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            if (toast.notifId) {
                                updateDoc(doc(db, "notifications", toast.notifId), {
                                    read: true,
                                    isRead: true,
                                }).catch(() => {});
                            }
                            let targetPath = toast.link || "/dashboard/notifications";
                            if (!toast.link) {
                                if (toast.category === "chat" || (!toast.category && toast.jobId)) {
                                    targetPath =
                                        userRole === "service_provider"
                                            ? "/dashboard/provider/messages"
                                            : toast.jobId
                                                ? `/dashboard/my-requests/details?id=${toast.jobId}`
                                                : "/dashboard/my-requests";
                                } else if (toast.jobId) {
                                    targetPath =
                                        userRole === "service_provider"
                                            ? "/dashboard/provider/jobs"
                                            : `/dashboard/my-requests/details?id=${toast.jobId}`;
                                }
                            }
                            setToast(null);
                            router.push(targetPath);
                        }}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                    >
                        {toast.category === "job"
                            ? "View Job →"
                            : toast.category === "escrow"
                                ? "View Payment →"
                                : toast.category === "system"
                                    ? "View Alert →"
                                    : "Open Chat →"}
                    </button>
                </div>
            </div>
            <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

