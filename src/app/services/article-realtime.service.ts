import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { App } from '@capacitor/app';

export interface CommentaireTempsReel {
  _id?: string;
  utilisateurId: string;
  nom: string;
  prenom: string;
  photo: string | null;
  contenu: string;
  createdAt: string;
  updatedAt?: string;
}

export type ArticleEvent =
  | { type: 'like'; articleId: string; likes: string[] }
  | { type: 'commentaire'; articleId: string; commentaire: CommentaireTempsReel }
  | { type: 'commentaire-modifie'; articleId: string; commentaire: CommentaireTempsReel };

/**
 * Connexion temps réel (Server-Sent Events) aux likes et commentaires.
 * Une seule connexion pour toute l'app, coupée quand l'app passe en arrière-plan.
 */
@Injectable({ providedIn: 'root' })
export class ArticleRealtimeService {

  private readonly url = 'https://flechissons.com/article/events';

  private source?: EventSource;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private dejaConnecte = false;

  private eventsSubject = new Subject<ArticleEvent>();
  private resyncSubject = new Subject<void>();

  /** Like / commentaire (ajouté ou modifié) reçu en direct */
  readonly events$: Observable<ArticleEvent> = this.eventsSubject.asObservable();

  /**
   * Émis après une coupure (réseau, arrière-plan) : des événements ont pu être
   * manqués, les pages doivent recharger leurs données
   */
  readonly resync$: Observable<void> = this.resyncSubject.asObservable();

  constructor(private zone: NgZone) {
    this.connecter();

    App.addListener('pause', () => this.deconnecter());
    App.addListener('resume', () => this.connecter());
  }

  private connecter(): void {
    if (this.source || typeof EventSource === 'undefined') {
      return;
    }
    clearTimeout(this.retryTimer);

    const source = new EventSource(this.url);
    this.source = source;

    source.onopen = () => {
      if (this.dejaConnecte) {
        this.zone.run(() => this.resyncSubject.next());
      }
      this.dejaConnecte = true;
    };

    source.addEventListener('like', e => this.emettre('like', e as MessageEvent));
    source.addEventListener('commentaire', e => this.emettre('commentaire', e as MessageEvent));
    source.addEventListener('commentaire-modifie', e => this.emettre('commentaire-modifie', e as MessageEvent));

    source.onerror = () => {
      // EventSource se reconnecte seul, sauf si la connexion est fermée définitivement
      // (ex. serveur Render en cours de réveil qui répond une erreur)
      if (source.readyState === EventSource.CLOSED) {
        this.source = undefined;
        this.retryTimer = setTimeout(() => this.connecter(), 5000);
      }
    };
  }

  private deconnecter(): void {
    clearTimeout(this.retryTimer);
    this.source?.close();
    this.source = undefined;
  }

  private emettre(type: ArticleEvent['type'], e: MessageEvent): void {
    try {
      const data = JSON.parse(e.data);
      this.zone.run(() => this.eventsSubject.next({ type, ...data }));
    } catch {
      // Message invalide : ignoré
    }
  }
}
