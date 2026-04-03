// =============================================
//  firebase.js  —  Shared Firebase Initialiser
//  Supports: Email/Password, Google, Phone Auth
//  + Firestore Database
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey:            "AIzaSyBcoRlmLZ8Mvs8YEfaX4Si1EA9K-ZXwIoo",
    authDomain:        "desi-direct-847e2.firebaseapp.com",
    projectId:         "desi-direct-847e2",
    storageBucket:     "desi-direct-847e2.firebasestorage.app",
    messagingSenderId: "592303930832",
    appId:             "1:592303930832:web:488ba1526f970d53fa0dd5",
    measurementId:     "G-KWG0E0MED3"
};

const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db             = getFirestore(app);  // Firestore instance
