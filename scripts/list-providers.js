import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

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

async function listProviders() {
    try {
        const q = query(collection(db, "users"), where("role", "==", "service_provider"));
        const snapshot = await getDocs(q);

        console.log("---------------------------------------------------------------------------------");
        console.log("ID | Name | Email | Role | Services | Phone");
        console.log("---------------------------------------------------------------------------------");

        const providers = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`${doc.id} | ${data.fullName} | ${data.email} | ${data.role} | ${JSON.stringify(data.services)} | ${data.phone}`);
            providers.push({
                id: doc.id,
                fullName: data.fullName,
                email: data.email,
                role: data.role,
                services: data.services,
                phone: data.phone,
                location: data.location
            });
        });

        console.log("---------------------------------------------------------------------------------");
        console.log(`Total Providers Found: ${snapshot.size}`);

    } catch (error) {
        console.error("Error fetching providers:", error);
    }
}

listProviders().then(() => process.exit(0));
