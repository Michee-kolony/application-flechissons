import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { App } from '@capacitor/app';
import { AuthService } from './auth.service';

const API_URL = 'https://flechissons.com/notification';

/** Date (createdAt) de la plus récente notification déjà vue */
const VUES_LE_KEY = 'notifications-vues-le';

export type NotificationType = 'article' | 'audio' | 'live' | 'like' | 'commentaire' | 'paiement' | 'autre';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  titre: string;
  message: string;
  route: string | null;
  image: string | null;
  createdAt: string;
}

export interface PageNotifications {
  notifications: AppNotification[];
  fin: boolean;
}

/**
 * Historique des notifications (page Notifications + badge de la cloche).
 * Visiteur : nouveautés (publications, audios, lives).
 * Connecté : nouveautés + likes, commentaires et paiements le concernant.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {

  private nonLuesSubject = new BehaviorSubject<number>(0);

  /** Nombre de notifications pas encore vues (badge de la cloche) */
  readonly nonLues$: Observable<number> = this.nonLuesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private zone: NgZone,
    authService: AuthService
  ) {
    // Connexion / déconnexion : la liste change (likes, commentaires du compte)
    authService.user$.subscribe(() => this.rafraichirCompteur());

    App.addListener('resume', () => this.zone.run(() => this.rafraichirCompteur()));
  }

  /** Une page de notifications, plus anciennes que "avant" si fourni */
  charger(avant?: string): Observable<PageNotifications> {
    const params: Record<string, string> = avant ? { avant } : {};

    return this.http.get<{ notifications: AppNotification[]; fin: boolean }>(API_URL, { params }).pipe(
      map(response => ({ notifications: response.notifications || [], fin: !!response.fin }))
    );
  }

  /** Recalcule le badge à partir de la première page */
  rafraichirCompteur(): void {
    this.charger().subscribe({
      next: ({ notifications }) => {
        const vuesLe = this.vuesLe;

        // Première ouverture de l'app : on ne signale pas tout l'historique
        if (!vuesLe) {
          this.memoriserVues(notifications);
          this.nonLuesSubject.next(0);
          return;
        }

        this.nonLuesSubject.next(notifications.filter(n => n.createdAt > vuesLe).length);
      },
      error: () => undefined
    });
  }

  /** Date de la dernière notification vue (null si jamais ouverte) */
  get vuesLe(): string | null {
    return localStorage.getItem(VUES_LE_KEY);
  }

  /** Page Notifications ouverte : tout ce qui est affiché est vu */
  marquerCommeVues(notifications: AppNotification[]): void {
    this.memoriserVues(notifications);
    this.nonLuesSubject.next(0);
  }

  private memoriserVues(notifications: AppNotification[]): void {
    const vuesLe = this.vuesLe;
    const plusRecente = notifications[0]?.createdAt;

    if (plusRecente && (!vuesLe || plusRecente > vuesLe)) {
      localStorage.setItem(VUES_LE_KEY, plusRecente);
    } else if (!vuesLe) {
      localStorage.setItem(VUES_LE_KEY, new Date().toISOString());
    }
  }
}
