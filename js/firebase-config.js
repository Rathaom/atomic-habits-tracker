// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyApoauTqVGCm9joGW_A4w0DHVcrob6Pd1I",
  authDomain: "atomic-habits-tracker-ed626.firebaseapp.com",
  projectId: "atomic-habits-tracker-ed626",
  storageBucket: "atomic-habits-tracker-ed626.firebasestorage.app",
  messagingSenderId: "580060970637",
  appId: "1:580060970637:web:99485bebec1bf081392cc4",
  measurementId: "G-R5ZCHHQSB3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);