import {
  FirebaseApp,
  getApp,
  getApps,
  initializeApp
} from 'firebase/app';

import {
  Auth,
  getAuth
} from 'firebase/auth';


// =====================================================
// FIREBASE CONFIG
// =====================================================

export const firebaseConfig = {
  apiKey: 'AIzaSyBMPr5hheUaMvQeEG45llTyiNVczhbErPY',
  authDomain: 'kelasi-app.firebaseapp.com',
  projectId: 'kelasi-app',
  storageBucket: 'kelasi-app.firebasestorage.app',
  messagingSenderId: '345155809498',
  appId: '1:345155809498:web:81707390dd617802dd35e3'
};


// =====================================================
// FIREBASE APP UNIQUE
// =====================================================

export function getFirebaseApp(): FirebaseApp {

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}


// =====================================================
// FIREBASE AUTH UNIQUE
// =====================================================

export function getFirebaseAuth(): Auth {

  const app = getFirebaseApp();

  return getAuth(app);
}


// =====================================================
// INSTANCES CENTRALES
// =====================================================

export const firebaseApp =
  getFirebaseApp();

export const firebaseAuth =
  getFirebaseAuth();