import { Component, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, NavController } from '@ionic/angular';
import { Subscription, timer } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ContactEglise, Conversation, MessageChat, MessagerieService } from '../../services/messagerie.service';

/** Fil de discussion avec le pasteur ou un administrateur */
@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
  standalone: false
})
export class ConversationPage {

  @ViewChild(IonContent) content?: IonContent;

  conversationId = '';
  interlocuteur: ContactEglise | null = null;
  messages: MessageChat[] = [];
  chargement = true;
  erreur = '';
  complet = true;
  chargementAnciens = false;
  luJusqua: string | null = null;
  texte = '';
  envoiEnCours = false;
  indisponible = false;

  private actualisation?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private auth: AuthService,
    private messagerie: MessagerieService
  ) {}

  ionViewWillEnter(): void {
    this.conversationId = this.route.snapshot.paramMap.get('id') || '';

    // Ouverte depuis une notification sans être connecté
    if (!this.auth.isLoggedIn) {
      this.auth.openLoginModal();
      void this.navCtrl.navigateRoot('/tabs/tab1');
      return;
    }

    // Infos de l'interlocuteur transmises par la liste, sinon relues sur le serveur
    const etat = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    const transmise: Conversation | undefined = etat?.conversation;
    if (transmise && transmise._id === this.conversationId) {
      this.interlocuteur = transmise.interlocuteur;
      this.indisponible = !transmise.interlocuteur;
    } else {
      this.chargerInterlocuteur();
    }

    this.chargerMessages();
  }

  ionViewWillLeave(): void {
    this.actualisation?.unsubscribe();
    this.actualisation = undefined;
  }

  private chargerInterlocuteur(): void {
    this.messagerie.conversations().subscribe({
      next: r => {
        const c = r.conversations.find(x => x._id === this.conversationId);
        if (c) {
          this.interlocuteur = c.interlocuteur;
          this.indisponible = !c.interlocuteur;
        }
      },
      error: () => {}
    });
  }

  private chargerMessages(): void {
    this.chargement = !this.messages.length;
    this.erreur = '';

    this.messagerie.messages(this.conversationId).subscribe({
      next: page => {
        this.messages = page.messages;
        this.complet = page.complet;
        this.luJusqua = page.luParInterlocuteurJusqua;
        this.chargement = false;
        this.messagerie.rafraichirNonLus();
        this.defilerEnBas(0);

        // Nouveaux messages toutes les 4 secondes tant que la page est ouverte
        this.actualisation?.unsubscribe();
        this.actualisation = timer(4000, 4000).subscribe(() => this.actualiser());
      },
      error: (err: HttpErrorResponse) => {
        this.chargement = false;
        this.erreur = err.status === 404
          ? 'Cette conversation est introuvable.'
          : 'Impossible de charger les messages. Vérifiez votre connexion.';
      }
    });
  }

  private actualiser(): void {
    if (document.visibilityState === 'hidden') {
      return;
    }
    const dernier = this.messages[this.messages.length - 1];

    this.messagerie.messages(this.conversationId, dernier ? { apres: dernier.createdAt } : {}).subscribe({
      next: page => {
        this.luJusqua = page.luParInterlocuteurJusqua;
        const connus = new Set(this.messages.map(m => m._id));
        const nouveaux = page.messages.filter(m => !connus.has(m._id));
        if (nouveaux.length) {
          this.messages = [...this.messages, ...nouveaux];
          this.defilerEnBas();
          this.messagerie.rafraichirNonLus();
        }
      },
      error: () => {}
    });
  }

  chargerAnciens(): void {
    if (this.complet || this.chargementAnciens || !this.messages.length) {
      return;
    }
    this.chargementAnciens = true;

    this.messagerie.messages(this.conversationId, { avant: this.messages[0].createdAt }).subscribe({
      next: page => {
        this.messages = [...page.messages, ...this.messages];
        this.complet = page.complet;
        this.chargementAnciens = false;
      },
      error: () => this.chargementAnciens = false
    });
  }

  envoyer(): void {
    const texte = this.texte.trim();
    if (!texte || this.envoiEnCours || this.indisponible) {
      return;
    }

    this.envoiEnCours = true;
    this.erreur = '';

    this.messagerie.envoyer(this.conversationId, texte).subscribe({
      next: r => {
        this.envoiEnCours = false;
        this.texte = '';
        if (!this.messages.some(m => m._id === r.message._id)) {
          this.messages = [...this.messages, r.message];
        }
        this.defilerEnBas();
      },
      error: (err: HttpErrorResponse) => {
        this.envoiEnCours = false;
        if (err.status === 410) {
          this.indisponible = true;
        }
        this.erreur = err.error?.message || "Le message n'a pas pu être envoyé.";
      }
    });
  }

  estLu(message: MessageChat): boolean {
    return message.auteur === 'utilisateur' && !!this.luJusqua
      && new Date(message.createdAt).getTime() <= new Date(this.luJusqua).getTime();
  }

  nouveauJour(index: number): boolean {
    if (index === 0) {
      return true;
    }
    return new Date(this.messages[index - 1].createdAt).toDateString()
      !== new Date(this.messages[index].createdAt).toDateString();
  }

  libelleJour(date: string): string {
    const d = new Date(date);
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    if (d.toDateString() === new Date().toDateString()) {
      return "Aujourd'hui";
    }
    if (d.toDateString() === hier.toDateString()) {
      return 'Hier';
    }
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  heure(date: string): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  initiales(nom: string | undefined): string {
    return (nom || '?').split(/\s+/).slice(0, 2).map(m => m.charAt(0).toUpperCase()).join('');
  }

  trackById(_: number, item: MessageChat): string {
    return item._id;
  }

  private defilerEnBas(duree = 250): void {
    setTimeout(() => void this.content?.scrollToBottom(duree), 50);
  }
}
