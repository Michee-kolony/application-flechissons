import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { firebaseAuth } from '../core/firebase/firebase.config';

export const guestGuard: CanActivateFn = () => {

  console.log('========================================');
  console.log('🔥 GUEST GUARD START');
  console.log('========================================');

  const router = inject(Router);

  console.log('🔥 GUEST GUARD : Router OK');

  console.log('🔥 GUEST GUARD : Firebase config OK');
  console.log('🔥 GUEST GUARD : Firebase App OK');
  console.log('🔥 GUEST GUARD : Firebase Auth OK');

  const auth = firebaseAuth;

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