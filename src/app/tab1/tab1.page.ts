// tab1.page.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Observable, Subscription, forkJoin, interval, map } from 'rxjs';
import Splide from '@splidejs/splide';
import { ArticleEvent, ArticleRealtimeService } from '../services/article-realtime.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { BibleService, VersetDuJour } from '../services/bible';

interface Article {
  _id: string;
  titre: string;
  description: string;
  type: string;
  theme?: string;
  youtube?: string | null;
  images?: string[];
  lien?: string | null;
  likes?: any[];
  commentaires?: any[];
  createdAt: string;
  updatedAt?: string;
}

/** Une page du fil d'actualité (GET /article?type=...&limite=...) */
interface PageArticles {
  articles: Article[];
  suivant: string | null;
}

/** Nombre d'annonces chargées à chaque page du fil */
const TAILLE_PAGE_ANNONCES = 10;

/** En dessous de cette position de défilement, les nouvelles annonces s'insèrent directement */
const SEUIL_HAUT_DE_PAGE = 250;

interface UserData {
  id: string;
  firebaseUid: string;
  email: string;
  nom: string;
  prenom: string;
  photo?: string;
  profilComplete?: boolean;
  derniereConnexion?: string;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, AfterViewInit, OnDestroy {

  private urlArticle =
    'https://flechissons.com/article';

  @ViewChild(IonContent) private content?: IonContent;

  predications: Article[] = [];

  /** Fil d'actualité : annonces déjà chargées, de la plus récente à la plus ancienne */
  annonces: Article[] = [];

  chargementPredications = true;
  chargementAnnonces = true;

  /** Curseur de la page suivante du fil (null : tout est chargé) */
  private curseurAnnonces: string | null = null;

  plusDAnnonces = false;

  /** Échec du chargement de la page suivante : bouton "Réessayer" */
  erreurPlusAnnonces = false;

  /** Chargement relancé à la main ("Réessayer") */
  chargementPlusAnnonces = false;

  /** Échec du premier chargement du fil */
  erreurAnnonces = false;

  /**
   * Annonces publiées pendant que l'utilisateur lit plus bas :
   * proposées via la pastille "Nouvelles publications" au lieu
   * de décaler le fil sous ses yeux
   */
  nouvellesAnnonces: Article[] = [];

  private splide: Splide | null = null;

  /**
   * Rafraîchissement automatique
   */
  private refreshSubscription?: Subscription;

  /**
   * Likes / commentaires en direct
   */
  private realtimeSub = new Subscription();

  /**
   * Permet d'éviter de recréer Splide inutilement
   */
  private vuePrete = false;

  /**
   * La page est affichée (Ionic garde l'onglet en mémoire, caché, quand on en change)
   */
  private pageVisible = false;

  /**
   * Les prédications ont changé pendant que la page était cachée :
   * le carrousel sera reconstruit au retour sur l'onglet
   */
  private splideAReconstruire = false;
  private splideTimer?: ReturnType<typeof setTimeout>;

  /**
   * État du rafraîchissement
   */
  isRefreshing = false;

  /**
   * Données de l'utilisateur connecté
   */
  userData: UserData | null = null;
  userNom: string = '';
  userPhoto: string = '';
  userInitiale: string = '';
  userId: string = '';

  /**
   * Verset du jour (API Bible, un verset différent chaque jour)
   */
  versetDuJour: VersetDuJour | null = null;
  chargementVerset = true;
  erreurVerset = false;
  notificationsNonLues = 0;
  private versetEnCours = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private realtime: ArticleRealtimeService,
    private authService: AuthService,
    private host: ElementRef<HTMLElement>,
    private bibleService: BibleService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Utilisateur connecté, mis à jour en direct (profil modifié, connexion, déconnexion)
    this.realtimeSub.add(this.authService.user$.subscribe(() => this.loadUserData()));

    // Badge de la cloche (notifications pas encore vues)
    this.realtimeSub.add(this.notificationService.nonLues$.subscribe(n => this.notificationsNonLues = n));

    this.chargerArticles();
    this.chargerVersetDuJour();

    /**
     * Actualisation automatique toutes les 30 secondes
     */
    this.refreshSubscription = interval(30000)
      .subscribe(() => {
        // Ne pas rafraîchir si déjà en cours
        if (!this.isRefreshing) {
          this.actualiserArticles();
        }
      });

    this.realtimeSub.add(this.realtime.events$.subscribe(event => this.appliquerEvenement(event)));
    this.realtimeSub.add(this.realtime.resync$.subscribe(() => this.actualiserArticles()));
  }

  /**
   * Met à jour les compteurs d'un article quand quelqu'un like / commente
   */
  private appliquerEvenement(event: ArticleEvent): void {
    const article =
      this.annonces.find(a => a._id === event.articleId) ??
      this.predications.find(a => a._id === event.articleId);
    if (!article) {
      return;
    }

    if (event.type === 'like') {
      article.likes = event.likes;
    } else if (event.type === 'commentaire-modifie') {
      article.commentaires = article.commentaires?.map(c => c._id === event.commentaire._id ? event.commentaire : c);
    } else if (!article.commentaires?.some(c => c._id === event.commentaire._id)) {
      article.commentaires = [...(article.commentaires ?? []), event.commentaire];
    }
  }

  ngAfterViewInit(): void {
    this.vuePrete = true;

    /**
     * Si les données sont déjà disponibles
     */
    if (this.predications.length > 0) {
      this.planifierSplide();
    }
  }

  ionViewDidEnter(): void {
    this.pageVisible = true;

    // L'appli peut rester ouverte après minuit : on passe au verset du nouveau jour
    if (this.versetDuJour && this.versetDuJour.date !== this.dateDuJour()) {
      this.chargerVersetDuJour();
    }

    if (this.splideAReconstruire || (!this.splide && this.predications.length > 0)) {
      this.planifierSplide();
    } else if (this.splide) {
      // Recalcule les tailles (la page était cachée) et relance le défilement
      this.splide.refresh();
      this.splide.Components.Autoplay?.play();
    }
  }

  ionViewWillLeave(): void {
    this.pageVisible = false;
    this.splide?.Components.Autoplay?.pause();
  }

  ngOnDestroy(): void {
    /**
     * Arrêter le rafraîchissement automatique
     */
    this.refreshSubscription?.unsubscribe();
    this.realtimeSub.unsubscribe();
    clearTimeout(this.splideTimer);

    /**
     * Détruire Splide
     */
    if (this.splide) {
      this.splide.destroy();
      this.splide = null;
    }
  }

  /**
   * ========================================================
   * CHARGER LES DONNÉES UTILISATEUR
   * ========================================================
   */

  private loadUserData(): void {
    try {
      this.userData = this.authService.currentUser as UserData | null;

      if (!this.userData) {
        // Déconnecté : on n'affiche plus l'ancien profil
        this.userNom = 'Invité';
        this.userPhoto = '';
        this.userId = '';
        this.calculerInitiale();
      } else {
        // Déterminer le nom à afficher
        if (this.userData.prenom && this.userData.nom) {
          this.userNom = `${this.userData.prenom} ${this.userData.nom}`;
        } else if (this.userData.prenom) {
          this.userNom = this.userData.prenom;
        } else if (this.userData.nom) {
          this.userNom = this.userData.nom;
        } else {
          this.userNom = 'Invité';
        }

        // Récupérer la photo
        this.userPhoto = this.userData.photo || '';
        this.userId = this.userData.id || '';

        // Calculer l'initiale à afficher
        this.calculerInitiale();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
    }
  }

  /**
   * Calcule l'initiale à afficher en fonction du nom/prénom
   */
  private calculerInitiale(): void {
    if (!this.userData) {
      this.userInitiale = '?';
      return;
    }

    const { prenom, nom } = this.userData;

    // Si le prénom existe, prendre la première lettre du prénom
    if (prenom && prenom.length > 0) {
      this.userInitiale = prenom.charAt(0);
      return;
    }

    // Sinon, prendre la première lettre du nom
    if (nom && nom.length > 0) {
      this.userInitiale = nom.charAt(0);
      return;
    }

    // Si rien n'est disponible
    this.userInitiale = '?';
  }

  /**
   * Gestionnaire d'erreur de chargement de la photo
   */
  onPhotoError(): void {
    // En cas d'erreur de chargement de la photo, on la vide
    // pour afficher l'initiale à la place
    this.userPhoto = '';
    this.calculerInitiale();
  }

  /**
   * ========================================================
   * GESTION DES LIKES
   * ========================================================
   */

  /**
   * Annonces dont le like est en cours d'envoi (évite les doubles taps)
   */
  likeEnCours = new Set<string>();

  /**
   * Like / unlike d'une annonce directement depuis l'accueil
   */
  toggleLikeAnnonce(annonce: Article, event: Event): void {
    // La carte entière ouvre l'article : on bloque la navigation
    event.preventDefault();
    event.stopPropagation();

    if (!annonce || this.likeEnCours.has(annonce._id)) {
      return;
    }

    if (!this.authService.requireAuth()) {
      return;
    }

    // Mise à jour immédiate, annulée en cas d'erreur
    const anciensLikes = [...(annonce.likes || [])];
    const wasLiked = this.isAnnonceLiked(annonce);
    annonce.likes = wasLiked
      ? anciensLikes.filter(id => id !== this.userId)
      : [...anciensLikes, this.userId];

    if (!wasLiked) {
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }

    this.likeEnCours.add(annonce._id);

    this.http.put<any>(`${this.urlArticle}/${annonce._id}/like`, { utilisateurId: this.userId })
      .subscribe({
        next: (response) => {
          if (!response?.success) {
            annonce.likes = anciensLikes;
          }
          this.likeEnCours.delete(annonce._id);
        },
        error: (error) => {
          console.error('Erreur like:', error);
          annonce.likes = anciensLikes;
          this.likeEnCours.delete(annonce._id);
        }
      });
  }

  /**
   * Vérifie si l'utilisateur a liké une annonce
   */
  isAnnonceLiked(annonce: Article): boolean {
    if (!this.userId || !annonce || !annonce.likes) {
      return false;
    }

    return annonce.likes.some(id => id === this.userId);
  }

  /**
   * ========================================================
   * NAVIGATION VERS LE PROFIL
   * ========================================================
   */

  /**
   * Ouvre la prédication dans le flux vidéo (onglet Prédications),
   * ou sur sa page article si elle n'a pas de vidéo
   */
  ouvrirPredication(predication: Article): void {
    if (predication.youtube) {
      this.router.navigate(['/tabs/tab3'], { queryParams: { video: predication._id } });
    } else {
      this.router.navigate(['/article', predication._id]);
    }
  }

  /**
   * ========================================================
   * VERSET DU JOUR
   * ========================================================
   */

  chargerVersetDuJour(): void {
    if (this.versetEnCours) {
      return;
    }
    this.versetEnCours = true;
    this.erreurVerset = false;

    // Hors connexion, on garde le dernier verset connu plutôt qu'une erreur
    const dernier = this.bibleService.lireVersetEnCache();
    if (!this.versetDuJour && dernier) {
      this.versetDuJour = dernier;
    }
    this.chargementVerset = !this.versetDuJour;

    this.bibleService.getVersetDuJour().subscribe({
      next: (verset) => {
        this.versetDuJour = verset;
        this.chargementVerset = false;
        this.versetEnCours = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du verset du jour :', error);
        this.chargementVerset = false;
        this.erreurVerset = !this.versetDuJour;
        this.versetEnCours = false;
      }
    });
  }

  private dateDuJour(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async partagerVerset(): Promise<void> {
    if (!this.versetDuJour) {
      return;
    }
    const texte = `« ${this.versetDuJour.texte.replace(/\s*\n\s*/g, ' ')} »\n— ${this.versetDuJour.reference}\n\nVerset du jour sur Fléchissons`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Verset du jour', text: texte });
      } catch {
        // Partage annulé
      }
    } else {
      try {
        await navigator.clipboard.writeText(texte);
      } catch (error) {
        console.error('Impossible de copier le verset :', error);
      }
    }
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goToProfile(): void {
    this.router.navigate(['/tabs/profil']);
  }

  /**
   * ========================================================
   * PULL-TO-REFRESH NATIF
   * ========================================================
   */

  /**
   * Rafraîchissement par tirage : repart de la première page du fil
   */
  handleRefresh(event: any): void {
    this.isRefreshing = true;

    this.loadUserData();
    this.notificationService.rafraichirCompteur();

    forkJoin([this.chargerPredicationsApi(), this.chargerPageAnnonces()])
      .subscribe({
        next: ([predications, page]) => {
          this.appliquerPredications(predications);
          this.remplacerAnnonces(page);
          this.isRefreshing = false;
          event.target.complete();
        },
        error: (error) => {
          // On garde ce qui est déjà affiché
          console.error('❌ Erreur lors du rafraîchissement :', error);
          this.isRefreshing = false;
          event.target.complete();
        }
      });
  }

  /**
   * ========================================================
   * CHARGEMENT INITIAL
   * ========================================================
   */

  chargerArticles(): void {
    this.chargementPredications = true;
    this.chargementAnnonces = true;
    this.erreurAnnonces = false;

    this.chargerPredicationsApi().subscribe({
      next: predications => {
        this.chargementPredications = false;
        this.appliquerPredications(predications);
        // Le carrousel n'existe dans le DOM qu'une fois le chargement terminé
        this.planifierSplide();
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des prédications :', error);
        this.predications = [];
        this.chargementPredications = false;
      }
    });

    this.chargerPageAnnonces().subscribe({
      next: page => {
        this.remplacerAnnonces(page);
        this.chargementAnnonces = false;
      },
      error: (error) => {
        console.error('Erreur lors de la récupération du fil :', error);
        this.annonces = [];
        this.plusDAnnonces = false;
        this.erreurAnnonces = true;
        this.chargementAnnonces = false;
      }
    });
  }

  /**
   * ========================================================
   * ACTUALISATION AUTOMATIQUE (toutes les 30 s, reconnexion)
   * ========================================================
   * Ne recharge que la première page du fil : les pages déjà
   * chargées plus bas restent en place.
   */

  actualiserArticles(): void {
    if (this.isRefreshing) {
      return;
    }

    this.loadUserData();

    // Premier chargement en échec : on retente complètement
    if (this.erreurAnnonces) {
      this.chargerArticles();
      return;
    }

    this.chargerPredicationsApi().subscribe({
      next: predications => this.appliquerPredications(predications),
      error: (error) => console.error('Erreur actualisation prédications :', error)
    });

    this.chargerPageAnnonces().subscribe({
      next: page => void this.fusionnerPremierePage(page),
      // On ne vide PAS le fil si l'actualisation échoue
      error: (error) => console.error('Erreur actualisation du fil :', error)
    });
  }

  /**
   * ========================================================
   * API
   * ========================================================
   */

  private chargerPredicationsApi(): Observable<Article[]> {
    return this.http
      .get<PageArticles>(this.urlArticle, { params: { type: 'predications', limite: 3 } })
      // Filtre aussi côté app : un serveur pas encore à jour ignore les paramètres
      .pipe(map(response => (response?.articles ?? []).filter(a => a.type === 'predications').slice(0, 3)));
  }

  private chargerPageAnnonces(apres?: string): Observable<PageArticles> {
    const params: Record<string, string | number> = { type: 'annonces', limite: TAILLE_PAGE_ANNONCES };
    if (apres) {
      params['apres'] = apres;
    }

    return this.http
      .get<PageArticles>(this.urlArticle, { params })
      .pipe(map(response => ({
        articles: (response?.articles ?? []).filter(a => a.type === 'annonces'),
        suivant: response?.suivant ?? null
      })));
  }

  /**
   * ========================================================
   * PRÉDICATIONS (carrousel)
   * ========================================================
   */

  private appliquerPredications(predications: Article[]): void {
    /**
     * Mêmes prédications, même ordre (cas de l'actualisation toutes les 30 s) :
     * on met juste à jour leurs textes, sans toucher au carrousel.
     * Avant, il était détruit puis recréé à chaque fois, ce qui le faisait sauter.
     */
    const memesPredications =
      predications.length === this.predications.length &&
      predications.every((p, i) => p._id === this.predications[i]._id);

    if (memesPredications) {
      predications.forEach((p, i) => Object.assign(this.predications[i], p));
      return;
    }

    // Splide doit retirer ses clones avant qu'Angular ne modifie les slides
    this.detruireSplide();
    this.predications = predications;
    this.splideAReconstruire = true;

    if (this.vuePrete && !this.chargementPredications) {
      this.planifierSplide();
    }
  }

  /**
   * ========================================================
   * FIL D'ACTUALITÉ
   * ========================================================
   */

  /** Remet le fil à zéro sur une première page fraîche */
  private remplacerAnnonces(page: PageArticles): void {
    this.annonces = page.articles;
    this.curseurAnnonces = page.suivant;
    this.plusDAnnonces = !!page.suivant;
    this.erreurAnnonces = false;
    this.erreurPlusAnnonces = false;
    this.nouvellesAnnonces = [];
  }

  /**
   * Fusionne une première page fraîche dans le fil déjà chargé :
   * - met à jour les annonces existantes (textes, likes, commentaires)
   * - retire celles supprimées entre-temps
   * - ajoute les nouvelles en haut, ou via la pastille si l'utilisateur lit plus bas
   */
  private async fusionnerPremierePage(page: PageArticles): Promise<void> {
    const fraiches = new Map(page.articles.map(a => [a._id, a]));

    // Zone couverte par la page reçue : tout ce qui est au moins aussi récent
    // que sa dernière annonce (tout le fil s'il n'y a pas d'autre page)
    const plusAncienne = page.articles[page.articles.length - 1]?.createdAt;
    const couvert = (a: Article) => !page.suivant || (!!plusAncienne && a.createdAt >= plusAncienne);

    this.annonces = this.annonces
      .filter(a => fraiches.has(a._id) || !couvert(a))
      .map(a => fraiches.has(a._id) ? Object.assign(a, fraiches.get(a._id)) : a);

    this.nouvellesAnnonces = this.nouvellesAnnonces.filter(a => fraiches.has(a._id));

    const dejaConnues = new Set([...this.annonces, ...this.nouvellesAnnonces].map(a => a._id));
    const nouvelles = page.articles.filter(a => !dejaConnues.has(a._id));

    if (!nouvelles.length) {
      return;
    }

    // Fil vide (ex. première annonce publiée) : on repart de la page reçue
    if (!this.annonces.length) {
      this.remplacerAnnonces(page);
      return;
    }

    const scroll = await this.content?.getScrollElement();
    if (!scroll || scroll.scrollTop < SEUIL_HAUT_DE_PAGE) {
      this.annonces = this.trierAnnonces([...nouvelles, ...this.annonces]);
    } else {
      this.nouvellesAnnonces = this.trierAnnonces([...nouvelles, ...this.nouvellesAnnonces]);
    }
  }

  /** Pastille "Nouvelles publications" : insère les annonces et remonte au fil */
  afficherNouvellesAnnonces(): void {
    this.annonces = this.trierAnnonces([...this.nouvellesAnnonces, ...this.annonces]);
    this.nouvellesAnnonces = [];

    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

    const section = this.host.nativeElement.querySelector<HTMLElement>('.section-annonces');
    if (section) {
      void this.content?.scrollToPoint(0, Math.max(0, section.offsetTop - 12), 400);
    }
  }

  private trierAnnonces(annonces: Article[]): Article[] {
    return annonces.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * ========================================================
   * INFINITE SCROLL
   * ========================================================
   */

  chargerPlusAnnonces(event: any): void {
    this.chargerSuiteAnnonces(() => event.target.complete());
  }

  /** Bouton "Réessayer" après un échec : relance tout de suite, sans attendre un défilement */
  reessayerPlusAnnonces(): void {
    this.erreurPlusAnnonces = false;
    this.chargementPlusAnnonces = true;
    this.chargerSuiteAnnonces(() => this.chargementPlusAnnonces = false);
  }

  private chargerSuiteAnnonces(terminer: () => void): void {
    const curseur = this.curseurAnnonces;

    if (!curseur) {
      this.plusDAnnonces = false;
      terminer();
      return;
    }

    this.chargerPageAnnonces(curseur).subscribe({
      next: page => {
        // Le fil a pu être rechargé pendant ce temps (tirage) : page obsolète
        if (this.curseurAnnonces === curseur) {
          const connues = new Set(this.annonces.map(a => a._id));
          this.annonces = [...this.annonces, ...page.articles.filter(a => !connues.has(a._id))];
          this.curseurAnnonces = page.suivant;
          this.plusDAnnonces = !!page.suivant;
        }
        terminer();
      },
      error: (error) => {
        console.error('Erreur chargement de la suite du fil :', error);
        // Plus de déclenchement automatique : l'utilisateur relance avec "Réessayer"
        this.erreurPlusAnnonces = true;
        terminer();
      }
    });
  }

  /**
   * ========================================================
   * SPLIDE
   * ========================================================
   */

  /**
   * Monte le carrousel une fois le DOM à jour, et seulement si la page est affichée :
   * monté dans un onglet caché, Splide mesure des largeurs nulles et s'affiche cassé
   */
  private planifierSplide(): void {
    clearTimeout(this.splideTimer);

    if (!this.pageVisible) {
      this.splideAReconstruire = true;
      return;
    }

    this.splideTimer = setTimeout(() => this.initialiserSplide(), 50);
  }

  private detruireSplide(): void {
    clearTimeout(this.splideTimer);
    if (this.splide) {
      this.splide.destroy(true);
      this.splide = null;
    }
  }

  trackById(_: number, article: Article): string {
    return article._id;
  }

  private initialiserSplide(): void {
    this.detruireSplide();

    if (this.predications.length === 0) {
      return;
    }

    // Recherché dans cette page uniquement (et non dans tout le document)
    const carousel =
      this.host.nativeElement.querySelector<HTMLElement>('#image-carousel');

    if (!carousel || !carousel.offsetWidth) {
      // Pas encore affiché : nouvel essai au prochain retour sur la page
      this.splideAReconstruire = true;
      return;
    }

    this.splideAReconstruire = false;

    // Le mode boucle avec une seule slide fait des sauts : on le désactive
    const plusieurs = this.predications.length > 1;

    this.splide = new Splide(
      carousel,
      {
        type: plusieurs ? 'loop' : 'slide',
        drag: plusieurs,
        autoplay: plusieurs,
        interval: 4000,
        pauseOnHover: true,
        pauseOnFocus: true,
        arrows: false,
        pagination: false,
        focus: 'center',
        perPage: 3,
        gap: '20px',
        breakpoints: {
          1024: {
            perPage: 2,
            gap: '16px'
          },
          640: {
            perPage: 1,
            gap: '12px'
          }
        }
      }
    );

    this.splide.mount();
  }

  /**
   * ========================================================
   * IMAGE
   * ========================================================
   */

  getImage(article: Article): string {
    if (
      article.images &&
      Array.isArray(article.images) &&
      article.images.length > 0 &&
      article.images[0]
    ) {
      return article.images[0];
    }

    return 'assets/images.jpg';
  }

  imageErreur(event: Event): void {
    const image =
      event.target as HTMLImageElement;

    image.src =
      'assets/images.jpg';
  }

  /**
   * ========================================================
   * DATE
   * ========================================================
   */

  formaterDate(date: string): string {
    if (!date) {
      return '';
    }

    const dateArticle =
      new Date(date);

    const maintenant =
      new Date();

    const difference =
      maintenant.getTime() -
      dateArticle.getTime();

    const minutes =
      Math.floor(
        difference /
        (1000 * 60)
      );

    const heures =
      Math.floor(
        difference /
        (1000 * 60 * 60)
      );

    const jours =
      Math.floor(
        difference /
        (1000 * 60 * 60 * 24)
      );

    if (minutes < 1) {
      return 'À l’instant';
    }

    if (minutes < 60) {
      return `Il y a ${minutes} min`;
    }

    if (heures < 24) {
      return `Il y a ${heures} h`;
    }

    if (jours === 1) {
      return 'Hier';
    }

    if (jours < 7) {
      return `Il y a ${jours} jours`;
    }

    return dateArticle.toLocaleDateString(
      'fr-FR',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  }

  /**
   * ========================================================
   * PARTAGER
   * ========================================================
   */

  async partagerAnnonce(
    annonce: Article
  ): Promise<void> {
    const texte =
      `${annonce.titre}\n\n${annonce.description || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: annonce.titre,
          text: texte,
          url:
            annonce.lien ||
            window.location.href
        });
      } catch (error) {
        console.log(
          'Partage annulé',
          error
        );
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          annonce.lien ||
          window.location.href
        );
      } catch (error) {
        console.error(
          'Impossible de copier le lien',
          error
        );
      }
    }
  }
}