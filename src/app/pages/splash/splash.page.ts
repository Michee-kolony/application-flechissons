import { Component, OnInit, OnDestroy } from '@angular/core';
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
     * Redirection vers l'accueil après quelques secondes.
     * L'application est en libre accès : connecté ou non,
     * l'utilisateur atterrit sur /tabs/tab1 (la connexion n'est
     * demandée qu'au moment d'une action qui la requiert, via la
     * modal globale gérée par AuthService).
     */
    this.redirectTimeout = setTimeout(() => {

      this.navCtrl.navigateRoot('/tabs/tab1');

    }, 5000);

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