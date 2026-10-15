import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { PushNotificationService } from '../../services/push-notification.service';

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

  /*
   * Scènes animées : 0 = croix, 1 = personne en prière, 2 = Bible
   */
  readonly sceneCount = 3;
  readonly sceneDuration = 3000;
  currentScene = 0;

  private messageInterval: any;
  private sceneInterval: any;
  private redirectTimeout: any;

  constructor(
    private navCtrl: NavController,
    private pushNotificationService: PushNotificationService
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
     * Changement de scène toutes les 3 secondes
     */
    this.sceneInterval = setInterval(() => {

      this.currentScene =
        (this.currentScene + 1) %
        this.sceneCount;

    }, this.sceneDuration);

    /*
     * Redirection vers l'accueil une fois toutes les scènes jouées.
     * L'application est en libre accès : connecté ou non,
     * l'utilisateur atterrit sur /tabs/tab1 (la connexion n'est
     * demandée qu'au moment d'une action qui la requiert, via la
     * modal globale gérée par AuthService).
     */
    this.redirectTimeout = setTimeout(async () => {

      await this.navCtrl.navigateRoot('/tabs/tab1');

      // L'app a été lancée par un clic sur une notification :
      // on ouvre la page concernée par-dessus l'accueil
      const route = this.pushNotificationService.consommerRouteEnAttente();
      if (route) {
        await this.navCtrl.navigateForward(route);
      }

    }, this.sceneCount * this.sceneDuration);

  }

  ngOnDestroy() {

    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }

    if (this.sceneInterval) {
      clearInterval(this.sceneInterval);
    }

    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }

  }

}