import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKGLr6OpGhGm5tV1OIy63Wi6n-YEwvlGA",
  authDomain: "blood-donation-app-ff480.firebaseapp.com",
  projectId: "blood-donation-app-ff480",
  storageBucket: "blood-donation-app-ff480.firebasestorage.app",
  messagingSenderId: "577676683990",
  appId: "1:577676683990:web:30f5dcec835023ecc0f777",
  measurementId: "G-1EW9E0MKXY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
