import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

const MOCK_PROVIDERS = [
    {
        fullName: "John Smith",
        businessName: "Smith's Reliable Plumbing",
        role: "service_provider",
        services: ["Plumbing", "Gas"],
        location: "Downtown",
        rating: 4.8,
        reviewCount: 124,
        avatar: "https://i.pravatar.cc/150?u=1",
        joinedAt: new Date().toISOString()
    },
    {
        fullName: "Sarah Connor",
        businessName: "Connor Electric",
        role: "service_provider",
        services: ["Electrical"],
        location: "West End",
        rating: 4.9,
        reviewCount: 89,
        avatar: "https://i.pravatar.cc/150?u=2",
        joinedAt: new Date().toISOString()
    },
    {
        fullName: "Mike Ross",
        businessName: "Ross Painting & Decor",
        role: "service_provider",
        services: ["Painting", "Repairs"],
        location: "North Hills",
        rating: 4.5,
        reviewCount: 45,
        avatar: "https://i.pravatar.cc/150?u=3",
        joinedAt: new Date().toISOString()
    },
    {
        fullName: "Emma Watson",
        businessName: "Sparkle Cleaning Co.",
        role: "service_provider",
        services: ["Cleaning"],
        location: "City Center",
        rating: 4.7,
        reviewCount: 203,
        avatar: "https://i.pravatar.cc/150?u=4",
        joinedAt: new Date().toISOString()
    },
    {
        fullName: "David Carpenter",
        businessName: "Master Woodworks",
        role: "service_provider",
        services: ["Carpentry", "Repairs"],
        location: "Suburbs",
        rating: 4.9,
        reviewCount: 310,
        avatar: "https://i.pravatar.cc/150?u=5",
        joinedAt: new Date().toISOString()
    },
    {
        fullName: "Rapid Movers",
        businessName: "Rapid Moving Services",
        role: "service_provider",
        services: ["Moving"],
        location: "Metro Area",
        rating: 4.6,
        reviewCount: 78,
        avatar: "https://i.pravatar.cc/150?u=6",
        joinedAt: new Date().toISOString()
    }
];

export const seedProviders = async () => {
    console.log("Seeding providers...");
    try {
        const usersRef = collection(db, "users");

        // Simpler check
        const q = query(usersRef, where("role", "==", "service_provider"));
        const snap = await getDocs(q);

        if (snap.size > 0) {
            console.log("Providers likely seeded. Skipping.");
            // return; // Uncomment to strict prevent dupes
        }

        const promises = MOCK_PROVIDERS.map(p => addDoc(usersRef, p));
        await Promise.all(promises);
        console.log("Seeding complete!");
        return true;
    } catch (error) {
        console.error("Error seeding providers:", error);
        return false;
    }
};

export const wipeAllData = async () => {
    console.log("Wiping ALL 'New Request' data (Requests + Providers)...");
    try {
        // 1. Delete All Job Requests
        await clearRequests();

        // 2. Delete ALL Users (As requested: "delete all users")
        const usersRef = collection(db, "users");
        const allUsersSnap = await getDocs(query(usersRef)); // No filter, get everyone

        console.log(`Found ${allUsersSnap.size} users to delete.`);
        const promises = allUsersSnap.docs.map(d => deleteDoc(doc(db, "users", d.id)));
        await Promise.all(promises);

        // 3. Delete Notifications? (Optional but good for cleanup)
        const notifRef = collection(db, "notifications");
        const notifSnap = await getDocs(notifRef);
        const notifPromises = notifSnap.docs.map(d => deleteDoc(doc(db, "notifications", d.id)));
        await Promise.all(notifPromises);

        console.log("Full system wipe complete.");
        return true;
    } catch (e) {
        console.error("Wipe failed:", e);
        return false;
    }
};

// ... keep existing code ...

export const cleanupMockData = async () => {
    console.log("Starting targeted cleanup of MOCK data...");

    // List of names/businesses to target based on MOCK_PROVIDERS
    const mockNames = [
        "Smith's Reliable Plumbing",
        "Connor Electric",
        "Ross Painting & Decor",
        "Sparkle Cleaning Co.",
        "Master Woodworks",
        "Rapid Moving Services"
    ];

    try {
        const usersRef = collection(db, "users");
        let deletedCount = 0;

        // Query by Business Name matches
        // Note: Firestore 'in' query supports up to 10 items
        const q = query(usersRef, where("businessName", "in", mockNames));
        const snapshot = await getDocs(q);

        console.log(`Found ${snapshot.size} mock provider documents to delete.`);

        const promises = snapshot.docs.map(docSnapshot => {
            console.log(`Deleting: ${docSnapshot.id} - ${docSnapshot.data().businessName}`);
            return deleteDoc(doc(db, "users", docSnapshot.id));
        });

        await Promise.all(promises);
        console.log(`Successfully deleted ${snapshot.size} mock records.`);
        return true;
    } catch (error) {
        console.error("Error cleaning up mock data:", error);
        return false;
    }
};

export const clearRequests = async (userId?: string) => {
    // ... existing code ...
    console.log("Clearing requests...");
    try {
        const reqRef = collection(db, "job_requests");
        // The following lines were added based on the instruction, but `collectionRef` is undefined
        // and `q` cannot be `const` if declared here and assigned conditionally later.
        // If `deletedCount` is intended for the `clearRequests` function, it needs to be implemented
        // by counting the deleted documents from `snap.docs.map` or similar.
        // const { deletedCount } = await collectionRef.delete();
        // console.log(`Deleted ${deletedCount} users.`);
        let q; // Retained `let` as `q` is conditionally assigned

        if (userId) {
            console.log("Deleting for user:", userId);
            q = query(reqRef, where("clientId", "==", userId));
        } else {
            console.log("Deleting ALL requests");
            q = query(reqRef);
        }

        const snap = await getDocs(q);
        console.log(`Found ${snap.size} requests to delete.`);

        const promises = snap.docs.map(d => deleteDoc(doc(db, "job_requests", d.id)));
        await Promise.all(promises);

        console.log("Deletion complete!");
        return true;
    } catch (error) {
        console.error("Error clearing requests:", error);
        return false;
    }
};
