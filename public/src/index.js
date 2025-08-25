// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
   apiKey: "AIzaSyANh3IdPNXSwjFIkK-yiasZ10Bbpr0iqtM",
   authDomain: "ipfest25web.firebaseapp.com",
   projectId: "ipfest25web",
   storageBucket: "ipfest25web.appspot.com",
   messagingSenderId: "763214404617",
   appId: "1:763214404617:web:8492dcad3ffb5ac3feacd8",
   measurementId: "G-J6FJGP1Z52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const DB = getFirestore()
export const AUTH = getAuth(app)
export const STORAGE = getStorage(app)