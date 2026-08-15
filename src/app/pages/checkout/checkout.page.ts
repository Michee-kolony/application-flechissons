import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: false,
})
export class CheckoutPage implements OnInit {

  montantSelectionne = 100;
  montantPersonnalise: number | null = 100;

  montants = [50, 100, 200, 500, 1000];

  // Informations de paiement
  numeroTelephone: string = '';
  numeroCarte: string = '';
  dateExpiration: string = '';
  cvv: string = '';

  moyenSelectionne = 'mpesa';

  constructor(private alertController: AlertController) {}

  ngOnInit(): void {}

  choisirMontant(montant: number) {
    this.montantSelectionne = montant;
    this.montantPersonnalise = montant;
  }

  choisirPaiement(moyen: string) {
    this.moyenSelectionne = moyen;
    // Réinitialiser les champs lors du changement
    this.numeroTelephone = '';
    this.numeroCarte = '';
    this.dateExpiration = '';
    this.cvv = '';
  }

  onMontantPersonnaliseChange(valeur: string) {
    const montant = parseFloat(valeur);
    if (!isNaN(montant) && montant > 0) {
      this.montantSelectionne = montant;
    }
  }

  getNomMoyenPaiement(): string {
    const noms: { [key: string]: string } = {
      'mpesa': 'M-Pesa',
      'orange': 'Orange Money',
      'airtel': 'Airtel Money',
      'mastercard': 'Mastercard'
    };
    return noms[this.moyenSelectionne] || 'Inconnu';
  }

  getIconePaiement(): string {
    const icones: { [key: string]: string } = {
      'mpesa': 'phone-portrait-outline',
      'orange': 'cellular-outline',
      'airtel': 'wifi-outline',
      'mastercard': 'card-outline'
    };
    return icones[this.moyenSelectionne] || 'help-outline';
  }

  formaterNumeroCarte(event: any) {
    let value = event.target.value.replace(/\s/g, '');
    if (value.length > 16) {
      value = value.slice(0, 16);
    }
    // Ajouter des espaces tous les 4 caractères
    const formatted = value.replace(/(.{4})/g, '$1 ').trim();
    this.numeroCarte = formatted;
  }

  formaterDateExpiration(event: any) {
    let value = event.target.value.replace(/\//g, '');
    if (value.length > 4) {
      value = value.slice(0, 4);
    }
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    this.dateExpiration = value;
  }

  async validerDon() {
    // Validation du montant
    if (!this.montantSelectionne || this.montantSelectionne <= 0) {
      await this.afficherAlerte('Montant invalide', 'Veuillez saisir un montant valide.');
      return;
    }

    // Validation selon le moyen de paiement
    if (this.moyenSelectionne === 'mastercard') {
      if (!this.numeroCarte || this.numeroCarte.replace(/\s/g, '').length < 16) {
        await this.afficherAlerte('Carte invalide', 'Veuillez entrer un numéro de carte valide (16 chiffres).');
        return;
      }
      if (!this.dateExpiration || this.dateExpiration.length < 5) {
        await this.afficherAlerte('Date invalide', 'Veuillez entrer une date d\'expiration valide (MM/AA).');
        return;
      }
      if (!this.cvv || this.cvv.length < 3) {
        await this.afficherAlerte('CVV invalide', 'Veuillez entrer un CVV valide (3 ou 4 chiffres).');
        return;
      }
    } else {
      if (!this.numeroTelephone || this.numeroTelephone.length < 9) {
        await this.afficherAlerte('Numéro invalide', 'Veuillez entrer un numéro de téléphone valide (9 chiffres).');
        return;
      }
    }

    // Simulation de traitement
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message: `
        <div style="text-align: left;">
          <p><strong>Montant :</strong> ${this.montantSelectionne} FC</p>
          <p><strong>Moyen de paiement :</strong> ${this.getNomMoyenPaiement()}</p>
          <p><strong>Référence :</strong> DON-${Date.now().toString().slice(-6)}</p>
          <br>
          <p style="color: #f97316;">Merci pour votre générosité ! 🙏</p>
        </div>
      `,
      buttons: [
        {
          text: 'OK',
          handler: () => {
            // Rediriger vers la page de confirmation ou profil
            console.log('Don validé !');
          }
        }
      ],
      cssClass: 'alert-confirmation'
    });

    await alert.present();
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