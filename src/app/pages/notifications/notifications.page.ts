import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AppNotification, NotificationService, NotificationType } from '../../services/notification.service';

interface TypeAffichage {
  icone: string;
  libelle: string;
}

const TYPES: Record<NotificationType, TypeAffichage> = {
  article: { icone: 'newspaper-outline', libelle: 'Nouvelle publication' },
  audio: { icone: 'headset-outline', libelle: 'Nouvel audio' },
  live: { icone: 'radio-outline', libelle: 'En direct' },
  like: { icone: 'heart', libelle: 'J\'aime' },
  commentaire: { icone: 'chatbubble-ellipses-outline', libelle: 'Commentaire' },
  paiement: { icone: 'gift-outline', libelle: 'Contribution' },
  autre: { icone: 'notifications-outline', libelle: 'Notification' }
};

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage {

  notifications: AppNotification[] = [];
  chargement = true;
  erreur = false;
  fin = false;

  /** Notifications plus récentes que cette date = nouvelles (avant ouverture de la page) */
  private vuesLe: string | null = null;

  constructor(
    private notificationService: NotificationService,
    private navCtrl: NavController
  ) {}

  ionViewWillEnter(): void {
    this.vuesLe = this.notificationService.vuesLe;
    this.charger();
  }

  charger(event?: CustomEvent): void {
    this.erreur = false;

    this.notificationService.charger().subscribe({
      next: page => {
        this.notifications = page.notifications;
        this.fin = page.fin;
        this.chargement = false;
        this.notificationService.marquerCommeVues(page.notifications);
        (event?.target as HTMLIonRefresherElement | undefined)?.complete();
      },
      error: () => {
        this.erreur = true;
        this.chargement = false;
        (event?.target as HTMLIonRefresherElement | undefined)?.complete();
      }
    });
  }

  chargerPlus(event: CustomEvent): void {
    const derniere = this.notifications[this.notifications.length - 1];
    const scroll = event.target as HTMLIonInfiniteScrollElement;

    if (!derniere || this.fin) {
      void scroll.complete();
      return;
    }

    this.notificationService.charger(derniere.createdAt).subscribe({
      next: page => {
        this.notifications = [...this.notifications, ...page.notifications];
        this.fin = page.fin;
        void scroll.complete();
      },
      error: () => void scroll.complete()
    });
  }

  ouvrir(notification: AppNotification): void {
    // Uniquement des routes internes à l'app
    if (notification.route?.startsWith('/')) {
      void this.navCtrl.navigateForward(notification.route);
    }
  }

  estNouvelle(notification: AppNotification): boolean {
    return !!this.vuesLe && notification.createdAt > this.vuesLe;
  }

  icone(notification: AppNotification): string {
    return (TYPES[notification.type] || TYPES.autre).icone;
  }

  libelle(notification: AppNotification): string {
    return (TYPES[notification.type] || TYPES.autre).libelle;
  }

  /** "À l'instant", "il y a 5 min", "il y a 3 h", "hier", "il y a 4 j", puis la date */
  depuis(date: string): string {
    const secondes = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);

    if (secondes < 60) {
      return 'À l\'instant';
    }
    if (secondes < 3600) {
      return `il y a ${Math.floor(secondes / 60)} min`;
    }
    if (secondes < 86400) {
      return `il y a ${Math.floor(secondes / 3600)} h`;
    }

    const jours = Math.floor(secondes / 86400);
    if (jours === 1) {
      return 'hier';
    }
    if (jours < 7) {
      return `il y a ${jours} j`;
    }

    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  trackById(_: number, notification: AppNotification): string {
    return notification._id;
  }
}
