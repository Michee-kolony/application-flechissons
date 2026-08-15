import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { firstValueFrom } from 'rxjs';

import { Capacitor } from '@capacitor/core';

import {
  GoogleSignIn
} from '@capawesome/capacitor-google-sign-in';

import {
  initializeApp,
  FirebaseApp
} from 'firebase/app';

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

  private successToastTimeout:
    ReturnType<typeof setTimeout> | null = null;

  private errorToastTimeout:
    ReturnType<typeof setTimeout> | null = null;


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

  private firebaseApp: FirebaseApp =
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

    console.log('');
    console.log('========================================');
    console.log('🚀 LOGIN PAGE INIT');
    console.log('========================================');

    try {

      const platform =
        Capacitor.getPlatform();

      console.log(
        '📱 Plateforme détectée :',
        platform
      );

      console.log(
        '🌐 Capacitor.isNativePlatform() :',
        Capacitor.isNativePlatform()
      );

      console.log(
        '🔥 Firebase App :',
        this.firebaseApp
      );

      console.log(
        '🔥 Firebase Auth :',
        this.auth
      );

      console.log(
        '👤 Firebase currentUser au démarrage :',
        this.auth.currentUser
      );


      // ---------------------------------------------------
      // GOOGLE NATIF
      // ---------------------------------------------------

      if (
        platform === 'android' ||
        platform === 'ios'
      ) {

        console.log(
          '🔵 Plateforme native détectée.'
        );

        console.log(
          '🔵 Initialisation Google Sign-In...'
        );

        await this.initializeGoogle();

      } else {

        console.log(
          '🌐 Plateforme Web détectée.'
        );

      }


      // ---------------------------------------------------
      // SESSION FIREBASE
      // ---------------------------------------------------

      console.log(
        '🔎 Lancement vérification session Firebase...'
      );

      this.checkFirebaseSession();

    } catch (error) {

      console.error(
        '💥 ERREUR CRITIQUE ngOnInit :',
        error
      );

      console.error(
        '💥 ERREUR CRITIQUE ngOnInit JSON :',
        this.safeJson(error)
      );

    }

    console.log('========================================');
    console.log('🚀 LOGIN PAGE INIT TERMINÉ');
    console.log('========================================');
    console.log('');

  }


  // =====================================================
  // VÉRIFIER SESSION FIREBASE
  // =====================================================

  private checkFirebaseSession() {

    console.log('');
    console.log('========================================');
    console.log('🔎 CHECK FIREBASE SESSION');
    console.log('========================================');

    try {

      console.log(
        '👤 currentUser avant listener :',
        this.auth.currentUser
      );


      const unsubscribe =
        onAuthStateChanged(

          this.auth,

          async (firebaseUser) => {

            console.log('');
            console.log(
              '🔥 onAuthStateChanged déclenché'
            );

            console.log(
              '👤 Firebase User :',
              firebaseUser
            );


            if (this.authChecked) {

              console.log(
                '⚠️ Session déjà vérifiée.'
              );

              unsubscribe();

              return;

            }


            this.authChecked = true;


            // ------------------------------------------------
            // AUCUN UTILISATEUR
            // ------------------------------------------------

            if (!firebaseUser) {

              console.log(
                '👤 Aucune session Firebase active.'
              );

              console.log(
                '➡️ Login disponible.'
              );

              unsubscribe();

              return;

            }


            // ------------------------------------------------
            // UTILISATEUR CONNECTÉ
            // ------------------------------------------------

            console.log(
              '🔥 SESSION FIREBASE TROUVÉE'
            );

            console.log(
              '📧 Email :',
              firebaseUser.email
            );

            console.log(
              '🆔 UID :',
              firebaseUser.uid
            );

            console.log(
              '🔐 Provider ID :',
              firebaseUser.providerData
            );


            try {

              this.isLoading = true;

              console.log(
                '🔑 Récupération Firebase ID Token...'
              );


              const firebaseToken =
                await firebaseUser.getIdToken(
                  true
                );


              console.log(
                '✅ Firebase ID Token récupéré.'
              );

              console.log(
                '🔑 Token présent :',
                !!firebaseToken
              );

              console.log(
                '🔑 Longueur token :',
                firebaseToken?.length
              );


              console.log(
                '📡 Restauration session backend...'
              );


              await this.authenticateBackend(
                firebaseToken,
                true
              );


            } catch (error) {

              console.error(
                '❌ ERREUR RESTAURATION SESSION :',
                error
              );

              console.error(
                '❌ JSON ERREUR :',
                this.safeJson(error)
              );

            } finally {

              this.isLoading = false;

            }

          }

        );

    } catch (error) {

      console.error(
        '💥 ERREUR CRÉATION onAuthStateChanged :',
        error
      );

      console.error(
        '💥 JSON :',
        this.safeJson(error)
      );

    }

  }


  // =====================================================
  // INITIALISER GOOGLE NATIF
  // =====================================================

  private async initializeGoogle() {

    console.log('');
    console.log('========================================');
    console.log('🔵 GOOGLE SIGN-IN INITIALIZATION');
    console.log('========================================');

    try {

      console.log(
        '🔵 Client ID Google :',
        this.GOOGLE_WEB_CLIENT_ID
      );

      console.log(
        '🔵 Appel GoogleSignIn.initialize()...'
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
        '❌ ERREUR GOOGLE INITIALIZE :',
        error
      );

      console.error(
        '❌ GOOGLE INITIALIZE JSON :',
        this.safeJson(error)
      );

      throw error;

    }

  }


  // =====================================================
  // CONNEXION EMAIL / MOT DE PASSE
  // =====================================================

  async login() {

    console.log('');
    console.log('========================================');
    console.log('🔐 LOGIN EMAIL/PASSWORD START');
    console.log('========================================');


    if (this.isLoading) {

      console.log(
        '⚠️ Login déjà en cours.'
      );

      return;

    }


    // ---------------------------------------------------
    // VALIDATION CHAMPS
    // ---------------------------------------------------

    if (
      !this.loginData.email ||
      !this.loginData.password
    ) {

      console.log(
        '⚠️ Champs email/password incomplets.'
      );

      this.showToastError(
        'Veuillez remplir tous les champs.'
      );

      return;

    }


    const email =
      this.loginData.email.trim();


    const password =
      this.loginData.password;


    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {

      console.log(
        '⚠️ Email invalide :',
        email
      );

      this.showToastError(
        'Veuillez entrer une adresse email valide.'
      );

      return;

    }


    try {

      this.isLoading = true;


      console.log(
        '📧 Email utilisé :',
        email
      );

      console.log(
        '🔐 Mot de passe présent :',
        !!password
      );

      console.log(
        '🔥 Firebase Auth avant connexion :',
        this.auth
      );

      console.log(
        '👤 currentUser avant connexion :',
        this.auth.currentUser
      );


      // ---------------------------------------------------
      // FIREBASE EMAIL LOGIN
      // ---------------------------------------------------

      console.log(
        '📡 Appel signInWithEmailAndPassword()...'
      );


      const credential =
        await signInWithEmailAndPassword(

          this.auth,

          email,

          password

        );


      console.log(
        '========================================'
      );

      console.log(
        '✅ FIREBASE EMAIL LOGIN RÉUSSI'
      );

      console.log(
        '========================================'
      );


      console.log(
        '👤 Firebase User :',
        credential.user
      );

      console.log(
        '📧 Email :',
        credential.user.email
      );

      console.log(
        '🆔 UID :',
        credential.user.uid
      );

      console.log(
        '📱 Provider :',
        credential.user.providerData
      );


      // ---------------------------------------------------
      // TOKEN
      // ---------------------------------------------------

      console.log(
        '🔑 Récupération Firebase ID Token...'
      );


      const firebaseToken =
        await credential.user.getIdToken(
          true
        );


      console.log(
        '✅ Firebase ID Token récupéré.'
      );

      console.log(
        '🔑 Token présent :',
        !!firebaseToken
      );

      console.log(
        '🔑 Token longueur :',
        firebaseToken?.length
      );


      // ---------------------------------------------------
      // BACKEND
      // ---------------------------------------------------

      console.log(
        '📡 Envoi du token Firebase au backend...'
      );


      await this.authenticateBackend(
        firebaseToken,
        false
      );


      console.log(
        '✅ LOGIN COMPLET TERMINÉ.'
      );


    } catch (error: any) {

      console.error('');
      console.error('========================================');
      console.error('❌ ERREUR LOGIN EMAIL');
      console.error('========================================');

      console.error(
        '❌ Error complet :',
        error
      );

      console.error(
        '❌ Error code :',
        error?.code
      );

      console.error(
        '❌ Error message :',
        error?.message
      );

      console.error(
        '❌ Error name :',
        error?.name
      );

      console.error(
        '❌ Error stack :',
        error?.stack
      );

      console.error(
        '❌ Error JSON :',
        this.safeJson(error)
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


        case 'auth/operation-not-allowed':

          message =
            'La connexion par email/mot de passe n’est pas activée dans Firebase.';

          break;


        case 'auth/internal-error':

          message =
            'Erreur interne Firebase. Consultez les logs Xcode.';

          break;


        default:

          if (error?.message) {

            message =
              error.message;

          }

          break;

      }


      console.error(
        '📢 Message utilisateur final :',
        message
      );


      this.showToastError(
        message
      );


    } finally {

      this.isLoading = false;

      console.log(
        '🔓 isLoading = false'
      );

      console.log(
        '========================================'
      );

      console.log(
        '🔐 LOGIN EMAIL/PASSWORD END'
      );

      console.log(
        '========================================'
      );

    }

  }


  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  async googleLogin() {

    console.log('');
    console.log('========================================');
    console.log('🔵 GOOGLE LOGIN START');
    console.log('========================================');


    if (this.isLoading) {

      console.log(
        '⚠️ Une authentification est déjà en cours.'
      );

      return;

    }


    try {

      this.isLoading = true;


      const platform =
        Capacitor.getPlatform();


      console.log(
        '📱 Plateforme :',
        platform
      );


      if (platform === 'web') {

        console.log(
          '🌐 Utilisation Google Firebase Web.'
        );

        await this.googleLoginWeb();

        return;

      }


      if (
        platform === 'android' ||
        platform === 'ios'
      ) {

        console.log(
          '📱 Utilisation Google Sign-In natif.'
        );

        await this.googleLoginNative();

        return;

      }


      throw new Error(
        'Plateforme non supportée.'
      );


    } catch (error: any) {

      console.error('');
      console.error(
        '========================================'
      );

      console.error(
        '❌ ERREUR GOOGLE LOGIN'
      );

      console.error(
        '========================================'
      );

      console.error(
        '❌ Error :',
        error
      );

      console.error(
        '❌ Code :',
        error?.code
      );

      console.error(
        '❌ Message :',
        error?.message
      );

      console.error(
        '❌ Error JSON :',
        this.safeJson(error)
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

      console.log(
        '🔓 Google login : isLoading = false'
      );

      console.log(
        '========================================'
      );

      console.log(
        '🔵 GOOGLE LOGIN END'
      );

      console.log(
        '========================================'
      );

    }

  }


  // =====================================================
  // GOOGLE WEB
  // =====================================================

  private async googleLoginWeb() {

    console.log('');
    console.log(
      '🌐 GOOGLE WEB LOGIN'
    );


    const provider =
      new GoogleAuthProvider();


    provider.addScope(
      'profile'
    );

    provider.addScope(
      'email'
    );


    console.log(
      '🌐 Ouverture popup Google...'
    );


    const result =
      await signInWithPopup(
        this.auth,
        provider
      );


    console.log(
      '✅ Google Web connecté.'
    );

    console.log(
      '👤 User :',
      result.user
    );

    console.log(
      '📧 Email :',
      result.user.email
    );

    console.log(
      '🆔 UID :',
      result.user.uid
    );


    console.log(
      '🔑 Récupération Firebase Token...'
    );


    const firebaseToken =
      await result.user.getIdToken(
        true
      );


    console.log(
      '✅ Firebase ID Token récupéré.'
    );

    console.log(
      '🔑 Token longueur :',
      firebaseToken?.length
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

    console.log('');
    console.log(
      '========================================'
    );

    console.log(
      '📱 GOOGLE NATIVE LOGIN'
    );

    console.log(
      '========================================'
    );


    try {

      console.log(
        '📱 Appel GoogleSignIn.signIn()...'
      );


      const result =
        await GoogleSignIn.signIn();


      console.log(
        '📦 Résultat Google natif :',
        result
      );


      console.log(
        '🆔 ID Token présent :',
        !!result?.idToken
      );


      if (!result?.idToken) {

        console.error(
          '❌ Google n’a fourni aucun ID Token.'
        );

        throw new Error(
          'Google n’a pas retourné de ID Token.'
        );

      }


      console.log(
        '✅ Google ID Token reçu.'
      );


      // ---------------------------------------------------
      // FIREBASE CREDENTIAL
      // ---------------------------------------------------

      console.log(
        '🔥 Création Firebase Google Credential...'
      );


      const credential =
        GoogleAuthProvider.credential(
          result.idToken
        );


      console.log(
        '✅ Firebase Google Credential créée.'
      );


      // ---------------------------------------------------
      // FIREBASE SIGN IN
      // ---------------------------------------------------

      console.log(
        '🔥 Connexion du credential à Firebase...'
      );


      const firebaseResult =
        await signInWithCredential(
          this.auth,
          credential
        );


      console.log(
        '========================================'
      );

      console.log(
        '🔥 GOOGLE FIREBASE LOGIN RÉUSSI'
      );

      console.log(
        '========================================'
      );


      console.log(
        '👤 Firebase User :',
        firebaseResult.user
      );

      console.log(
        '📧 Email :',
        firebaseResult.user.email
      );

      console.log(
        '🆔 UID :',
        firebaseResult.user.uid
      );


      // ---------------------------------------------------
      // FIREBASE TOKEN
      // ---------------------------------------------------

      console.log(
        '🔑 Récupération Firebase ID Token...'
      );


      const firebaseToken =
        await firebaseResult.user.getIdToken(
          true
        );


      console.log(
        '✅ Firebase ID Token récupéré.'
      );

      console.log(
        '🔑 Token longueur :',
        firebaseToken?.length
      );


      // ---------------------------------------------------
      // BACKEND
      // ---------------------------------------------------

      console.log(
        '📡 Envoi token Firebase au backend...'
      );


      await this.authenticateBackend(
        firebaseToken,
        false
      );


    } catch (error) {

      console.error(
        '❌ ERREUR GOOGLE NATIVE COMPLÈTE :',
        error
      );

      console.error(
        '❌ ERREUR GOOGLE NATIVE JSON :',
        this.safeJson(error)
      );

      throw error;

    }

  }


  // =====================================================
  // AUTHENTIFICATION BACKEND
  // =====================================================

  private async authenticateBackend(
    firebaseToken: string,
    restoringSession: boolean
  ) {

    console.log('');
    console.log('========================================');
    console.log('📡 BACKEND AUTH START');
    console.log('========================================');


    try {

      console.log(
        '🌐 API URL :',
        this.API_URL
      );

      console.log(
        '📍 Endpoint :',
        `${this.API_URL}/user/firebase`
      );

      console.log(
        '🔑 Token reçu :',
        !!firebaseToken
      );

      console.log(
        '🔑 Token longueur :',
        firebaseToken?.length
      );

      console.log(
        '♻️ Restoration session :',
        restoringSession
      );


      if (!firebaseToken) {

        throw new Error(
          'Firebase Token vide.'
        );

      }


      const headers =
        new HttpHeaders({

          Authorization:
            `Bearer ${firebaseToken}`

        });


      console.log(
        '📡 Envoi HTTP POST au backend...'
      );


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
        '========================================'
      );

      console.log(
        '✅ BACKEND RESPONSE'
      );

      console.log(
        '========================================'
      );

      console.log(
        '📦 Réponse backend :',
        response
      );


      if (
        !response?.success
      ) {

        console.error(
          '❌ Backend retourne success=false.'
        );

        throw new Error(

          response?.message ||
          'Authentification backend échouée.'

        );

      }


      // ---------------------------------------------------
      // LOCAL STORAGE
      // ---------------------------------------------------

      if (response.user) {

        console.log(
          '💾 Sauvegarde utilisateur localStorage...'
        );


        localStorage.setItem(

          'user',

          JSON.stringify(
            response.user
          )

        );


        console.log(
          '✅ Utilisateur sauvegardé.'
        );

      }


      // ---------------------------------------------------
      // RESTAURATION
      // ---------------------------------------------------

      if (restoringSession) {

        console.log(
          '♻️ Session restaurée automatiquement.'
        );

        console.log(
          '➡️ Navigation vers /tabs/tab1...'
        );


        const navigationResult =
          await this.router.navigate([
            '/tabs/tab1'
          ]);


        console.log(
          '🧭 Navigation result :',
          navigationResult
        );


        return;

      }


      // ---------------------------------------------------
      // CONNEXION NORMALE
      // ---------------------------------------------------

      const prenom =
        response.user?.prenom ||
        response.user?.nom ||
        'à vous';


      console.log(
        '👋 Utilisateur :',
        prenom
      );


      this.showToastSuccess(

        `Bienvenue ${prenom} ! Connexion réussie.`

      );


      console.log(
        '⏳ Navigation dans 1.2 seconde...'
      );


      setTimeout(
        async () => {

          try {

            console.log(
              '➡️ Navigation vers /tabs/tab1...'
            );


            const navigationResult =
              await this.router.navigate([
                '/tabs/tab1'
              ]);


            console.log(
              '🧭 Navigation result :',
              navigationResult
            );


          } catch (navigationError) {

            console.error(
              '❌ ERREUR NAVIGATION :',
              navigationError
            );

            console.error(
              '❌ NAVIGATION JSON :',
              this.safeJson(navigationError)
            );

          }

        },
        1200
      );


    } catch (error: any) {

      console.error('');
      console.error(
        '========================================'
      );

      console.error(
        '❌ ERREUR BACKEND AUTH'
      );

      console.error(
        '========================================'
      );


      console.error(
        '❌ Error :',
        error
      );

      console.error(
        '❌ Error status :',
        error?.status
      );

      console.error(
        '❌ Error statusText :',
        error?.statusText
      );

      console.error(
        '❌ Error message :',
        error?.message
      );

      console.error(
        '❌ Error error :',
        error?.error
      );

      console.error(
        '❌ Error headers :',
        error?.headers
      );

      console.error(
        '❌ Error JSON :',
        this.safeJson(error)
      );


      const message =
        error?.error?.message ||
        error?.message ||
        'Impossible de communiquer avec le serveur.';


      console.error(
        '📢 Message final :',
        message
      );


      this.showToastError(
        message
      );


      throw error;

    } finally {

      console.log(
        '========================================'
      );

      console.log(
        '📡 BACKEND AUTH END'
      );

      console.log(
        '========================================'
      );

    }

  }


  // =====================================================
  // DÉCONNEXION
  // =====================================================

  async logout() {

    console.log('');
    console.log(
      '========================================'
    );

    console.log(
      '👋 LOGOUT START'
    );

    console.log(
      '========================================'
    );


    try {

      this.isLoading = true;


      console.log(
        '🔥 Déconnexion Firebase...'
      );


      await signOut(
        this.auth
      );


      console.log(
        '✅ Firebase déconnecté.'
      );


      localStorage.removeItem(
        'user'
      );


      console.log(
        '🗑️ localStorage user supprimé.'
      );


      this.showToastSuccess(
        'Déconnexion réussie.'
      );


      console.log(
        '➡️ Navigation vers /login...'
      );


      await this.router.navigate(
        ['/login'],
        {
          replaceUrl: true
        }
      );


    } catch (error) {

      console.error(
        '❌ ERREUR LOGOUT :',
        error
      );

      console.error(
        '❌ LOGOUT JSON :',
        this.safeJson(error)
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

      console.log(
        '🔓 Logout isLoading = false'
      );

      console.log(
        '👋 LOGOUT END'
      );

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


    this.showErrorToast = false;


    if (
      this.successToastTimeout
    ) {

      clearTimeout(
        this.successToastTimeout
      );

      this.successToastTimeout = null;

    }


    this.successMessage =
      message;


    this.showSuccessToast =
      true;


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

    console.error(
      '🔴 TOAST ERROR :',
      message
    );


    this.showSuccessToast = false;


    if (
      this.errorToastTimeout
    ) {

      clearTimeout(
        this.errorToastTimeout
      );

      this.errorToastTimeout = null;

    }


    this.errorMessage =
      message;


    this.showErrorToast =
      true;


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

    console.log(
      '⚠️ ALERT :',
      header,
      message
    );


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


  // =====================================================
  // SAFE JSON
  // =====================================================

  private safeJson(
    value: any
  ): any {

    try {

      return JSON.parse(
        JSON.stringify(value)
      );

    } catch {

      return String(value);

    }

  }

}