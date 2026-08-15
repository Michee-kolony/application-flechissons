import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const guestGuard: CanActivateFn = () => {

  const router = inject(Router);

  // =====================================================
  // FIREBASE CONFIG
  // =====================================================

  const firebaseConfig = {
    apiKey: 'AIzaSyBMPr5hheUaMvQeEG45llTyiNVczhbErPY',
    authDomain: 'kelasi-app.firebaseapp.com',
    projectId: 'kelasi-app',
    storageBucket: 'kelasi-app.firebasestorage.app',
    messagingSenderId: '345155809498',
    appId: '1:345155809498:web:81707390dd617802dd35e3'
  };

  // =====================================================
  // INITIALISER FIREBASE SI NECESSAIRE
  // =====================================================

  const firebaseApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp(firebaseConfig);

  // =====================================================
  // FIREBASE AUTH
  // =====================================================

  const auth = getAuth(firebaseApp);

  // =====================================================
  // VÉRIFICATION SESSION
  // =====================================================

  return new Promise<boolean>((resolve) => {

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {

        // On arrête l'écoute après la première réponse
        unsubscribe();

        if (user) {

          console.log(
            '🔐 Utilisateur déjà connecté :',
            user.email
          );

          router.navigate(['/tabs/tab1']);

          resolve(false);

        } else {

          console.log(
            '👤 Aucun utilisateur connecté.'
          );

          resolve(true);

        }

      }
    );

  });

};