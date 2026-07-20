import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationData {
    recipientId: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    createdAt: any; // Using any for compatibility with server/client timestamps if needed, ideally Timestamp
    link?: string;
}

/**
 * Sends a notification to a specific user.
 */
export const sendNotification = async (
    recipientId: string,
    title: string,
    message: string,
    type: NotificationType = 'info',
    link?: string
) => {
    try {
        await addDoc(collection(db, "notifications"), {
            recipientId,
            title,
            message,
            type,
            read: false,
            createdAt: new Date().toISOString(), // Storing as ISO string for simpler client parsing as seen in existing code
            link: link || null
        });
        console.log(`Notification sent to ${recipientId}: ${title}`);
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

/**
 * Sends a system alert to all admins.
 * For this MVP, we'll use a reserved ID 'admin' or a specific role-based query field if needed.
 * Here we simply set recipientId to 'admin' which the Admin Dashboard will listen to.
 */
export const sendAdminAlert = async (
    title: string,
    message: string,
    type: NotificationType = 'warning',
    link?: string
) => {
    return sendNotification('admin', title, message, type, link);
};
