import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyA7qJFxX8SMgGtckhisJ9WLCIAdDifXtDs",
  authDomain: "fit-trak-d7eb0.firebaseapp.com",
  projectId: "fit-trak-d7eb0",
  storageBucket: "fit-trak-d7eb0.appspot.com",
  messagingSenderId: "542089379742",
  appId: "1:542089379742:web:7d1a704ca8cec1c3e1e08f",
  measurementId: "G-VD32HJ896H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const functions = getFunctions(app, "us-central1");

if (import.meta.env.DEV && import.meta.env.VITE_FUNCTIONS_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Ensure Firebase persists authentication
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase Auth Persistence Error:", error);
});

export { app, auth, db, functions };
