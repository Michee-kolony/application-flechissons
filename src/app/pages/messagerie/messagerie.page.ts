import { Component, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ContactEglise, Conversation, MessagerieService } from '../../services/messagerie.service';

/**
 * Messagerie : conversations avec le pasteur et les administrateurs,
 * et liste des personnes à qui écrire.
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

  private userSub?: Subscription;

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
    if (this.connecte) {
      this.charger();
    } else {
      this.chargement = false;
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  seConnecter(): void {
    this.auth.openLoginModal();
  }

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

    this.messagerie.conversations().subscribe({
      next: r => { this.conversations = r.conversations; fin(); },
      error: () => { this.erreur = true; fin(); }
    });

    this.messagerie.contacts().subscribe({
      next: r => { this.contacts = r.contacts; fin(); },
      error: () => { this.erreur = true; fin(); }
    });

    this.messagerie.rafraichirNonLus();
  }

  ouvrirConversation(conversation: Conversation): void {
    void this.navCtrl.navigateForward(['/messagerie', conversation._id], { state: { conversation } });
  }

  ecrireA(contact: ContactEglise): void {
    if (this.ouvertureEnCours) {
      return;
    }
    this.ouvertureEnCours = contact.id;
    this.messagerie.ouvrir(contact.id).subscribe({
      next: r => {
        this.ouvertureEnCours = null;
        this.ouvrirConversation(r.conversation);
      },
      error: () => {
        this.ouvertureEnCours = null;
        this.erreur = true;
      }
    });
  }

  initiales(nom: string | undefined): string {
    return (nom || '?').split(/\s+/).slice(0, 2).map(m => m.charAt(0).toUpperCase()).join('');
  }

  heure(date: string | undefined): string {
    if (!date) {
      return '';
    }
    const d = new Date(date);
    if (d.toDateString() === new Date().toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  trackById(_: number, item: { _id?: string; id?: string }): string {
    return item._id || item.id || '';
  }
}
