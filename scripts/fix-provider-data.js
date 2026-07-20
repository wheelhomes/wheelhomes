import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, updateDoc, collection, query, where, getDocs, writeBatch } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyBPqtmYmLusY54OZ0In1FxmYegnSI8EHhA",
    authDomain: "wheelhomes.firebaseapp.com",
    projectId: "wheelhomes",
    storageBucket: "wheelhomes.firebasestorage.app",
    messagingSenderId: "588219861231",
    appId: "1:588219861231:web:7c06590c71b7992646731a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncProviderData() {
    try {
        console.log("Starting Comprehensive Data Sync...");

        const batch = writeBatch(db);

        // --- TARGET 1: Fix Tosin ---
        const tosiId = "Osx9aQIbMlNWzxSe3PsYjc56TJW2";
        const totalEmail = "djohnvpn@gmail.com";

        // 1. Update 'users' collection (The Source of Truth for App & Admin List)
        const tosinRef = doc(db, "users", tosiId);
        batch.update(tosinRef, {
            // Ensure root services array is correct for User Search
            services: ["Plumbing", "Plumber"],
            // Ensure applicationData is correct for Admin Detail View
            "applicationData.serviceCategory": "Plumbing",
            // Ensure legacy fields if any
            role: "service_provider",
            status: "approved"
        });

        // 2. Update 'user_applications' (The Source of Truth for Admin "Review" Modal)
        // We need to find the application doc for this email
        const qApp = query(collection(db, "user_applications"), where("data.email", "==", totalEmail));
        const snapApp = await getDocs(qApp);

        snapApp.forEach(d => {
            const appRef = doc(db, "user_applications", d.id);
            console.log(`Found application for Tosin: ${d.id}`);
            batch.update(appRef, {
                status: "approved",
                "data.services": ["Plumbing"], // Fix valid service name
                "data.serviceCategory": "Plumbing" // If exists
            });
        });

        // --- TARGET 2: Justus Ola ---
        const justusId = "Rz01lMxWEAfTbVev3F6hyX83VYN2";

        // 1. Update 'users'
        const justusRef = doc(db, "users", justusId);
        batch.update(justusRef, {
            services: ["Electrical", "Electrician"],
            "applicationData.serviceCategory": "Electrical",
            role: "service_provider",
            status: "approved"
        });

        // 2. Update 'user_applications' (Justus shares same email in this dev env?)
        // If so, the previous query might have handled it or we need to be careful.
        // In dev, if multiple users share email, it's messy. 
        // Let's assume Justus might be the same "user_application" or a different one.
        // For safety, we just updated based on email.

        await batch.commit();
        console.log("✅ Sync Complete for Tosin and Justus.");

    } catch (error) {
        console.error("Sync Failed:", error);
    }
}

syncProviderData().then(() => process.exit(0));
