import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Config from /firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBoEOdHlqVcTPnXTYkFvQo51nxVcv5jJCM",
  authDomain: "ringed-computing-t7k72.firebaseapp.com",
  projectId: "ringed-computing-t7k72",
  storageBucket: "ringed-computing-t7k72.firebasestorage.app",
  messagingSenderId: "819777323972",
  appId: "1:819777323972:web:27cbef3343101d3e425a91"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use getFirestore(app, databaseId) which is correct in Firebase v10+
export const db = getFirestore(app, "ai-studio-tmkexpensetracke-736efd57-ef05-44b8-8e2a-7e1f453930b8");
