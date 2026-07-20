import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TimelineEvent } from '@/lib/types/communication';

const REQUESTS_COLLECTION = 'requests';
// In this model, timeline events could be a subcollection of a request 
// OR a separate collection ref'ing the request. Subcollection is cleaner for "Timeline of THIS request".
const TIMELINE_SUBCOLLECTION = 'timeline';

/**
 * Updates the status of a request and logs a timeline event
 */
export const updateStatus = async (requestId: string, status: string, description: string, userId: string = 'system'): Promise<void> => {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);

    // 1. Update the main request document status
    await updateDoc(requestRef, {
        status: status,
        updatedAt: serverTimestamp()
    });

    // 2. Add to timeline history
    await addDoc(collection(requestRef, TIMELINE_SUBCOLLECTION), {
        requestId,
        status,
        description,
        createdAt: serverTimestamp(),
        createdBy: userId
    });
};

/**
 * Updates the ETA for a request
 */
export const updateETA = async (requestId: string, newEta: Date, updatedBy: string = 'system'): Promise<void> => {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);

    // Fetch current data to potentially log the "previous" ETA if needed
    // const snap = await getDoc(requestRef);
    // const prevEta = snap.data()?.eta;

    await updateDoc(requestRef, {
        eta: newEta,
        updatedAt: serverTimestamp()
    });

    // Optionally log this as a timeline event too
    await addDoc(collection(requestRef, TIMELINE_SUBCOLLECTION), {
        requestId,
        status: 'ETA_UPDATED',
        description: `ETA updated to ${newEta.toLocaleString()}`,
        createdAt: serverTimestamp(),
        createdBy: updatedBy,
        metadata: { newEta }
    });
};

/**
 * Subscribe to the timeline of specific request
 */
export const subscribeToTimeline = (requestId: string, callback: (events: TimelineEvent[]) => void) => {
    const q = query(
        collection(db, REQUESTS_COLLECTION, requestId, TIMELINE_SUBCOLLECTION),
        orderBy('createdAt', 'desc') // Newest first for timeline usually
    );

    return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TimelineEvent));
        callback(events);
    });
};
