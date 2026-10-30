import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AppNotification, NotificationService, NotificationType } from '../../services/notification.service';

interface TypeAffichage {
  icone: string;
  libelle: string;
}

const TYPES: Record<NotificationType, TypeAffichage> = {
  article: { icone: 'fa-solid fa-newspaper', libelle: 'Nouvelle publication' },
  audio: { icone: 'fa-solid fa-headphones', libelle: 'Nouvel audio' },
  live: { icone: 'fa-solid fa-tower-broadcast', libelle: 'En direct' },
  like: { icone: 'fa-solid fa-heart', libelle: 'J\'aime' },
  commentaire: { icone: 'fa-solid fa-comment-dots', libelle: 'Commentaire' },
  paiement: { icone: 'fa-solid fa-gift', libelle: 'Contribution' },
  autre: { icone: 'fa-solid fa-bell', libelle: 'Notification' }
};

/** Emojis (💬, ❤️, 🎧…) présents dans les titres des anciennes notifications */
const EMOJIS = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

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
      this.notificationService.resoudreRoute(notification.route)
        .subscribe(route => void this.navCtrl.navigateForward(route));
    }
  }

  estNouvelle(notification: AppNotification): boolean {
    return !!this.vuesLe && notification.createdAt > this.vuesLe;
  }

  icone(notification: AppNotification): string {
    return (TYPES[notification.type] || TYPES.autre).icone;
  }

  titre(notification: AppNotification): string {
    return notification.titre.replace(EMOJIS, '').replace(/\s{2,}/g, ' ').trim();
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
