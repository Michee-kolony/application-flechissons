import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { ThemeMode, ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

interface User {
  id?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  photo?: string;
  profilComplete?: boolean;
  role?: string;
  sexe?: string;
  telephone?: string;
  ville?: string;
  dateNaissance?: string;
  createdAt?: string;
  updatedAt?: string;
  derniereConnexion?: string;
  preferences?: {
    categories: string[];
    notifications: boolean;
    langue: string;
  };
}

interface Eglise {
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  description?: string;
}

const EGLISE_CACHE_KEY = 'eglise_cache';

// Marqueur en CSS : évite les images par défaut de Leaflet, mal résolues par le build Angular
const ICONE_EGLISE = L.divIcon({
  className: 'eglise-marqueur',
  html: '<span></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 34]
});

@Component({
  selector: 'app-profil',
  templateUrl: './profil.page.html',
  styleUrls: ['./profil.page.scss'],
  standalone: false
})
export class ProfilPage implements OnInit, OnDestroy {

  // =====================================================
  // UTILISATEUR
  // =====================================================

  user: User = {};

  // =====================================================
  // ÉTAT
  // =====================================================

  isLoading = false;

  private userSub?: Subscription;

  // =====================================================
  // ÉGLISE (CARTE + ITINÉRAIRE)
  // =====================================================

  private urlEglise = 'https://flechissons.com/eglise';

  eglise: Eglise | null = this.lireCacheEglise();

  private carte?: L.Map;
  private marqueur?: L.Marker;
  private tuiles?: L.TileLayer;
  private observateurTaille?: ResizeObserver;

  // Affiche un squelette tant que les premières tuiles ne sont pas arrivées
  carteChargee = false;

  // Le conteneur n'existe qu'une fois l'église chargée (*ngIf)
  @ViewChild('carteEglise') set carteEglise(el: ElementRef<HTMLDivElement> | undefined) {
    if (el && !this.carte) {
      this.initialiserCarte(el.nativeElement);
    } else if (!el && this.carte) {
      // Adresse supprimée : le conteneur a disparu, on repartira de zéro
      this.detruireCarte();
    }
  }

  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private router: Router,
    private navCtrl: NavController,
    public themeService: ThemeService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit() {
    // Mis à jour en direct (ex. après modification du profil), sans recharger la page
    this.userSub = this.authService.user$.subscribe(user => {
      this.user = { ...(user as User | null) };
    });
  }

  ionViewWillEnter() {
    this.verifierConnexion();
    // Rechargée à chaque visite : l'admin a pu déplacer l'église
    this.chargerEglise();
  }

  ionViewDidEnter() {
    // La carte a pu être créée pendant la transition, avec une taille nulle
    this.carte?.invalidateSize();
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
    this.detruireCarte();
  }

  // =====================================================
  // ACCÈS RÉSERVÉ AUX UTILISATEURS CONNECTÉS
  // =====================================================

  private verifierConnexion() {
    // Le profil est reserve aux utilisateurs connectes : si ce n'est
    // pas le cas, on affiche la modal de connexion discrete et on
    // renvoie l'utilisateur vers l'accueil (pas de redirection forcee
    // vers /login, l'app reste en libre acces).
    if (!this.authService.isLoggedIn) {
      this.authService.requireAuth();
      this.navCtrl.navigateRoot('/tabs/tab1');
    }
  }

  // =====================================================
  // NOM COMPLET
  // =====================================================

  get fullName(): string {
    const prenom = this.user.prenom?.trim() || '';
    const nom = this.user.nom?.trim() || '';
    const fullName = `${prenom} ${nom}`.trim();
    return fullName || 'Utilisateur';
  }

  // =====================================================
  // INITIAL
  // =====================================================

  get userInitial(): string {
    // On prend la première lettre du prénom ou du nom
    if (this.user.prenom && this.user.prenom.trim()) {
      return this.user.prenom.trim().charAt(0).toUpperCase();
    }
    if (this.user.nom && this.user.nom.trim()) {
      return this.user.nom.trim().charAt(0).toUpperCase();
    }
    // Si l'email est disponible, on prend la première lettre
    if (this.user.email && this.user.email.trim()) {
      return this.user.email.trim().charAt(0).toUpperCase();
    }
    return 'U';
  }

  // =====================================================
  // PHOTO
  // =====================================================

  get hasPhoto(): boolean {
    return !!(this.user.photo && this.user.photo.trim() && this.user.photo.trim() !== '');
  }

  // =====================================================
  // GESTIONNAIRE D'ERREUR PHOTO
  // =====================================================

  onPhotoError(): void {
    console.warn('⚠️ Erreur de chargement de la photo, suppression de la photo');
    this.authService.updateUser({ photo: '' });
  }

  // =====================================================
  // DÉCONNEXION
  // =====================================================

  logout() {
    this.isLoading = true;
    console.log('🔄 Déconnexion en cours...');
    
    // Simuler un délai de déconnexion
    setTimeout(() => {
      // Supprimer la session (prévient toutes les pages)
      this.authService.logout();
      
      this.isLoading = false;
      console.log('✅ Déconnecté avec succès');

      // Retour à l'accueil (l'app reste en libre accès après déconnexion)
      this.navCtrl.navigateRoot('/tabs/tab1');

    }, 1500);
  }

  // =====================================================
  // APPARENCE (MODE CLAIR / SOMBRE)
  // =====================================================

  setThemeMode(mode: ThemeMode) {
    this.themeService.setMode(mode);
  }

  // =====================================================
  // MODIFIER LE PROFIL
  // =====================================================

  editProfile() {
    console.log('✏️ Modifier le profil');
    this.router.navigate(['/editprofil']);
  }

  // =====================================================
  // ÉGLISE
  // =====================================================

  private chargerEglise() {
    this.http.get<{ success: boolean; eglise: Eglise | null }>(this.urlEglise)
      .subscribe({
        next: (res) => {
          this.eglise = res.eglise;
          this.ecrireCacheEglise(res.eglise);
          this.actualiserMarqueur();
        },
        error: (err) => {
          // Hors connexion : on garde la dernière position connue
          console.warn("⚠️ Adresse de l'église indisponible", err);
        }
      });
  }

  private initialiserCarte(conteneur: HTMLDivElement) {
    this.carteChargee = false;

    this.carte = L.map(conteneur, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
      // Un doigt fait défiler la page, pas la carte
      dragging: !L.Browser.mobile
    });

    // Mode sombre : les tuiles sont assombries en CSS (voir profil.page.scss)
    this.tuiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      // Tuiles déjà affichées gardées pendant le chargement des suivantes
      keepBuffer: 4,
      updateWhenIdle: false,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.carte);

    this.tuiles.on('load', () => (this.carteChargee = true));

    this.actualiserMarqueur();

    // La page Ionic peut être en pleine animation (taille nulle) : on recalcule
    // la taille de la carte dès que son conteneur change, au lieu d'attendre un geste
    this.observateurTaille = new ResizeObserver(() => this.carte?.invalidateSize());
    this.observateurTaille.observe(conteneur);
  }

  private detruireCarte() {
    this.observateurTaille?.disconnect();
    this.carte?.remove();
    this.carte = undefined;
    this.marqueur = undefined;
    this.tuiles = undefined;
    this.observateurTaille = undefined;
  }

  private actualiserMarqueur() {
    if (!this.carte || !this.eglise) {
      return;
    }

    const position: L.LatLngTuple = [this.eglise.latitude, this.eglise.longitude];

    if (this.marqueur) {
      this.marqueur.setLatLng(position);
    } else {
      this.marqueur = L.marker(position, { icon: ICONE_EGLISE }).addTo(this.carte);
    }

    this.carte.setView(position, 16);
  }

  // Ouvre Google Maps (application si installée) avec l'itinéraire depuis la position actuelle
  lancerItineraire() {
    if (!this.eglise) {
      return;
    }

    const destination = `${this.eglise.latitude},${this.eglise.longitude}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      '_system'
    );
  }

  private lireCacheEglise(): Eglise | null {
    try {
      return JSON.parse(localStorage.getItem(EGLISE_CACHE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  private ecrireCacheEglise(eglise: Eglise | null) {
    try {
      if (eglise) {
        localStorage.setItem(EGLISE_CACHE_KEY, JSON.stringify(eglise));
      } else {
        localStorage.removeItem(EGLISE_CACHE_KEY);
      }
    } catch {}
  }

  // =====================================================
  // RAFRAÎCHIR LES DONNÉES
  // =====================================================

  refreshData() {
    console.log('🔄 Rafraîchissement des données...');
    this.user = { ...(this.authService.currentUser as User | null) };
    this.chargerEglise();
  }
}