import { Injectable } from '@angular/core';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

export interface Emplacement {
  nom?: string;
  adresse?: string;
  latitude?: number | null;
  longitude?: number | null;
}

const estCoordonnee = (valeur: unknown, max: number): valeur is number =>
  typeof valeur === 'number' && Number.isFinite(valeur) && Math.abs(valeur) <= max;

/**
 * Point d'entrée unique pour ouvrir un emplacement dans une application de cartes.
 *
 * - iOS / iPadOS : choix entre Apple Maps, Google Maps et la copie de l'adresse.
 * - Android / web : ouverture directe de Google Maps.
 */
@Injectable({ providedIn: 'root' })
export class LocalisationService {

  constructor(
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController
  ) {}

  async ouvrirItineraire(lieu: Emplacement): Promise<void> {
    const destination = this.destination(lieu);

    if (!destination) {
      return;
    }

    if (Capacitor.getPlatform() !== 'ios') {
      this.ouvrirApplication(this.urlGoogleMaps(destination));
      return;
    }

    const adresse = lieu.adresse?.trim();

    const feuille = await this.actionSheetCtrl.create({
      header: lieu.nom?.trim() || 'Itinéraire',
      subHeader: adresse,
      cssClass: 'carte-choix-sheet',
      buttons: [
        {
          text: 'Ouvrir avec Apple Maps',
          icon: 'navigate-outline',
          handler: () => this.ouvrirApplication(this.urlAppleMaps(destination))
        },
        {
          text: 'Ouvrir avec Google Maps',
          icon: 'map-outline',
          handler: () => this.ouvrirApplication(this.urlGoogleMaps(destination))
        },
        {
          text: "Copier l'adresse",
          icon: 'copy-outline',
          handler: () => {
            void this.copier(adresse || destination);
          }
        },
        {
          text: 'Annuler',
          role: 'cancel'
        }
      ]
    });

    await feuille.present();
  }

  /** Coordonnées si elles sont valides, sinon adresse encodée pour une URL. */
  destination(lieu: Emplacement): string | null {
    if (estCoordonnee(lieu.latitude, 90) && estCoordonnee(lieu.longitude, 180)) {
      return `${lieu.latitude},${lieu.longitude}`;
    }

    const adresse = lieu.adresse?.trim();
    return adresse ? encodeURIComponent(adresse) : null;
  }

  urlAppleMaps(destination: string): string {
    return `https://maps.apple.com/?daddr=${destination}&dirflg=d`;
  }

  urlGoogleMaps(destination: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  // Capacitor transmet ce window.open à UIApplication.open sur iOS : le système lance
  // l'application de cartes, sans vue web. WKWebView n'accepte cet appel que pendant
  // un geste utilisateur : il doit rester synchrone dans le gestionnaire du bouton.
  private ouvrirApplication(url: string): void {
    window.open(url, '_system');
  }

  private async copier(texte: string): Promise<void> {
    let copie = true;

    try {
      await Clipboard.write({ string: texte });
    } catch (err) {
      console.warn("⚠️ Copie de l'adresse impossible", err);
      copie = false;
    }

    const toast = await this.toastCtrl.create({
      message: copie ? 'Adresse copiée.' : "Impossible de copier l'adresse.",
      duration: 1800,
      position: 'bottom',
      color: copie ? 'success' : 'danger'
    });

    await toast.present();
  }
}
