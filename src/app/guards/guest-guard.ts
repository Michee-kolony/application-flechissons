import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, Auth, User } from 'firebase/auth';

export const guestGuard: CanActivateFn = () => {

  // =====================================================
  // LOG 01 - LE GUARD EST-IL APPELE ?
  // =====================================================

  console.log('========== GUEST GUARD START ==========');

  const router = inject(Router);

  console.log('GUEST GUARD: Router OK');

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

  console.log('GUEST GUARD: Firebase config OK');

  // =====================================================
  // FIREBASE APP
  // =====================================================

  let firebaseApp: FirebaseApp;

  try {

    const apps = getApps();

    console.log(
      'GUEST GUARD: Firebase apps existantes =',
      apps.length
    );

    if (apps.length > 0) {

      firebaseApp = apps[0];

      console.log(
        'GUEST GUARD: Firebase App deja initialisee'
      );

    } else {

      firebaseApp = initializeApp(firebaseConfig);

      console.log(
        'GUEST GUARD: Firebase App nouvellement initialisee'
      );
    }

  } catch (error) {

    console.error(
      'GUEST GUARD ERROR: Firebase initializeApp',
      error
    );

    console.error(
      'GUEST GUARD ERROR TYPE:',
      typeof error
    );

    // IMPORTANT :
    // On ne bloque PAS Login/Register
    return true;
  }

  // =====================================================
  // FIREBASE AUTH
  // =====================================================

  let auth: Auth;

  try {

    auth = getAuth(firebaseApp);

    console.log(
      'GUEST GUARD: Firebase Auth OK'
    );

  } catch (error) {

    console.error(
      'GUEST GUARD ERROR: getAuth',
      error
    );

    // On laisse l'utilisateur accéder à Login/Register
    return true;
  }

  // =====================================================
  // SESSION FIREBASE
  // =====================================================

  console.log(
    'GUEST GUARD: Debut verification session Firebase...'
  );

  return new Promise<boolean | UrlTree>((resolve) => {

    let alreadyResolved = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user: User | null) => {

        console.log(
          'GUEST GUARD: onAuthStateChanged EXECUTE'
        );

        console.log(
          'GUEST GUARD: USER =',
          user
        );

        // -------------------------------------------------
        // EVITER UNE DOUBLE RESOLUTION
        // -------------------------------------------------

        if (alreadyResolved) {

          console.log(
            'GUEST GUARD: Resolution deja effectuee'
          );

          return;
        }

        alreadyResolved = true;

        unsubscribe();

        // =================================================
        // UTILISATEUR CONNECTE
        // =================================================

        if (user) {

          console.log(
            'GUEST GUARD RESULT: USER CONNECTE'
          );

          console.log(
            'GUEST GUARD UID:',
            user.uid
          );

          console.log(
            'GUEST GUARD EMAIL:',
            user.email
          );

          console.log(
            'GUEST GUARD ACTION: REDIRECTION TAB1'
          );

          const urlTree = router.createUrlTree(
            ['/tabs/tab1']
          );

          console.log(
            'GUEST GUARD: UrlTree cree',
            urlTree
          );

          resolve(urlTree);

          return;
        }

        // =================================================
        // UTILISATEUR NON CONNECTE
        // =================================================

        console.log(
          'GUEST GUARD RESULT: AUCUN UTILISATEUR'
        );

        console.log(
          'GUEST GUARD ACTION: LOGIN/REGISTER AUTORISE'
        );

        resolve(true);

        console.log(
          '========== GUEST GUARD END =========='
        );
      },
      (error) => {

        // =================================================
        // ERREUR FIREBASE AUTH
        // =================================================

        console.error(
          'GUEST GUARD ERROR: onAuthStateChanged',
          error
        );

        console.error(
          'GUEST GUARD ERROR NAME:',
          error?.name
        );

        console.error(
          'GUEST GUARD ERROR MESSAGE:',
          error?.message
        );

        if (!alreadyResolved) {

          alreadyResolved = true;

          unsubscribe();

          // IMPORTANT :
          // Une erreur Firebase ne doit pas bloquer
          // la page Login/Register.

          console.log(
            'GUEST GUARD ACTION: ERREUR -> LOGIN AUTORISE'
          );

          resolve(true);
        }
      }
    );

  });
};