import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController, NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import {
  Devise,
  Operateur,
  Paiement,
  PaiementService,
  TypeContribution
} from '../../services/paiement.service';

type MoyenPaiement = Operateur;

/** formulaire → envoi → attente du code PIN → résultat */
type EtapePaiement = 'formulaire' | 'envoi' | 'attente' | 'reussi' | 'echoue' | 'delai';

// Raccourcis pour l'objet du don
const MOTIFS: { label: string; type: TypeContribution }[] = [
  { label: 'Dîme', type: 'dime' },
  { label: 'Offrande', type: 'offrande' },
  { label: 'Action de grâces', type: 'action_de_graces' },
  { label: 'Mission', type: 'mission' },
  { label: 'Don', type: 'don' }
];

// Vérification du statut pendant que le fidèle valide sur son téléphone
const INTERVALLE_VERIFICATION_MS = 4000;
const DUREE_MAX_ATTENTE_MS = 3 * 60 * 1000;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: false,
})
export class CheckoutPage implements OnInit, OnDestroy {

  devise: Devise = 'USD';

  // Montants proposés pour chaque devise
  private readonly montantsParDevise: Record<Devise, number[]> = {
    USD: [5, 10, 25, 50, 100, 200],
    CDF: [5000, 10000, 25000, 50000, 100000, 200000]
  };

  montants = this.montantsParDevise.USD;

  montantSelectionne = 10;
  montantPersonnalise: number | null = 10;

  // Motif du don (objet obligatoire, description facultative)
  readonly motifs = MOTIFS;
  objet: string = '';
  description: string = '';
  private type: TypeContribution = 'don';

  // Informations de paiement
  numeroTelephone: string = '';

  moyenSelectionne: MoyenPaiement = 'mpesa';

  // Paiement PawaPay en cours
  etape: EtapePaiement = 'formulaire';
  paiement: Paiement | null = null;
  messageEchec = '';
  private verificationTimer: ReturnType<typeof setTimeout> | null = null;
  private debutAttente = 0;
  private requeteStatut?: Subscription;

  constructor(
    private alertController: AlertController,
    private navCtrl: NavController,
    private paiementService: PaiementService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.arreterVerification();
  }

  get enCours(): boolean {
    return this.etape === 'envoi' || this.etape === 'attente';
  }

  choisirMotif(label: string, type: TypeContribution) {
    this.objet = label;
    this.type = type;
  }

  /** Texte libre : le type suit le raccourci s'il correspond, sinon "autre" */
  onObjetChange(valeur: string) {
    const motif = MOTIFS.find(m => m.label.toLowerCase() === valeur.trim().toLowerCase());
    this.type = motif ? motif.type : 'autre';
  }

  choisirDevise(devise: Devise) {
    if (devise === this.devise) {
      return;
    }
    // On garde la même position dans la liste (ex. 2e montant en USD -> 2e montant en CDF)
    const index = this.montants.indexOf(this.montantSelectionne);
    this.devise = devise;
    this.montants = this.montantsParDevise[devise];
    this.choisirMontant(this.montants[index >= 0 ? index : 1]);
  }

  /** "$10.00" en USD, "10 000 FC" en CDF */
  formaterMontant(montant: number | null | undefined, decimales = true): string {
    const valeur = montant ?? 0;
    if (this.devise === 'CDF') {
      return `${Math.round(valeur).toLocaleString('fr-FR')} FC`;
    }
    return '$' + valeur.toLocaleString('en-US', {
      minimumFractionDigits: decimales ? 2 : 0,
      maximumFractionDigits: decimales ? 2 : 0
    });
  }

  choisirMontant(montant: number) {
    this.montantSelectionne = montant;
    this.montantPersonnalise = montant;
  }

  choisirPaiement(moyen: MoyenPaiement) {
    this.moyenSelectionne = moyen;
    // Réinitialiser le numéro lors du changement d'opérateur
    this.numeroTelephone = '';
  }

  onMontantPersonnaliseChange(valeur: string) {
    const montant = parseFloat(valeur);
    if (!isNaN(montant) && montant > 0) {
      this.montantSelectionne = montant;
    }
  }

  getNomMoyenPaiement(): string {
    const noms: Record<MoyenPaiement, string> = {
      'mpesa': 'M-Pesa',
      'orange': 'Orange Money',
      'airtel': 'Airtel Money'
    };
    return noms[this.moyenSelectionne] || 'Inconnu';
  }

  getIconePaiement(): string {
    const icones: Record<MoyenPaiement, string> = {
      'mpesa': 'phone-portrait-outline',
      'orange': 'cellular-outline',
      'airtel': 'wifi-outline'
    };
    return icones[this.moyenSelectionne] || 'help-outline';
  }

  async validerDon() {
    // Validation du montant
    if (!this.montantSelectionne || this.montantSelectionne <= 0) {
      await this.afficherAlerte('Montant invalide', 'Veuillez saisir un montant valide.');
      return;
    }

    // Validation de l'objet
    if (!this.objet.trim()) {
      await this.afficherAlerte('Objet manquant', 'Veuillez indiquer l\'objet de votre don.');
      return;
    }

    // Validation du numéro Mobile Money
    if (!this.numeroTelephone || this.numeroTelephone.length < 9) {
      await this.afficherAlerte('Numéro invalide', 'Veuillez entrer un numéro de téléphone valide (9 chiffres).');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmer votre don',
      message: `
        <div style="text-align: left;">
          <p><strong>Montant :</strong> ${this.formaterMontant(this.montantSelectionne)} (${this.devise})</p>
          <p><strong>Objet :</strong> ${this.echapperHtml(this.objet.trim())}</p>
          <p><strong>Moyen de paiement :</strong> ${this.getNomMoyenPaiement()}</p>
          <p><strong>Numéro :</strong> +243 ${this.echapperHtml(this.numeroTelephone)}</p>
          <br>
          <p>Vous allez recevoir une demande de code PIN sur votre téléphone.</p>
        </div>
      `,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Payer', handler: () => this.lancerPaiement() }
      ],
      cssClass: 'alert-confirmation'
    });

    await alert.present();
  }

  // =====================================================
  // PAIEMENT PAWAPAY
  // =====================================================

  private lancerPaiement() {
    if (this.enCours) {
      return;
    }

    this.etape = 'envoi';
    this.paiement = null;
    this.messageEchec = '';

    const utilisateur = this.authService.currentUser;
    const nom = [utilisateur?.prenom, utilisateur?.nom].filter(Boolean).join(' ');

    this.paiementService.lancer({
      montant: this.montantSelectionne,
      devise: this.devise,
      operateur: this.moyenSelectionne,
      telephone: this.numeroTelephone,
      objet: this.objet.trim(),
      description: this.description.trim(),
      type: this.type,
      nom: nom || undefined
    }).subscribe({
      next: reponse => {
        this.paiement = reponse.paiement;
        this.etape = 'attente';
        this.debutAttente = Date.now();
        this.planifierVerification();
      },
      error: (error: HttpErrorResponse) => {
        this.etape = 'formulaire';
        void this.afficherAlerte('Paiement impossible', this.paiementService.messageErreur(error));
      }
    });
  }

  private planifierVerification() {
    this.arreterVerification();
    this.verificationTimer = setTimeout(() => this.verifierStatut(), INTERVALLE_VERIFICATION_MS);
  }

  private verifierStatut() {
    if (!this.paiement) {
      return;
    }

    this.requeteStatut = this.paiementService.statut(this.paiement.depositId).subscribe({
      next: paiement => {
        this.paiement = paiement;

        if (paiement.statut === 'reussi') {
          this.etape = 'reussi';
        } else if (paiement.statut === 'echoue') {
          this.etape = 'echoue';
          this.messageEchec = paiement.message || 'Le paiement a échoué.';
        } else if (Date.now() - this.debutAttente > DUREE_MAX_ATTENTE_MS) {
          this.etape = 'delai';
        } else {
          this.planifierVerification();
        }
      },
      // Coupure réseau passagère : on réessaie
      error: () => this.planifierVerification()
    });
  }

  private arreterVerification() {
    if (this.verificationTimer) {
      clearTimeout(this.verificationTimer);
      this.verificationTimer = null;
    }
    this.requeteStatut?.unsubscribe();
  }

  /** Délai dépassé : le fidèle peut relancer la vérification */
  verifierANouveau() {
    this.etape = 'attente';
    this.debutAttente = Date.now();
    this.verifierStatut();
  }

  /** Échec : retour au formulaire avec les mêmes informations */
  reessayer() {
    this.arreterVerification();
    this.etape = 'formulaire';
    this.paiement = null;
  }

  /** Fermer l'écran d'attente (le paiement continue côté opérateur) */
  fermerAttente() {
    this.arreterVerification();
    this.etape = 'formulaire';
  }

  terminer() {
    this.arreterVerification();
    this.etape = 'formulaire';
    this.paiement = null;
    this.objet = '';
    this.description = '';
    this.type = 'don';
    void this.navCtrl.back();
  }

  /** Évite d'injecter du HTML saisi par l'utilisateur dans le message de l'alerte */
  private echapperHtml(texte: string): string {
    return texte
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async afficherAlerte(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'alert-error'
    });
    await alert.present();
  }
}
