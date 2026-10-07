import { Injectable, NgZone } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications';
import { AuthService } from './auth.service';

const API_URL = 'https://flechissons.com';

/**
 * Notifications push (Firebase Cloud Messaging).
 *
 * - Enregistre le token de l'appareil auprès du backend :
 *   connecté → rattaché au compte (likes, commentaires + nouveautés)
 *   non connecté → abonné aux nouveautés seulement (publications, audios)
 * - Au clic sur une notification, ouvre la page exacte (data.route).
 *   Si l'app démarre à froid, la route est gardée en attente jusqu'à
 *   la fin du splash (voir SplashPage).
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {

  // Client HTTP sans intercepteur : un 401 ici ne doit pas déconnecter l'utilisateur
  private readonly http: HttpClient;

  private initialise = false;
  private fcmToken: string | null = null;

  /** JWT du compte auquel le token est actuellement rattaché côté backend */
  private jwtEnregistre: string | null = null;

  private routeEnAttente: string | null = null;

  constructor(
    httpBackend: HttpBackend,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private zone: NgZone,
    private authService: AuthService
  ) {
    this.http = new HttpClient(httpBackend);
  }

  async initialiser(): Promise<void> {
    if (this.initialise || !Capacitor.isNativePlatform()) {
      return;
    }
    this.initialise = true;

    try {
      // Les écouteurs d'abord : le clic qui a lancé l'app arrive dès leur ajout
      await PushNotifications.addListener('registration', token =>
        this.zone.run(() => {
          this.fcmToken = token.value;
          this.synchroniser();
        })
      );

      await PushNotifications.addListener('registrationError', error =>
        console.error('❌ Notifications : enregistrement impossible', error)
      );

      await PushNotifications.addListener('pushNotificationActionPerformed', action =>
        this.zone.run(() => this.ouvrir(action.notification.data?.route))
      );

      await PushNotifications.addListener('pushNotificationReceived', notification =>
        this.zone.run(() => this.afficherEnPremierPlan(notification))
      );

      if (Capacitor.getPlatform() === 'android') {
        // Même identifiant que le channelId envoyé par le backend
        await PushNotifications.createChannel({
          id: 'flechissons',
          name: 'Fléchissons',
          description: 'Nouvelles publications, audios, likes et commentaires',
          importance: 4,
          visibility: 1
        });
      }

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') {
        return;
      }

      await PushNotifications.register();

      // Connexion / déconnexion : rattacher ou détacher le token du compte
      this.authService.user$.subscribe(() => this.synchroniser());
    } catch (error) {
      console.error('❌ Notifications : initialisation impossible', error);
    }
  }

  /**
   * Appelé par le splash quand l'app est prête :
   * renvoie la page à ouvrir si une notification a lancé l'app.
   */
  consommerRouteEnAttente(): string | null {
    const route = this.routeEnAttente;
    this.routeEnAttente = null;
    return route;
  }

  private ouvrir(route?: string): void {
    // Uniquement des routes internes à l'app
    if (!route || !route.startsWith('/')) {
      return;
    }

    // Démarrage à froid : le splash redirigera vers l'accueil puis ouvrira la route
    const url = this.router.url;
    if (url === '/' || url === '' || url.startsWith('/splash')) {
      this.routeEnAttente = route;
      return;
    }

    void this.navCtrl.navigateForward(route);
  }

  /** App ouverte : le système n'affiche pas la notification, on montre un toast */
  private async afficherEnPremierPlan(notification: PushNotificationSchema): Promise<void> {
    const route = notification.data?.route;

    const toast = await this.toastCtrl.create({
      header: notification.title,
      message: notification.body,
      duration: 5000,
      position: 'top',
      buttons: route
        ? [{ text: 'Voir', handler: () => this.zone.run(() => this.ouvrir(route)) }]
        : [{ text: 'OK', role: 'cancel' }]
    });

    await toast.present();
  }

  private synchroniser(): void {
    const token = this.fcmToken;
    if (!token) {
      return;
    }

    const jwt = localStorage.getItem('token');

    if (jwt) {
      if (jwt === this.jwtEnregistre) {
        return;
      }
      this.jwtEnregistre = jwt;

      this.http.post(`${API_URL}/user/fcm-token`, { token }, { headers: this.entetes(jwt) }).subscribe({
        error: (error: HttpErrorResponse) => {
          this.jwtEnregistre = null;
          console.error(`❌ Notifications : token non enregistré (${error.status}) ${error.error?.message || error.message}`);

          if (error.status === 401 || error.status === 404) {
            // Session expirée ou compte supprimé : on ferme la session morte.
            // user$ relance synchroniser() → abonnement en visiteur.
            this.authService.logout();
          } else {
            // Autre erreur (réseau...) : au moins les nouveautés
            this.abonnerVisiteur(token);
          }
        }
      });
      return;
    }

    // Déconnexion : détacher le token de l'ancien compte
    if (this.jwtEnregistre) {
      this.http.delete(`${API_URL}/user/fcm-token`, {
        headers: this.entetes(this.jwtEnregistre),
        body: { token }
      }).subscribe({ error: () => undefined });
      this.jwtEnregistre = null;
    }

    this.abonnerVisiteur(token);
  }

  /** Visiteur non connecté : nouveautés uniquement (publications, audios) */
  private abonnerVisiteur(token: string): void {
    this.http.post(`${API_URL}/notification/abonnement`, { token }).subscribe({
      next: () => console.log('🔔 Notifications : appareil abonné aux nouveautés'),
      error: (error: HttpErrorResponse) =>
        console.error(`❌ Notifications : abonnement impossible (${error.status}) ${error.error?.message || error.message}`)
    });
  }

  private entetes(jwt: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  }
}
