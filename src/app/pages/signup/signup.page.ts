import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { firstValueFrom } from 'rxjs';

import { Capacitor } from '@capacitor/core';

import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

import { initializeApp } from 'firebase/app';

import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';


@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false
})
export class SignupPage implements OnInit {

  // =====================================================
  // ÉTAPE
  // =====================================================

  currentStep = 1;

  isLoading = false;


  // =====================================================
  // API
  // =====================================================

  private readonly API_URL =
    'https://backend-flechissons.onrender.com';


  // =====================================================
  // FIREBASE
  // =====================================================

  private readonly firebaseConfig = {

    apiKey:
      'AIzaSyBMPr5hheUaMvQeEG45llTyiNVczhbErPY',

    authDomain:
      'kelasi-app.firebaseapp.com',

    projectId:
      'kelasi-app',

    storageBucket:
      'kelasi-app.firebasestorage.app',

    messagingSenderId:
      '345155809498',

    appId:
      '1:345155809498:web:81707390dd617802dd35e3'

  };


  private firebaseApp =
    initializeApp(this.firebaseConfig);


  private auth: Auth =
    getAuth(this.firebaseApp);


  // =====================================================
  // GOOGLE
  // =====================================================

  private readonly GOOGLE_WEB_CLIENT_ID =
    '345155809498-er553jjq50a2aatesm9atgibnk9po22q.apps.googleusercontent.com';


  // =====================================================
  // OPTIONS
  // =====================================================

  predicationOptions = [

    'Enseignement',
    'Évangélisation',
    'Prophétie',
    'Discernement'

  ];


  exhortationOptions = [

    'Encouragement',
    'Consolation',
    'Direction',
    'Réprimande'

  ];


  prayerOptions = [

    'Prière de combat',
    'Prière de bénédiction',
    "Prière d'intercession",
    'Prière de délivrance'

  ];


  otherOptions = [

    'Adoration',
    'Étude biblique',
    'Jeunesse',
    'Famille'

  ];


  // =====================================================
  // DONNÉES UTILISATEUR
  // =====================================================

  userData = {

    fullName: '',
    phone: '',
    address: '',
    birthDate: '',

    email: '',
    password: '',
    confirmPassword: '',

    preferences: {

      predication: [] as string[],
      exhortation: [] as string[],
      prayer: [] as string[],
      other: [] as string[]

    }

  };


  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(

    private toastController: ToastController,

    private router: Router,

    private http: HttpClient

  ) {}


  // =====================================================
  // INITIALISATION
  // =====================================================

  async ngOnInit() {

    const platform =
      Capacitor.getPlatform();

    console.log(
      '📱 Plateforme :',
      platform
    );


    if (
      platform === 'android' ||
      platform === 'ios'
    ) {

      await this.initializeGoogle();

    }

  }


  // =====================================================
  // TOAST CENTRALISÉ
  // =====================================================

  private async showToast(
    message: string,
    type:
      | 'success'
      | 'danger' = 'danger',
    duration = 3000
  ) {

    try {

      const toast =
        await this.toastController.create({

          message: message,

          duration: duration,

          position: 'top',

          cssClass:
            type === 'danger'
              ? 'signup-toast-danger'
              : 'signup-toast-success',

          buttons: [

            {
              text: 'OK',
              role: 'cancel'
            }

          ]

        });


      await toast.present();


      console.log(
        'Toast affiché :',
        message
      );


    } catch (error) {

      console.error(
        '❌ Impossible d’afficher le toast :',
        error
      );

    }

  }


  // =====================================================
  // GOOGLE NATIF
  // =====================================================

  private async initializeGoogle() {

    try {

      await GoogleSignIn.initialize({

        clientId:
          this.GOOGLE_WEB_CLIENT_ID,

        scopes: [

          'openid',
          'email',
          'profile'

        ]

      });


      console.log(
        '✅ Google Sign-In initialisé'
      );


    } catch (error) {

      console.error(
        '❌ Erreur Google init :',
        error
      );

    }

  }


  // =====================================================
  // PRÉFÉRENCES
  // =====================================================

  isSelected(
    category: string,
    item: string
  ): boolean {

    const prefs =
      this.userData.preferences as any;


    return (
      prefs[category]?.includes(item) ||
      false
    );

  }


  togglePreference(
    category: string,
    item: string
  ) {

    const prefs =
      this.userData.preferences as any;


    const index =
      prefs[category].indexOf(item);


    if (index > -1) {

      prefs[category].splice(
        index,
        1
      );

    } else {

      prefs[category].push(item);

    }

  }


  getTotalPreferences(): number {

    return Object.values(
      this.userData.preferences
    ).reduce(

      (total, arr) =>
        total + arr.length,

      0

    );

  }


  // =====================================================
  // ÉTAPE SUIVANTE
  // =====================================================

  async nextStep() {

    // ---------------------------------------------------
    // ÉTAPE 1
    // ---------------------------------------------------

    if (this.currentStep === 1) {

      if (
        !this.userData.fullName.trim()
      ) {

        await this.showToast(
          'Veuillez entrer votre nom complet.'
        );

        return;

      }


      if (
        !this.userData.phone.trim()
      ) {

        await this.showToast(
          'Veuillez entrer votre numéro de téléphone.'
        );

        return;

      }


      if (
        !this.userData.address.trim()
      ) {

        await this.showToast(
          'Veuillez entrer votre ville ou votre adresse.'
        );

        return;

      }


      if (
        !this.userData.birthDate
      ) {

        await this.showToast(
          'Veuillez entrer votre date de naissance.'
        );

        return;

      }

    }


    // ---------------------------------------------------
    // ÉTAPE 2
    // ---------------------------------------------------

    if (this.currentStep === 2) {

      if (
        this.getTotalPreferences() === 0
      ) {

        await this.showToast(
          'Veuillez sélectionner au moins une préférence spirituelle.'
        );

        return;

      }

    }


    // ---------------------------------------------------
    // PASSAGE À L'ÉTAPE SUIVANTE
    // ---------------------------------------------------

    if (this.currentStep < 3) {

      this.currentStep++;

      window.scrollTo({

        top: 0,

        behavior: 'smooth'

      });

    }

  }


  // =====================================================
  // ÉTAPE PRÉCÉDENTE
  // =====================================================

  prevStep() {

    if (this.currentStep > 1) {

      this.currentStep--;

      window.scrollTo({

        top: 0,

        behavior: 'smooth'

      });

    }

  }


  // =====================================================
  // INSCRIPTION EMAIL / MOT DE PASSE
  // =====================================================

  async submitForm() {

    if (this.isLoading) {
      return;
    }


    // ---------------------------------------------------
    // EMAIL
    // ---------------------------------------------------

    if (
      !this.userData.email.trim()
    ) {

      await this.showToast(
        'Veuillez entrer votre adresse email.'
      );

      return;

    }


    const email =
      this.userData.email
        .trim()
        .toLowerCase();


    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {

      await this.showToast(
        'Veuillez entrer une adresse email valide.'
      );

      return;

    }


    // ---------------------------------------------------
    // MOT DE PASSE
    // ---------------------------------------------------

    if (
      !this.userData.password
    ) {

      await this.showToast(
        'Veuillez créer un mot de passe.'
      );

      return;

    }


    if (
      this.userData.password.length < 6
    ) {

      await this.showToast(
        'Le mot de passe doit contenir au moins 6 caractères.'
      );

      return;

    }


    // ---------------------------------------------------
    // CONFIRMATION
    // ---------------------------------------------------

    if (
      this.userData.password !==
      this.userData.confirmPassword
    ) {

      await this.showToast(
        'Les mots de passe ne correspondent pas.'
      );

      return;

    }


    // ---------------------------------------------------
    // PRÉFÉRENCES
    // ---------------------------------------------------

    if (
      this.getTotalPreferences() === 0
    ) {

      await this.showToast(
        'Veuillez sélectionner au moins une préférence spirituelle.'
      );

      return;

    }


    try {

      this.isLoading = true;


      console.log(
        '🔐 Création du compte Firebase...'
      );


      // -------------------------------------------------
      // FIREBASE
      // -------------------------------------------------

      const credential =
        await createUserWithEmailAndPassword(

          this.auth,

          email,

          this.userData.password

        );


      console.log(
        '✅ Compte Firebase créé :',
        credential.user.uid
      );


      // -------------------------------------------------
      // NOM
      // -------------------------------------------------

      await updateProfile(

        credential.user,

        {

          displayName:
            this.userData.fullName

        }

      );


      // -------------------------------------------------
      // TOKEN FIREBASE
      // -------------------------------------------------

      const firebaseToken =
        await credential.user.getIdToken(true);


      // -------------------------------------------------
      // BACKEND
      // -------------------------------------------------

      await this.authenticateBackend(
        firebaseToken
      );


    } catch (error: any) {

      console.error(
        '❌ Erreur inscription :',
        error
      );


      let message =
        'Impossible de créer votre compte.';


      switch (error?.code) {

        case 'auth/email-already-in-use':

          message =
            'Cette adresse email est déjà utilisée.';

          break;


        case 'auth/invalid-email':

          message =
            'Adresse email invalide.';

          break;


        case 'auth/weak-password':

          message =
            'Le mot de passe est trop faible.';

          break;


        case 'auth/network-request-failed':

          message =
            'Problème de connexion Internet.';

          break;


        case 'auth/operation-not-allowed':

          message =
            'L’inscription par email n’est pas activée dans Firebase.';

          break;

      }


      await this.showToast(
        message,
        'danger',
        4000
      );


    } finally {

      this.isLoading = false;

    }

  }


  // =====================================================
  // INSCRIPTION GOOGLE
  // =====================================================

  async registerWithGoogle() {

    if (this.isLoading) {
      return;
    }


    try {

      this.isLoading = true;


      const platform =
        Capacitor.getPlatform();


      console.log(
        '🔵 Inscription Google :',
        platform
      );


      // =================================================
      // WEB
      // =================================================

      if (platform === 'web') {

        const provider =
          new GoogleAuthProvider();


        provider.addScope('profile');

        provider.addScope('email');


        const result =
          await signInWithPopup(

            this.auth,

            provider

          );


        console.log(
          '✅ Google Web connecté :',
          result.user.email
        );


        const firebaseToken =
          await result.user.getIdToken(true);


        await this.authenticateBackend(
          firebaseToken
        );


        return;

      }


      // =================================================
      // ANDROID / IOS
      // =================================================

      if (
        platform === 'android' ||
        platform === 'ios'
      ) {

        const result =
          await GoogleSignIn.signIn();


        console.log(
          '📦 Google natif :',
          result
        );


        if (!result.idToken) {

          throw new Error(
            'Google n’a pas retourné de ID Token.'
          );

        }


        const credential =
          GoogleAuthProvider.credential(
            result.idToken
          );


        const firebaseResult =
          await signInWithCredential(

            this.auth,

            credential

          );


        console.log(
          '🔥 Firebase Google connecté :',
          firebaseResult.user.email
        );


        const firebaseToken =
          await firebaseResult.user.getIdToken(true);


        await this.authenticateBackend(
          firebaseToken
        );


        return;

      }


      throw new Error(
        'Plateforme non supportée.'
      );


    } catch (error: any) {

      console.error(
        '❌ Erreur inscription Google :',
        error
      );


      let message =
        'Impossible de créer votre compte avec Google.';


      if (
        error?.code ===
        'auth/popup-closed-by-user'
      ) {

        message =
          'Connexion Google annulée.';

      }

      else if (
        error?.code ===
        'auth/popup-blocked'
      ) {

        message =
          'Le navigateur a bloqué la fenêtre Google.';

      }

      else if (
        error?.code ===
        'auth/unauthorized-domain'
      ) {

        message =
          'Ce domaine n’est pas autorisé dans Firebase Authentication.';

      }

      else if (
        error?.code ===
        'auth/account-exists-with-different-credential'
      ) {

        message =
          'Un compte existe déjà avec cette adresse email.';

      }

      else if (
        error?.message
      ) {

        message =
          error.message;

      }


      await this.showToast(
        message,
        'danger',
        5000
      );


    } finally {

      this.isLoading = false;

    }

  }


  // =====================================================
  // FIREBASE → BACKEND
  // =====================================================

  private async authenticateBackend(
    firebaseToken: string
  ) {

    try {

      const headers =
        new HttpHeaders({

          Authorization:
            `Bearer ${firebaseToken}`

        });


      const response: any =
        await firstValueFrom(

          this.http.post(

            `${this.API_URL}/user/firebase`,

            {},

            {
              headers
            }

          )

        );


      console.log(
        '✅ Backend :',
        response
      );


      if (!response?.success) {

        throw new Error(
          response?.message ||
          'Authentification backend échouée.'
        );

      }


      // -------------------------------------------------
      // STOCKER UTILISATEUR
      // -------------------------------------------------

      if (response.user) {

        localStorage.setItem(

          'user',

          JSON.stringify(
            response.user
          )

        );

      }


      // -------------------------------------------------
      // TOAST SUCCÈS
      // -------------------------------------------------

      await this.showToast(

        `Bienvenue ${response.user?.prenom || this.userData.fullName} ! Votre compte a été créé avec succès.`,

        'success',

        3500

      );


      // -------------------------------------------------
      // NAVIGATION
      // -------------------------------------------------

      await new Promise(
        resolve =>
          setTimeout(resolve, 500)
      );


      await this.router.navigate([
        '/tabs/tab1'
      ]);


    } catch (error: any) {

      console.error(
        '❌ Erreur backend :',
        error
      );


      let message =
        'Le compte Firebase a été créé, mais la connexion au serveur a échoué.';


      if (
        error?.error?.message
      ) {

        message =
          error.error.message;

      }

      else if (
        error?.message
      ) {

        message =
          error.message;

      }


      await this.showToast(
        message,
        'danger',
        5000
      );


      throw error;

    }

  }

}