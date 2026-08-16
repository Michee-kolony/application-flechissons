import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyBMPr5hheUaMvQeEG45llTyiNVczhbErPY',
  authDomain: 'kelasi-app.firebaseapp.com',
  projectId: 'kelasi-app',
  storageBucket: 'kelasi-app.firebasestorage.app',
  messagingSenderId: '345155809498',
  appId: '1:345155809498:web:81707390dd617802dd35e3'
};

export function getFirebaseApp(): FirebaseApp {
  const apps = getApps();

  if (apps.length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export const firebaseApp = getFirebaseApp();
export const firebaseAuth = getFirebaseAuth();
