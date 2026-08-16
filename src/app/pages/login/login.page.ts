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

import { Auth, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

import { firebaseAuth } from '../../core/firebase/firebase.config';


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
  // FIREBASE
  // =====================================================

  private auth: Auth = firebaseAuth;


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
        '💥 JSON :',
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
                '👤 AUCUN UTILISATEUR CONNECTÉ'
              );

              console.log(
                '✅ Login/Register autorisé.'
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
                '❌ JSON :',
                this.safeJson(error)
              );

            } finally {

              this.isLoading = false;

            }

          }

        );

    } catch (error) {

      console.error(
        '💥 ERREUR création onAuthStateChanged :',
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
        '❌ JSON :',
        this.safeJson(error)
      );

      throw error;

    }

  }


  // =====================================================
  // LOGIN EMAIL / PASSWORD
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

    const password =
      this.loginData.password;


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
        '📧 Email :',
        email
      );

      console.log(
        '📡 Appel Firebase Email Login...'
      );


      const credential =
        await signInWithEmailAndPassword(

          this.auth,

          email,

          password

        );


      console.log(
        '✅ FIREBASE EMAIL LOGIN RÉUSSI'
      );


      const firebaseToken =
        await credential.user.getIdToken(
          true
        );


      console.log(
        '✅ Firebase ID Token récupéré.'
      );


      await this.authenticateBackend(
        firebaseToken,
        false
      );


    } catch (error: any) {

      console.error(
        '❌ ERREUR LOGIN EMAIL :',
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
        '❌ JSON :',
        this.safeJson(error)
      );


      let message =
        'Impossible de se connecter.';


      switch (error?.code) {

        case 'auth/invalid-credential':
        case 'auth/wrong-password':

          message =
            'Email ou mot de passe incorrect.';

          break;


        case 'auth/user-not-found':

          message =
            'Aucun compte ne correspond à cet email.';

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


        default:

          if (error?.message) {

            message =
              error.message;

          }

          break;

      }


      this.showToastError(
        message
      );


    } finally {

      this.isLoading = false;

      console.log(
        '🔓 isLoading = false'
      );

      console.log(
        '🔐 LOGIN EMAIL/PASSWORD END'
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
        '⚠️ Authentification déjà en cours.'
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
          '🌐 Google Web Login.'
        );

        await this.googleLoginWeb();

        return;

      }


      if (
        platform === 'ios' ||
        platform === 'android'
      ) {

        console.log(
          '📱 Google Native Login.'
        );

        await this.googleLoginNative();

        return;

      }


      throw new Error(
        'Plateforme non supportée.'
      );


    } catch (error: any) {

      console.error(
        '❌ ERREUR GOOGLE LOGIN :',
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
        '❌ JSON :',
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
        '🔵 GOOGLE LOGIN END'
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


    const firebaseToken =
      await result.user.getIdToken(
        true
      );


    console.log(
      '✅ Firebase ID Token récupéré.'
    );


    await this.authenticateBackend(
      firebaseToken,
      false
    );

  }


  // =====================================================
  // GOOGLE NATIVE IOS / ANDROID
  // =====================================================

  private async googleLoginNative() {

    console.log('');
    console.log('========================================');
    console.log('📱 GOOGLE NATIVE LOGIN');
    console.log('========================================');


    try {

      // ---------------------------------------------------
      // GOOGLE NATIVE
      // ---------------------------------------------------

      console.log(
        '📱 Appel GoogleSignIn.signIn()...'
      );


      const result =
        await GoogleSignIn.signIn();


      console.log(
        '📦 Résultat Google natif reçu.'
      );


      console.log(
        '🆔 ID Token présent :',
        !!result?.idToken
      );

      console.log(
        '🔑 Access Token présent :',
        !!result?.accessToken
      );


      if (!result?.idToken) {

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
          result.idToken,
          result.accessToken
        );


      console.log(
        '✅ Firebase Google Credential créée.'
      );

      console.log(
        '🔐 Provider ID :',
        credential.providerId
      );

      console.log(
        '🔐 ID Token présent dans credential :',
        !!credential.idToken
      );


      // ---------------------------------------------------
      // FIREBASE AUTH
      // ---------------------------------------------------

      console.log(
        '🔥 Connexion du credential à Firebase...'
      );
      console.log(
        '🕒 Début signInWithCredential :',
        new Date().toISOString()
      );
      console.log(
        '🌐 Firebase Auth appName :',
        this.auth.app.name
      );
      console.log(
        '🌐 Firebase projectId :',
        this.auth.app.options.projectId || 'kelasi-app'
      );
      console.log(
        '👤 Firebase currentUser avant :',
        this.auth.currentUser
          ? {
              uid: this.auth.currentUser.uid,
              email: this.auth.currentUser.email
            }
          : null
      );


      console.log(
        '⏳ Démarrage signInWithCredential...'
      );


      const firebasePromise =
        signInWithCredential(
          this.auth,
          credential
        );


      console.log(
        '⏳ Promise signInWithCredential créée.'
      );


      // ---------------------------------------------------
      // TIMEOUT 15 SECONDES
      // ---------------------------------------------------

      const timeoutPromise =
        new Promise<never>(
          (_, reject) => {

            setTimeout(
              () => {

                reject(
                  new Error(
                    'TIMEOUT: Firebase signInWithCredential n’a pas répondu après 15 secondes.'
                  )
                );

              },
              15000
            );

          }
        );


      const firebaseResult =
        await Promise.race([
          firebasePromise,
          timeoutPromise
        ]);


      // ---------------------------------------------------
      // FIREBASE CONNECTÉ
      // ---------------------------------------------------

      console.log(
        '🔥 signInWithCredential a répondu.'
      );
      console.log(
        '✅ Résultat Firebase signInWithCredential :',
        firebaseResult?.user
          ? {
              uid: firebaseResult.user.uid,
              email: firebaseResult.user.email,
              providerId: firebaseResult.user.providerData?.[0]?.providerId
            }
          : firebaseResult
      );

      console.log(
        '🔥 GOOGLE FIREBASE LOGIN RÉUSSI'
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
        '❌ Firebase signInWithCredential erreur exacte :',
        error
      );
      console.error(
        '❌ Firebase error code exact :',
        (error as any)?.code
      );
      console.error(
        '❌ Firebase error message exact :',
        (error as any)?.message
      );
      console.error(
        '❌ Error name :',
        (error as any)?.name
      );
      console.error(
        '❌ Error JSON :',
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
        '✅ BACKEND RESPONSE'
      );

      console.log(
        '📦 Réponse backend :',
        response
      );


      if (!response?.success) {

        throw new Error(

          response?.message ||
          'Authentification backend échouée.'

        );

      }


      // ---------------------------------------------------
      // LOCAL STORAGE
      // ---------------------------------------------------

      if (response.user) {

        localStorage.setItem(
          'user',
          JSON.stringify(
            response.user
          )
        );

        console.log(
          '✅ Utilisateur sauvegardé localement.'
        );

      }


      // ---------------------------------------------------
      // RESTAURATION
      // ---------------------------------------------------

      if (restoringSession) {

        console.log(
          '♻️ Session restaurée automatiquement.'
        );


        await this.router.navigate([
          '/tabs/tab1'
        ]);


        return;

      }


      // ---------------------------------------------------
      // CONNEXION NORMALE
      // ---------------------------------------------------

      const prenom =
        response.user?.prenom ||
        response.user?.nom ||
        'à vous';


      this.showToastSuccess(
        `Bienvenue ${prenom} ! Connexion réussie.`
      );


      console.log(
        '⏳ Navigation dans 1.2 seconde...'
      );


      setTimeout(
        async () => {

          try {

            await this.router.navigate([
              '/tabs/tab1'
            ]);

          } catch (navigationError) {

            console.error(
              '❌ ERREUR NAVIGATION :',
              navigationError
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
        '❌ Status :',
        error?.status
      );

      console.error(
        '❌ Message :',
        error?.message
      );

      console.error(
        '❌ Backend error :',
        error?.error
      );


      const message =
        error?.error?.message ||
        error?.message ||
        'Impossible de communiquer avec le serveur.';


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
  // LOGOUT
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


      await signOut(
        this.auth
      );


      console.log(
        '✅ Firebase déconnecté.'
      );


      localStorage.removeItem(
        'user'
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
        '❌ ERREUR LOGOUT :',
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


    this.showErrorToast =
      false;


    if (
      this.successToastTimeout
    ) {

      clearTimeout(
        this.successToastTimeout
      );

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


    this.showSuccessToast =
      false;


    if (
      this.errorToastTimeout
    ) {

      clearTimeout(
        this.errorToastTimeout
      );

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

      return {
        message:
          value?.message ||
          String(value)
      };

    }

  }

}