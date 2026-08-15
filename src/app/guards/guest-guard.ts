import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const guestGuard: CanActivateFn = () => {

  console.log('========================================');
  console.log('🔥 GUEST GUARD START');
  console.log('========================================');

  const router = inject(Router);

  console.log('🔥 GUEST GUARD : Router OK');

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

  console.log('🔥 GUEST GUARD : Firebase config OK');

  // =====================================================
  // INITIALISER FIREBASE
  // =====================================================

  let firebaseApp;

  try {

    console.log(
      '🔥 GUEST GUARD : Firebase apps existantes =',
      getApps().length
    );

    firebaseApp =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp(firebaseConfig);

    console.log(
      '🔥 GUEST GUARD : Firebase App OK'
    );

  } catch (error) {

    console.error(
      '❌ GUEST GUARD : Erreur initializeApp',
      error
    );

    // En cas d'erreur Firebase,
    // on laisse l'utilisateur accéder à Login/Register.
    return true;
  }

  // =====================================================
  // FIREBASE AUTH
  // =====================================================

  let auth;

  try {

    auth = getAuth(firebaseApp);

    console.log(
      '🔥 GUEST GUARD : Firebase Auth OK'
    );

  } catch (error) {

    console.error(
      '❌ GUEST GUARD : Erreur getAuth',
      error
    );

    return true;
  }

  // =====================================================
  // VÉRIFICATION DIRECTE
  // =====================================================

  console.log(
    '🔥 GUEST GUARD : Vérification de currentUser...'
  );

  try {

    const user = auth.currentUser;

    // ===================================================
    // UTILISATEUR CONNECTÉ
    // ===================================================

    if (user) {

      console.log(
        '🔐 GUEST GUARD : UTILISATEUR CONNECTÉ'
      );

      console.log(
        '📧 Email :',
        user.email
      );

      console.log(
        '🆔 UID :',
        user.uid
      );

      console.log(
        '➡️ Redirection vers /tabs/tab1'
      );

      return router.createUrlTree(['/tabs/tab1']);
    }

    // ===================================================
    // AUCUN UTILISATEUR
    // ===================================================

    console.log(
      '👤 GUEST GUARD : AUCUN UTILISATEUR CONNECTÉ'
    );

    console.log(
      '✅ GUEST GUARD : accès Login/Register autorisé'
    );

    return true;

  } catch (error) {

    console.error(
      '❌ GUEST GUARD : Erreur pendant currentUser',
      error
    );

    // Sécurité :
    // si Firebase rencontre un problème,
    // on ne bloque PAS Login/Register.

    console.log(
      '➡️ GUEST GUARD : Firebase en erreur → accès autorisé'
    );

    return true;
  }

};