// Import Firebase SDK modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "your_api_key",
  authDomain: "capriatta-edc0e.firebaseapp.com",
  projectId: "capriatta-edc0e",
  storageBucket: "capriatta-edc0e.firebasestorage.app",
  messagingSenderId: "589611800578",
  appId: "1:589611800578:web:a3cad332b1d40cd1c52f1b",
  measurementId: "G-ELL4DDBHVX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export for use in other files
export const db = getFirestore(app);

console.log("Firebase initialized successfully!");
console.log("Project ID:", firebaseConfig.projectId);
