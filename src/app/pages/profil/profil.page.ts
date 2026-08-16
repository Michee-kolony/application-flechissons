import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import {
  FirebaseApp,
  initializeApp,
  getApp,
  getApps
} from 'firebase/app';

import {
  getAuth,
  Auth,
  signOut
} from 'firebase/auth';


interface User {
  id?: string;
  firebaseUid?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  photo?: string;
  profilComplete?: boolean;
  derniereConnexion?: string;
}


@Component({
  selector: 'app-profil',
  templateUrl: './profil.page.html',
  styleUrls: ['./profil.page.scss'],
  standalone: false
})
export class ProfilPage implements OnInit {

  // =====================================================
  // UTILISATEUR
  // =====================================================

  user: User | null = null;


  // =====================================================
  // ÉTAT
  // =====================================================

  isLoading = false;


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


  private firebaseApp: FirebaseApp =
    this.getFirebaseApp();


  private auth: Auth =
    getAuth(
      this.firebaseApp
    );


  private getFirebaseApp(): FirebaseApp {
    const apps = getApps();
    if (apps.length > 0) {
      return getApp();
    }
    return initializeApp(this.firebaseConfig);
  }


  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private router: Router,
    private alertController: AlertController
  ) {}


  // =====================================================
  // INITIALISATION
  // =====================================================

  ngOnInit() {

    this.loadUser();

  }


  // =====================================================
  // CHARGER UTILISATEUR
  // =====================================================

  private loadUser() {

    try {

      const storedUser =
        localStorage.getItem('user');


      if (!storedUser) {

        console.warn(
          '⚠️ Aucun utilisateur trouvé dans localStorage.'
        );

        this.router.navigate(
          ['/login'],
          {
            replaceUrl: true
          }
        );

        return;

      }


      this.user =
        JSON.parse(storedUser);


      console.log(
        '👤 Utilisateur chargé :',
        this.user
      );


    } catch (error) {

      console.error(
        '❌ Erreur chargement utilisateur :',
        error
      );


      localStorage.removeItem('user');


      this.router.navigate(
        ['/login'],
        {
          replaceUrl: true
        }
      );

    }

  }


  // =====================================================
  // NOM COMPLET
  // =====================================================

  get fullName(): string {

    if (!this.user) {

      return 'Utilisateur';

    }


    const prenom =
      this.user.prenom?.trim() || '';


    const nom =
      this.user.nom?.trim() || '';


    const fullName =
      `${prenom} ${nom}`.trim();


    return fullName || 'Utilisateur';

  }


  // =====================================================
  // INITIAL
  // =====================================================

  get userInitial(): string {

    if (this.user?.prenom) {

      return this.user.prenom
        .trim()
        .charAt(0)
        .toUpperCase();

    }


    if (this.user?.nom) {

      return this.user.nom
        .trim()
        .charAt(0)
        .toUpperCase();

    }


    return 'U';

  }


  // =====================================================
  // PHOTO
  // =====================================================

  get hasPhoto(): boolean {

    return !!(
      this.user?.photo &&
      this.user.photo.trim()
    );

  }


  /**
   * Gestionnaire d'erreur de chargement de la photo
   */
  onPhotoError(): void {
    // En cas d'erreur de chargement de la photo, on la vide
    // pour afficher l'initiale à la place
    if (this.user) {
      this.user.photo = '';
    }
    // La propriété hasPhoto sera automatiquement mise à jour
    // car elle est basée sur user.photo
  }


  // =====================================================
  // DÉCONNEXION
  // =====================================================

  async logout() {

    if (this.isLoading) {

      return;

    }


    const alert =
      await this.alertController.create({

        header: 'Déconnexion',

        message:
          'Voulez-vous vraiment vous déconnecter ?',

        buttons: [

          {
            text: 'Annuler',
            role: 'cancel'
          },

          {
            text: 'Déconnexion',
            role: 'destructive',

            handler: async () => {

              await this.performLogout();

            }

          }

        ],

        cssClass:
          'custom-alert'

      });


    await alert.present();

  }


  // =====================================================
  // EFFECTUER DÉCONNEXION
  // =====================================================

  private async performLogout() {

    try {

      this.isLoading = true;


      console.log(
        '🚪 Déconnexion en cours...'
      );


      // -------------------------------------------------
      // DÉCONNEXION FIREBASE
      // -------------------------------------------------

      await signOut(
        this.auth
      );


      console.log(
        '🔥 Firebase déconnecté.'
      );


      // -------------------------------------------------
      // SUPPRESSION SESSION LOCALE
      // -------------------------------------------------

      localStorage.removeItem(
        'user'
      );


      console.log(
        '🗑️ Utilisateur supprimé du localStorage.'
      );


      // -------------------------------------------------
      // REDIRECTION LOGIN
      // -------------------------------------------------

      await this.router.navigate(
        ['/login'],
        {
          replaceUrl: true
        }
      );


    } catch (error) {

      console.error(
        '❌ Erreur lors de la déconnexion :',
        error
      );


      // Même si Firebase rencontre une erreur,
      // on supprime la session locale.

      localStorage.removeItem(
        'user'
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

}