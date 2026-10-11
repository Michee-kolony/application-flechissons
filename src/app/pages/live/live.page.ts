import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type Plateforme = 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'autre';

interface Live {
  _id: string;
  titre: string;
  plateforme: Plateforme;
  lien: string;
  description: string;
  enDirect: boolean;
  actif: boolean;
  ordre: number;
}

interface LiveResponse {
  success: boolean;
  count: number;
  lives: Live[];
}

interface StylePlateforme {
  label: string;
  icon: string;
  fondIcone: string;
  image: string;
  sousTitre: string;
}

// Apparence de chaque carte selon le réseau (mêmes valeurs que l'enum du modèle Live)
const STYLES_PLATEFORMES: Record<Plateforme, StylePlateforme> = {
  tiktok: {
    label: 'TikTok',
    icon: 'fa-brands fa-tiktok',
    fondIcone: 'bg-white/20',
    image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1200',
    sousTitre: 'Suivez le culte en direct'
  },
  youtube: {
    label: 'YouTube',
    icon: 'fa-brands fa-youtube',
    fondIcone: 'bg-red-600/80',
    image: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=1200',
    sousTitre: 'Prédications et cultes'
  },
  facebook: {
    label: 'Facebook',
    icon: 'fa-brands fa-facebook',
    fondIcone: 'bg-blue-600/80',
    image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200',
    sousTitre: 'Rejoignez notre communauté'
  },
  instagram: {
    label: 'Instagram',
    icon: 'fa-brands fa-instagram',
    fondIcone: 'bg-pink-600/80',
    image: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1200',
    sousTitre: 'Moments et actualités'
  },
  autre: {
    label: 'En ligne',
    icon: 'fa-solid fa-globe',
    fondIcone: 'bg-orange-500/80',
    image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1200',
    sousTitre: 'Rejoignez-nous en ligne'
  }
};

const LIVES_CACHE_KEY = 'lives_cache';

@Component({
  selector: 'app-live',
  templateUrl: './live.page.html',
  styleUrls: ['./live.page.scss'],
  standalone: false
})
export class LivePage implements OnInit {

  private urlLive = 'https://flechissons.com/live';

  lives: Live[] = [];
  loading = false;
  erreur = '';

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit() {
    // Affiche tout de suite les derniers liens connus ; ionViewWillEnter rafraîchit
    this.lives = this.lireCache();
  }

  // Recharge à chaque arrivée sur la page (un live a pu démarrer entre-temps)
  ionViewWillEnter() {
    this.chargerLives();
  }

  chargerLives(event?: CustomEvent) {

    this.loading = !this.lives.length;
    this.erreur = '';

    const terminer = () =>
      (event?.target as HTMLIonRefresherElement | undefined)?.complete();

    this.http.get<LiveResponse>(this.urlLive).subscribe({
      next: (res) => {
        this.lives = res.lives || [];
        this.ecrireCache(this.lives);
        this.loading = false;
        terminer();
      },
      error: () => {
        this.loading = false;
        if (!this.lives.length) {
          this.erreur = 'Impossible de charger les directs. Vérifiez votre connexion.';
        }
        terminer();
      }
    });
  }

  style(live: Live): StylePlateforme {
    return STYLES_PLATEFORMES[live.plateforme] || STYLES_PLATEFORMES.autre;
  }

  // Ouvre le lien hors de l'application (navigateur, ou appli du réseau si installée)
  ouvrirLive(live: Live) {
    window.open(live.lien, '_system');
  }

  trackById(_: number, live: Live) {
    return live._id;
  }

  private lireCache(): Live[] {
    try {
      return JSON.parse(localStorage.getItem(LIVES_CACHE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private ecrireCache(lives: Live[]) {
    try {
      localStorage.setItem(LIVES_CACHE_KEY, JSON.stringify(lives));
    } catch {
      // Stockage plein ou indisponible : le cache est facultatif
    }
  }

}
