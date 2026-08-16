import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit, OnDestroy {

  loadingMessages = [
    'Préparation de votre espace...',
    'Chargement des contenus...',
    'Synchronisation des données...',
    'Personnalisation de votre expérience...',
    'Presque prêt...'
  ];

  currentMessage = 0;

  private messageInterval: any;
  private redirectTimeout: any;

  constructor(
    private router: Router,
    private navCtrl: NavController
  ) {}

  ngOnInit() {

    /*
     * Changement du texte toutes les secondes
     */
    this.messageInterval = setInterval(() => {

      this.currentMessage =
        (this.currentMessage + 1) %
        this.loadingMessages.length;

    }, 1000);

    /*
     * Vérification de l'utilisateur connecté
     * et redirection après quelques secondes
     */
    this.redirectTimeout = setTimeout(() => {

      this.checkUserAndRedirect();

    }, 5000);

  }

  /**
   * Vérifie si l'utilisateur est connecté
   * et redirige vers la bonne page
   */
  checkUserAndRedirect(): void {
    try {
      // Récupérer les données du localStorage (mêmes clés que dans login.page.ts)
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const userId = localStorage.getItem('userId');

      // Vérifier si l'utilisateur est connecté
      // (token présent ET utilisateur présent ET userId présent)
      if (token && userData && userId) {
        try {
          const user = JSON.parse(userData);
          // Vérifier que l'utilisateur a bien un ID qui correspond au userId stocké
          if (user && user.id && user.id === userId) {
            console.log('✅ Utilisateur connecté détecté :', user.email);
            console.log('🆔 User ID :', userId);
            console.log('🔐 Token présent :', token.substring(0, 20) + '...');
            
            // Rediriger vers l'accueil
            this.navCtrl.navigateRoot('/tabs/tab1');
            return;
          } else {
            console.warn('⚠️ Incohérence des données utilisateur');
          }
        } catch (parseError) {
          console.error('❌ Erreur de parsing des données utilisateur:', parseError);
          // Supprimer les données corrompues
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
        }
      }

      // Si pas d'utilisateur connecté ou données invalides
      console.log('👤 Aucun utilisateur connecté, redirection vers /login');
      this.navCtrl.navigateRoot('/login');

    } catch (error) {
      // En cas d'erreur, rediriger vers login par sécurité
      console.error('❌ Erreur lors de la vérification de l\'utilisateur:', error);
      this.navCtrl.navigateRoot('/login');
    }
  }

  ngOnDestroy() {

    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }

    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }

  }

}