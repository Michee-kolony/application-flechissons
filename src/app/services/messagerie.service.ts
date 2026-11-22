import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, timer } from 'rxjs';
import { AuthService } from './auth.service';

const API_URL = 'https://flechissons.com/messagerie';

/** Pasteur ou administrateur à qui l'utilisateur peut écrire */
export interface ContactEglise {
  id: string;
  nom: string;
  titre: string;
  photo: string;
  bio: string;
}

export interface Conversation {
  _id: string;
  interlocuteur: ContactEglise | null;
  dernierMessage: { texte: string; auteur: 'utilisateur' | 'admin'; date: string } | null;
  nonLus: number;
  updatedAt: string;
}

export interface MessageChat {
  _id: string;
  conversation: string;
  auteur: 'utilisateur' | 'admin';
  texte: string;
  luLe: string | null;
  createdAt: string;
}

export interface PageMessages {
  messages: MessageChat[];
  complet: boolean;
  luParInterlocuteurJusqua: string | null;
}

/**
 * Messagerie privée avec le pasteur et les administrateurs de l'église.
 * Le badge des messages non lus est actualisé toutes les 30 secondes
 * tant que l'utilisateur est connecté.
 */
@Injectable({ providedIn: 'root' })
export class MessagerieService {

  private readonly nonLusSujet = new BehaviorSubject<number>(0);
  readonly nonLus$ = this.nonLusSujet.asObservable();

  private surveillance?: Subscription;

  constructor(private http: HttpClient, private auth: AuthService, private zone: NgZone) {
    // Démarre / arrête l'actualisation du badge selon la connexion
    this.auth.user$.subscribe(user => {
      if (user && this.auth.isLoggedIn) {
        this.demarrer();
      } else {
        this.arreter();
      }
    });

    // Retour dans l'app : badge à jour tout de suite
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.auth.isLoggedIn) {
        this.zone.run(() => this.rafraichirNonLus());
      }
    });
  }

  private demarrer(): void {
    if (this.surveillance) {
      return;
    }
    this.surveillance = timer(0, 30000).subscribe(() => {
      if (document.visibilityState !== 'hidden') {
        this.rafraichirNonLus();
      }
    });
  }

  private arreter(): void {
    this.surveillance?.unsubscribe();
    this.surveillance = undefined;
    this.nonLusSujet.next(0);
  }

  rafraichirNonLus(): void {
    if (!this.auth.isLoggedIn) {
      return;
    }
    this.http.get<{ nonLus: number }>(`${API_URL}/non-lus`).subscribe({
      next: r => this.nonLusSujet.next(r.nonLus || 0),
      error: () => {}
    });
  }

  contacts(): Observable<{ contacts: ContactEglise[] }> {
    return this.http.get<{ contacts: ContactEglise[] }>(`${API_URL}/contacts`);
  }

  conversations(): Observable<{ conversations: Conversation[] }> {
    return this.http.get<{ conversations: Conversation[] }>(`${API_URL}/conversations`);
  }

  ouvrir(adminId: string): Observable<{ conversation: Conversation }> {
    return this.http.post<{ conversation: Conversation }>(`${API_URL}/conversations`, { adminId });
  }

  messages(conversationId: string, options: { avant?: string; apres?: string } = {}): Observable<PageMessages> {
    let params = new HttpParams();
    if (options.avant) {
      params = params.set('avant', options.avant);
    }
    if (options.apres) {
      params = params.set('apres', options.apres);
    }
    return this.http.get<PageMessages>(`${API_URL}/conversations/${conversationId}/messages`, { params });
  }

  envoyer(conversationId: string, texte: string): Observable<{ message: MessageChat }> {
    return this.http.post<{ message: MessageChat }>(`${API_URL}/conversations/${conversationId}/messages`, { texte });
  }
}
