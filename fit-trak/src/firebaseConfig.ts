// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyA7qJFxX8SMgGtckhisJ9WLCIAdDifXtDs",
  authDomain: "fit-trak-d7eb0.firebaseapp.com",
  projectId: "fit-trak-d7eb0",
  storageBucket: "fit-trak-d7eb0.firebasestorage.app",
  messagingSenderId: "542089379742",
  appId: "1:542089379742:web:7d1a704ca8cec1c3e1e08f",
  measurementId: "G-VD32HJ896H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
