import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import { getDatabase } from
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBZkA1XNV7kdex8SSvla1_OzJkxmdFskzw",
  authDomain: "classguard-ai.firebaseapp.com",
  databaseURL: "https://classguard-ai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "classguard-ai",
  storageBucket: "classguard-ai.firebasestorage.app",
  messagingSenderId: "1010628513262",
  appId: "1:1010628513262:web:ed6bd874d30a04d126d2ff"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export const authReady = setPersistence(
  auth,
  browserLocalPersistence
);