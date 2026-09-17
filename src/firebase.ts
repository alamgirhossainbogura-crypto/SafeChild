import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// এই config অবজেক্ট client-এ থাকা নিরাপদ — Firebase Security Rules
// দিয়ে অ্যাক্সেস কন্ট্রোল হয়, এটা লুকানোর দরকার নেই।
// Firebase console → Project Settings → Your apps থেকে পাবেন
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
