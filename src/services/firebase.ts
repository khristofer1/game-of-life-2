import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "game-of-life-f4f49.firebaseapp.com",
  projectId: "game-of-life-f4f49",
  storageBucket: "game-of-life-f4f49.firebasestorage.app",
  messagingSenderId: "445876714476",
  appId: "1:445876714476:web:628f0182d84053d8c41ec9",
  measurementId: "G-2JQGH0705L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the tools we need for the rest of the app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Quick helper functions for login/logout
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logoutFromGoogle = () => signOut(auth);