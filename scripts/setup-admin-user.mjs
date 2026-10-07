import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBPqtmYmLusY54OZ0In1FxmYegnSI8EHhA",
    authDomain: "wheelhomes.firebaseapp.com",
    projectId: "wheelhomes",
    storageBucket: "wheelhomes.firebasestorage.app",
    messagingSenderId: "588219861231",
    appId: "1:588219861231:web:7c06590c71b7992646731a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "admin@wheelofcomfort.com";
const password = "admin123";

async function setup() {
    console.log(`Checking / Setting up Admin: ${email}...`);
    let user;
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log(`Admin account exists! UID: ${user.uid}`);
    } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            console.log("Account not found or password mismatch. Attempting to create user...");
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                user = cred.user;
                console.log(`Created new Admin account! UID: ${user.uid}`);
            } catch (createErr) {
                console.error("Could not create user:", createErr.message || createErr);
                process.exit(1);
            }
        } else {
            console.error("Auth error:", err.message || err);
            process.exit(1);
        }
    }

    if (user) {
        console.log(`Ensuring UID ${user.uid} is in Firestore /admins collection...`);
        try {
            await setDoc(doc(db, "admins", user.uid), {
                email: email,
                role: "admin",
                createdAt: new Date().toISOString()
            });
            console.log("SUCCESS! User registered in /admins collection.");
        } catch (dbErr) {
            console.log("Note on Firestore /admins rule (admin write might require console or admin SDK):", dbErr.message);
        }
    }
}

setup();
