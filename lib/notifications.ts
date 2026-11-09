import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export type NotificationType =
    | "info"
    | "success"
    | "warning"
    | "error"
    | "chat"
    | "chat_message"
    | "job_update"
    | "escrow";

export interface NotificationData {
    recipientId: string;
    userId?: string;
    title: string;
    message: string;
    body?: string;
    type: NotificationType;
    read: boolean;
    isRead?: boolean;
    createdAt: any;
    link?: string;
    payload?: Record<string, any>;
}

/**
 * Formats any Firestore Timestamp or ISO date string into a human-friendly relative time.
 */
export function formatNotificationTime(createdAt: any): string {
    if (!createdAt) return "Just now";
    let ms = 0;
    if (typeof createdAt?.seconds === "number") {
        ms = createdAt.seconds * 1000;
    } else if (typeof createdAt === "string" || typeof createdAt === "number") {
        const parsed = new Date(createdAt).getTime();
        if (!isNaN(parsed)) ms = parsed;
    } else if (createdAt instanceof Date) {
        ms = createdAt.getTime();
    }
    if (!ms) return "Just now";

    const diffSec = Math.floor((Date.now() - ms) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(ms).toLocaleDateString();
}

/**
 * Sends a unified in-app notification to a specific user (compatible with both Web & Mobile).
 */
export const sendNotification = async (
    recipientId: string,
    title: string,
    message: string,
    type: NotificationType = "info",
    link?: string,
    payload: Record<string, any> = {}
) => {
    if (!recipientId) return;
    try {
        await addDoc(collection(db, "notifications"), {
            recipientId,
            userId: recipientId,
            title,
            message,
            body: message,
            type,
            read: false,
            isRead: false,
            createdAt: new Date().toISOString(),
            link: link || null,
            payload: {
                ...(link ? { link } : {}),
                ...payload,
            },
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

/**
 * Sends a system alert to all admins.
 */
export const sendAdminAlert = async (
    title: string,
    message: string,
    type: NotificationType = "warning",
    link?: string
) => {
    return sendNotification("admin", title, message, type, link);
};
