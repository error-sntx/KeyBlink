// firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAr-ts4nHdIkLhzGPxJYWfrEKztnWO2f3c",
  authDomain: "keyblink-app.firebaseapp.com",
  projectId: "keyblink-app",
  storageBucket: "keyblink-app.firebasestorage.app",
  messagingSenderId: "51807170847",
  appId: "1:51807170847:web:b43039b41b7456cf6b402a",
  measurementId: "G-Q32WJV2QJT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };
