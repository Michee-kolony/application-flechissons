import { Component, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Subscription, timer } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ContactEglise, Conversation, MessagerieService } from '../../services/messagerie.service';

/**
 * Messagerie — liste des discussions (style WhatsApp, aux couleurs Fléchissons).
 * Le bouton flottant ouvre « Nouvelle discussion » : le pasteur et les responsables.
 */
@Component({
  selector: 'app-messagerie',
  templateUrl: './messagerie.page.html',
  styleUrls: ['./messagerie.page.scss'],
  standalone: false
})
export class MessageriePage implements OnDestroy {

  conversations: Conversation[] = [];
  contacts: ContactEglise[] = [];
  chargement = true;
  erreur = false;
  ouvertureEnCours: string | null = null;
  connecte = false;

  /** Vue « Nouvelle discussion » (choix du contact) */
  choixContact = false;
  recherche = '';
  rechercheOuverte = false;

  private userSub?: Subscription;
  private actualisation?: Subscription;

  constructor(
    private messagerie: MessagerieService,
    private auth: AuthService,
    private navCtrl: NavController
  ) {
    // Connexion depuis la fenêtre de connexion : la page se met à jour seule
    this.userSub = this.auth.user$.subscribe(user => {
      const connecte = !!user && this.auth.isLoggedIn;
      if (connecte !== this.connecte) {
        this.connecte = connecte;
        if (connecte) {
          this.charger();
        }
      }
    });
  }

  ionViewWillEnter(): void {
    this.connecte = this.auth.isLoggedIn;
    if (!this.connecte) {
      this.chargement = false;
      return;
    }
    this.charger();
    // Nouveaux messages pendant que la liste est affichée
    this.actualisation?.unsubscribe();
    this.actualisation = timer(15000, 15000).subscribe(() => {
      if (document.visibilityState !== 'hidden') {
        this.chargerConversations();
      }
    });
  }

  ionViewWillLeave(): void {
    this.actualisation?.unsubscribe();
    this.actualisation = undefined;
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.actualisation?.unsubscribe();
  }

  seConnecter(): void {
    this.auth.openLoginModal();
  }


  // =====================================================
  // CHARGEMENT
  // =====================================================

  charger(event?: CustomEvent): void {
    this.erreur = false;
    let restant = 2;
    const fin = () => {
      restant--;
      if (restant === 0) {
        this.chargement = false;
        (event?.target as HTMLIonRefresherElement | undefined)?.complete();
      }
    };

    this.chargerConversations(fin);

    this.messagerie.contacts().subscribe({
      next: r => { this.contacts = r.contacts; fin(); },
      error: () => { this.erreur = true; fin(); }
    });
  }

  private chargerConversations(fin?: () => void): void {
    this.messagerie.conversations().subscribe({
      next: r => { this.conversations = r.conversations; fin?.(); },
      error: () => { if (fin) { this.erreur = true; fin(); } }
    });
    this.messagerie.rafraichirNonLus();
  }


  // =====================================================
  // RECHERCHE
  // =====================================================

  basculerRecherche(): void {
    this.rechercheOuverte = !this.rechercheOuverte;
    if (!this.rechercheOuverte) {
      this.recherche = '';
    }
  }

  private correspond(...textes: (string | undefined)[]): boolean {
    const r = this.recherche.trim().toLowerCase();
    return !r || textes.some(t => (t || '').toLowerCase().includes(r));
  }

  get conversationsFiltrees(): Conversation[] {
    return this.conversations.filter(c =>
      this.correspond(c.interlocuteur?.nom, c.interlocuteur?.titre, c.dernierMessage?.texte));
  }

  get contactsFiltres(): ContactEglise[] {
    return this.contacts.filter(c => this.correspond(c.nom, c.titre));
  }

  /** Contacts « pasteur » (titre Pasteur) en tête de la liste de choix */
  get pasteurs(): ContactEglise[] {
    return this.contactsFiltres.filter(c => /pasteur/i.test(c.titre));
  }

  get responsables(): ContactEglise[] {
    return this.contactsFiltres.filter(c => !/pasteur/i.test(c.titre));
  }


  // =====================================================
  // NAVIGATION
  // =====================================================

  nouvelleDiscussion(): void {
    this.choixContact = true;
    this.recherche = '';
    this.rechercheOuverte = false;
  }

  retour(): void {
    if (this.choixContact) {
      this.choixContact = false;
      this.recherche = '';
      this.rechercheOuverte = false;
      return;
    }
    void this.navCtrl.navigateBack('/tabs/tab1');
  }

  ouvrirConversation(conversation: Conversation): void {
    void this.navCtrl.navigateForward(['/messagerie', conversation._id], { state: { conversation } });
  }

  ecrireA(contact: ContactEglise): void {
    if (this.ouvertureEnCours) {
      return;
    }
    // Discussion déjà existante : on l'ouvre directement
    const existante = this.conversations.find(c => c.interlocuteur?.id === contact.id);
    if (existante) {
      this.choixContact = false;
      this.ouvrirConversation(existante);
      return;
    }

    this.ouvertureEnCours = contact.id;
    this.messagerie.ouvrir(contact.id).subscribe({
      next: r => {
        this.ouvertureEnCours = null;
        this.choixContact = false;
        this.ouvrirConversation(r.conversation);
      },
      error: () => {
        this.ouvertureEnCours = null;
        this.erreur = true;
      }
    });
  }


  // =====================================================
  // AFFICHAGE
  // =====================================================

  initiales(nom: string | undefined): string {
    return (nom || '?').split(/\s+/).slice(0, 2).map(m => m.charAt(0).toUpperCase()).join('');
  }

  /** Comme WhatsApp : heure aujourd'hui, « Hier », jour de la semaine, puis date */
  heure(date: string | undefined): string {
    if (!date) {
      return '';
    }
    const d = new Date(date);
    const maintenant = new Date();
    const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()).getTime();
    const jours = Math.floor((debutJour - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);

    if (jours <= 0) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (jours === 1) {
      return 'Hier';
    }
    if (jours < 7) {
      const jour = d.toLocaleDateString('fr-FR', { weekday: 'long' });
      return jour.charAt(0).toUpperCase() + jour.slice(1);
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  trackById(_: number, item: { _id?: string; id?: string }): string {
    return item._id || item.id || '';
  }
}
