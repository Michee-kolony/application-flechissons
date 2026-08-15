import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
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
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  // =====================================================
  // FORMULAIRE
  // =====================================================

  loginData = {
    email: '',
    password: '',
    rememberMe: false
  };


  // =====================================================
  // ÉTAT
  // =====================================================

  isLoading = false;

  private authChecked = false;


  // =====================================================
  // TOASTS
  // =====================================================

  showSuccessToast = false;
  showErrorToast = false;

  successMessage = '';
  errorMessage = '';

  private successToastTimeout: ReturnType<typeof setTimeout> | null = null;
  private errorToastTimeout: ReturnType<typeof setTimeout> | null = null;


  // =====================================================
  // BACKEND
  // =====================================================

  private readonly API_URL =
    'https://backend-flechissons.onrender.com';


  // =====================================================
  // FIREBASE CONFIGURATION
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


  // =====================================================
  // FIREBASE
  // =====================================================

  private firebaseApp =
    initializeApp(
      this.firebaseConfig
    );

  private auth: Auth =
    getAuth(
      this.firebaseApp
    );


  // =====================================================
  // GOOGLE OAUTH
  // =====================================================

  private readonly GOOGLE_WEB_CLIENT_ID =
    '345155809498-er553jjq50a2aatesm9atgibnk9po22q.apps.googleusercontent.com';


  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private alertController: AlertController,
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
      '📱 Plateforme détectée :',
      platform
    );


    // ---------------------------------------------------
    // GOOGLE NATIF
    // ---------------------------------------------------

    if (
      platform === 'android' ||
      platform === 'ios'
    ) {

      await this.initializeGoogle();

    }


    // ---------------------------------------------------
    // VÉRIFICATION SESSION FIREBASE
    // ---------------------------------------------------

    this.checkFirebaseSession();

  }


  // =====================================================
  // VÉRIFIER SESSION FIREBASE
  // =====================================================

  private checkFirebaseSession() {

    onAuthStateChanged(
      this.auth,
      async (firebaseUser) => {

        if (this.authChecked) {
          return;
        }

        this.authChecked = true;


        if (!firebaseUser) {

          console.log(
            'ℹ️ Aucune session Firebase active.'
          );

          return;

        }


        console.log(
          '🔥 Session Firebase trouvée :',
          firebaseUser.email
        );


        try {

          this.isLoading = true;


          const firebaseToken =
            await firebaseUser.getIdToken(
              true
            );


          await this.authenticateBackend(
            firebaseToken,
            true
          );


        } catch (error) {

          console.error(
            '❌ Erreur restauration session :',
            error
          );

        } finally {

          this.isLoading = false;

        }

      }
    );

  }


  // =====================================================
  // INITIALISER GOOGLE NATIF
  // =====================================================

  private async initializeGoogle() {

    try {

      console.log(
        '🔵 Initialisation Google Sign-In natif...'
      );


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
        '✅ Google Sign-In natif initialisé.'
      );


    } catch (error) {

      console.error(
        '❌ Erreur initialisation Google :',
        error
      );

    }

  }


  // =====================================================
  // CONNEXION EMAIL / MOT DE PASSE
  // =====================================================

  async login() {

    if (this.isLoading) {
      return;
    }


    if (
      !this.loginData.email ||
      !this.loginData.password
    ) {

      this.showToastError(
        'Veuillez remplir tous les champs.'
      );

      return;

    }


    const email =
      this.loginData.email.trim();


    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {

      this.showToastError(
        'Veuillez entrer une adresse email valide.'
      );

      return;

    }


    try {

      this.isLoading = true;


      console.log(
        '🔐 Connexion Firebase avec email :',
        email
      );


      const credential =
        await signInWithEmailAndPassword(
          this.auth,
          email,
          this.loginData.password
        );


      console.log(
        '✅ Utilisateur Firebase connecté :',
        credential.user.email
      );


      const firebaseToken =
        await credential.user.getIdToken(
          true
        );


      console.log(
        '🔥 Firebase ID Token récupéré.'
      );


      await this.authenticateBackend(
        firebaseToken,
        false
      );


    } catch (error: any) {

      console.error(
        '❌ Erreur connexion email :',
        error
      );


      let message =
        'Impossible de se connecter.';


      switch (error?.code) {

        case 'auth/invalid-credential':

          message =
            'Email ou mot de passe incorrect.';

          break;


        case 'auth/user-not-found':

          message =
            'Aucun compte ne correspond à cet email.';

          break;


        case 'auth/wrong-password':

          message =
            'Mot de passe incorrect.';

          break;


        case 'auth/invalid-email':

          message =
            'Adresse email invalide.';

          break;


        case 'auth/user-disabled':

          message =
            'Ce compte a été désactivé.';

          break;


        case 'auth/too-many-requests':

          message =
            'Trop de tentatives. Réessayez plus tard.';

          break;


        case 'auth/network-request-failed':

          message =
            'Problème de connexion Internet.';

          break;

      }


      this.showToastError(
        message
      );

    } finally {

      this.isLoading = false;

    }

  }


  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  async googleLogin() {

    if (this.isLoading) {
      return;
    }


    try {

      this.isLoading = true;


      const platform =
        Capacitor.getPlatform();


      console.log(
        '🔵 Connexion Google :',
        platform
      );


      if (platform === 'web') {

        await this.googleLoginWeb();

        return;

      }


      if (
        platform === 'android' ||
        platform === 'ios'
      ) {

        await this.googleLoginNative();

        return;

      }


      throw new Error(
        'Plateforme non supportée.'
      );


    } catch (error: any) {

      console.error(
        '❌ Erreur Google :',
        error
      );


      let message =
        'Impossible de se connecter avec Google.';


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


      this.showToastError(
        message
      );


    } finally {

      this.isLoading = false;

    }

  }


  // =====================================================
  // GOOGLE WEB
  // =====================================================

  private async googleLoginWeb() {

    console.log(
      '🌐 Google via Firebase Web...'
    );


    const provider =
      new GoogleAuthProvider();


    provider.addScope(
      'profile'
    );

    provider.addScope(
      'email'
    );


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
      await result.user.getIdToken(
        true
      );


    console.log(
      '🔥 Firebase ID Token récupéré.'
    );


    await this.authenticateBackend(
      firebaseToken,
      false
    );

  }


  // =====================================================
  // GOOGLE ANDROID / IOS
  // =====================================================

  private async googleLoginNative() {

    console.log(
      '📱 Google Sign-In natif...'
    );


    const result =
      await GoogleSignIn.signIn();


    console.log(
      '📦 Résultat Google natif :',
      result
    );


    if (!result.idToken) {

      throw new Error(
        'Google n’a pas retourné de ID Token.'
      );

    }


    console.log(
      '✅ Google ID Token reçu.'
    );


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
      '🔥 Firebase connecté :',
      firebaseResult.user.email
    );


    const firebaseToken =
      await firebaseResult.user.getIdToken(
        true
      );


    console.log(
      '🔥 Firebase ID Token récupéré.'
    );


    await this.authenticateBackend(
      firebaseToken,
      false
    );

  }


  // =====================================================
  // AUTHENTIFICATION BACKEND
  // =====================================================

  private async authenticateBackend(
    firebaseToken: string,
    restoringSession: boolean
  ) {

    try {

      console.log(
        '📡 Envoi Firebase Token au backend...'
      );


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
        '✅ Réponse backend :',
        response
      );


      if (
        !response?.success
      ) {

        throw new Error(

          response?.message ||
          'Authentification backend échouée.'

        );

      }


      if (response.user) {

        localStorage.setItem(
          'user',
          JSON.stringify(
            response.user
          )
        );

      }


      if (restoringSession) {

        console.log(
          '♻️ Session restaurée automatiquement.'
        );


        await this.router.navigate([
          '/tabs/tab1'
        ]);


        return;

      }


      const prenom =
        response.user?.prenom ||
        response.user?.nom ||
        'à vous';


      this.showToastSuccess(

        `Bienvenue ${prenom} ! Connexion réussie.`

      );


      setTimeout(
        async () => {

          await this.router.navigate([
            '/tabs/tab1'
          ]);

        },
        1200
      );


    } catch (error: any) {

      console.error(
        '❌ Erreur backend :',
        error
      );


      const message =
        error?.error?.message ||
        error?.message ||
        'Impossible de communiquer avec le serveur.';


      this.showToastError(
        message
      );


      throw error;

    }

  }


  // =====================================================
  // DÉCONNEXION
  // =====================================================

  async logout() {

    try {

      this.isLoading = true;


      await signOut(
        this.auth
      );


      localStorage.removeItem(
        'user'
      );


      console.log(
        '👋 Déconnexion Firebase réussie.'
      );


      this.showToastSuccess(
        'Déconnexion réussie.'
      );


      await this.router.navigate(
        ['/login'],
        {
          replaceUrl: true
        }
      );


    } catch (error) {

      console.error(
        '❌ Erreur déconnexion :',
        error
      );


      localStorage.removeItem(
        'user'
      );


      this.showToastError(
        'Erreur lors de la déconnexion.'
      );


      await this.router.navigate(
        ['/login'],
        {
          replaceUrl: true
        }
      );


    } finally {

      this.isLoading = false;

    }

  }


  // =====================================================
  // TOAST SUCCESS
  // =====================================================

  showToastSuccess(
    message: string
  ) {

    console.log(
      '🟢 TOAST SUCCESS :',
      message
    );


    // Fermer un éventuel toast erreur
    this.showErrorToast = false;


    // Annuler ancien timer
    if (
      this.successToastTimeout
    ) {

      clearTimeout(
        this.successToastTimeout
      );

      this.successToastTimeout = null;

    }


    // Message
    this.successMessage =
      message;


    // Afficher
    this.showSuccessToast =
      true;


    // Masquer après 4 secondes
    this.successToastTimeout =
      setTimeout(
        () => {

          this.closeSuccessToast();

        },
        4000
      );

  }


  // =====================================================
  // TOAST ERROR
  // =====================================================

  showToastError(
    message: string
  ) {

    console.log(
      '🔴 TOAST ERROR :',
      message
    );


    // Fermer un éventuel toast success
    this.showSuccessToast = false;


    // Annuler ancien timer
    if (
      this.errorToastTimeout
    ) {

      clearTimeout(
        this.errorToastTimeout
      );

      this.errorToastTimeout = null;

    }


    // Message
    this.errorMessage =
      message;


    // Afficher
    this.showErrorToast =
      true;


    // Masquer après 4 secondes
    this.errorToastTimeout =
      setTimeout(
        () => {

          this.closeErrorToast();

        },
        4000
      );

  }


  // =====================================================
  // FERMER SUCCESS
  // =====================================================

  closeSuccessToast() {

    this.showSuccessToast =
      false;


    if (
      this.successToastTimeout
    ) {

      clearTimeout(
        this.successToastTimeout
      );

      this.successToastTimeout =
        null;

    }

  }


  // =====================================================
  // FERMER ERROR
  // =====================================================

  closeErrorToast() {

    this.showErrorToast =
      false;


    if (
      this.errorToastTimeout
    ) {

      clearTimeout(
        this.errorToastTimeout
      );

      this.errorToastTimeout =
        null;

    }

  }


  // =====================================================
  // ALERT
  // =====================================================

  private async showAlert(
    header: string,
    message: string
  ) {

    const alert =
      await this.alertController.create({

        header,

        message,

        buttons: [
          'OK'
        ],

        cssClass:
          'custom-alert'

      });


    await alert.present();

  }

}