import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    doc,
    getDocs,
    limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChatMessage, ChatConversation } from '@/lib/types/communication';

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Creates a new chat between participants or returns existing one if it matches exactly
 * For simplicity, this implementation might always create a new one or check by ID if provided.
 * In a real app, you might check if a chat with these exact participants already exists.
 */
export const createChat = async (participants: string[], initialData: Record<string, unknown> = {}): Promise<string> => {
    // Basic implementation: just create a new chat document
    const chatRef = await addDoc(collection(db, CHATS_COLLECTION), {
        participants,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...initialData
    });
    return chatRef.id;
};

/**
 * Sends a text message to a chat
 */
export const sendMessage = async (chatId: string, text: string, senderId: string): Promise<void> => {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const messagesRef = collection(chatRef, MESSAGES_SUBCOLLECTION);

    // 1. Add message to subcollection
    await addDoc(messagesRef, {
        chatId,
        text,
        senderId,
        createdAt: serverTimestamp(),
        readBy: [senderId]
    });

    // 2. Update chat metadata (last message, updated time)
    await updateDoc(chatRef, {
        lastMessage: {
            text,
            senderId,
            createdAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
    });
};

/**
 * Subscribe to messages in a specific chat
 */
export const subscribeToChatMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(
        collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatMessage));
        callback(messages);
    });
};

/**
 * Subscribe to list of chats for a user
 */
export const subscribeToUserChats = (userId: string, callback: (chats: ChatConversation[]) => void) => {
    const q = query(
        collection(db, CHATS_COLLECTION),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatConversation));
        callback(chats);
    });
};

/**
 * Get chat history (one-time fetch), useful for Admin view or server-side rendering
 */
export const getChatHistory = async (chatId: string): Promise<ChatMessage[]> => {
    const q = query(
        collection(db, CHATS_COLLECTION, chatId, 'messages'),
        orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
};

/**
 * ADMIN ONLY: Get all chats (optional helper)
 * Requires proper security rules to allow this for admin role
 */
export const getAllChatsAdmin = async (limitCount = 20): Promise<ChatConversation[]> => {
    const q = query(
        collection(db, CHATS_COLLECTION),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatConversation));
}
