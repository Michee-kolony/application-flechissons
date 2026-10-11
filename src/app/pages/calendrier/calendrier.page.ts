import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatetimeHighlight } from '@ionic/core';

interface Evenement {
  _id: string;
  titre: string;
  date: string;   // "AAAA-MM-JJ"
  heure: string;  // "HH:mm" ou ""
  description: string;
}

const EVENEMENTS_CACHE_KEY = 'evenements_cache';

const ORANGE = '#f97316';

// Date du jour en heure locale, au même format que les évènements
const aujourdhui = (): string => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${jj}`;
};

@Component({
  selector: 'app-calendrier',
  templateUrl: './calendrier.page.html',
  styleUrls: ['./calendrier.page.scss'],
  standalone: false
})
export class CalendrierPage {

  private urlEvenement = 'https://flechissons.com/evenement';

  evenements: Evenement[] = this.lireCache();

  // Jours marqués en orange dans le calendrier
  datesMarquees: DatetimeHighlight[] = this.calculerDatesMarquees();

  dateSelectionnee = aujourdhui();

  loading = this.evenements.length === 0;
  erreur = false;

  constructor(
    private http: HttpClient
  ) { }

  ionViewWillEnter() {
    // Rechargés à chaque visite : l'admin a pu ajouter ou modifier une date
    this.chargerEvenements();
  }

  // =====================================================
  // CHARGEMENT
  // =====================================================

  chargerEvenements(event?: CustomEvent) {
    this.erreur = false;

    this.http.get<{ success: boolean; evenements: Evenement[] }>(this.urlEvenement)
      .subscribe({
        next: (res) => {
          this.evenements = res.evenements || [];
          this.datesMarquees = this.calculerDatesMarquees();
          this.ecrireCache(this.evenements);
          this.loading = false;
          (event?.target as HTMLIonRefresherElement | undefined)?.complete();
        },
        error: (err) => {
          console.warn('⚠️ Évènements indisponibles', err);
          // Hors connexion : on garde les derniers évènements connus
          this.erreur = this.evenements.length === 0;
          this.loading = false;
          (event?.target as HTMLIonRefresherElement | undefined)?.complete();
        }
      });
  }

  private calculerDatesMarquees(): DatetimeHighlight[] {
    // Un seul marquage par jour, même s'il y a plusieurs évènements
    const jours = [...new Set(this.evenements.map(e => e.date))];

    return jours.map(date => ({
      date,
      textColor: '#ffffff',
      backgroundColor: ORANGE
    }));
  }

  // =====================================================
  // SÉLECTION
  // =====================================================

  onChangementDate(event: CustomEvent) {
    const valeur = event.detail.value;
    if (typeof valeur === 'string' && valeur) {
      this.dateSelectionnee = valeur.slice(0, 10);
    }
  }

  // Depuis la liste "Prochains évènements" : le calendrier saute à ce jour
  selectionner(evenement: Evenement) {
    this.dateSelectionnee = evenement.date;
  }

  get evenementsDuJour(): Evenement[] {
    return this.evenements.filter(e => e.date === this.dateSelectionnee);
  }

  get prochainsEvenements(): Evenement[] {
    const jour = aujourdhui();
    return this.evenements
      .filter(e => e.date >= jour)
      .slice(0, 5);
  }

  // =====================================================
  // AFFICHAGE
  // =====================================================

  // "2026-10-11" -> Date locale, sans décalage de fuseau horaire
  private versDate(date: string): Date {
    const [a, m, j] = date.split('-').map(Number);
    return new Date(a, m - 1, j);
  }

  formaterDate(date: string): string {
    const texte = this.versDate(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  jour(date: string): string {
    return date.slice(8, 10);
  }

  mois(date: string): string {
    return this.versDate(date)
      .toLocaleDateString('fr-FR', { month: 'short' })
      .replace('.', '');
  }

  estAujourdhui(date: string): boolean {
    return date === aujourdhui();
  }

  trackById(_: number, evenement: Evenement) {
    return evenement._id;
  }

  // =====================================================
  // CACHE
  // =====================================================

  private lireCache(): Evenement[] {
    try {
      return JSON.parse(localStorage.getItem(EVENEMENTS_CACHE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private ecrireCache(evenements: Evenement[]) {
    try {
      localStorage.setItem(EVENEMENTS_CACHE_KEY, JSON.stringify(evenements));
    } catch {}
  }
}
