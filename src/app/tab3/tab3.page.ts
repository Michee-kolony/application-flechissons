// tab3.page.ts
import {
  AfterViewInit,
  Component,
  ChangeDetectorRef,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AuthService } from '../services/auth.service';
import { ArticleEvent, ArticleRealtimeService } from '../services/article-realtime.service';
import { Subscription } from 'rxjs';

export interface Commentaire {
  _id?: string;
  utilisateurId: string;
  nom: string;
  prenom: string;
  photo: string | null;
  contenu: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Article {
  _id: string;
  titre: string;
  description: string;
  type: string;
  theme?: string;
  youtube: string | null;
  images: string[];
  lien: string | null;
  likes?: string[];
  commentaires?: Commentaire[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

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
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, AfterViewInit, OnDestroy {

  private urlArticle = 'https://flechissons.com/article';

  @ViewChild('feed') feedRef?: ElementRef<HTMLElement>;
  @ViewChildren('slide') slideRefs!: QueryList<ElementRef<HTMLElement>>;

  private readonly cacheKey = 'predications_cache';

  searchText = '';
  showSearch = false;
  isLoading = true;
  errorMessage = '';

  predications: Article[] = [];
  predicationsFiltrees: Article[] = [];

  userData: UserData | null = null;
  userId: string = '';

  // Lecture
  activeIndex = 0;
  isMuted = false;
  isPaused = false;
  feedReady = false;
  expandedDescription: string | null = null;
  likeBurstId: string | null = null;

  // Commentaires
  commentsOpen = false;
  commentsArticle: Article | null = null;
  nouveauCommentaire = '';
  isSendingComment = false;

  private observer?: IntersectionObserver;
  private pageVisible = false;
  private lastTap = 0;
  private tapTimer?: ReturnType<typeof setTimeout>;
  private slidesSub?: { unsubscribe(): void };
  private progressFrame?: number;
  private playTimer?: ReturnType<typeof setTimeout>;
  private realtimeSub = new Subscription();
  private scrollTimer?: ReturnType<typeof setTimeout>;
  private removeScrollListener?: () => void;

  /** Vidéo demandée depuis l'accueil (?video=<id>), en attente d'affichage */
  private videoCible: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private realtime: ArticleRealtimeService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.chargerDepuisCache();
    this.chargerPredications();

    // Likes et commentaires des autres utilisateurs, en direct
    this.realtimeSub.add(this.realtime.events$.subscribe(event => this.appliquerEvenement(event)));
    this.realtimeSub.add(this.realtime.resync$.subscribe(() => this.chargerPredications()));

    // Ouverture directe d'une vidéo depuis l'accueil
    this.realtimeSub.add(this.route.queryParamMap.subscribe(params => {
      const id = params.get('video');
      if (id) {
        this.videoCible = id;
        this.allerVersVideoCible();
      }
    }));
  }

  /**
   * Place le flux sur la vidéo demandée. Reste en attente tant que la liste
   * n'est pas chargée ou que la page n'est pas affichée (hauteur nulle).
   */
  private allerVersVideoCible(): void {
    const feed = this.feedRef?.nativeElement;
    if (!this.videoCible || !feed || !feed.clientHeight) {
      return;
    }

    // La recherche pourrait masquer la vidéo
    if (this.searchText) {
      this.searchText = '';
      this.showSearch = false;
      this.predicationsFiltrees = [...this.predications];
      this.cdr.detectChanges();
    }

    const index = this.predicationsFiltrees.findIndex(a => a._id === this.videoCible);
    if (index === -1) {
      return;
    }

    this.videoCible = null;
    // Retire ?video= de l'URL : un nouveau clic sur la même vidéo fonctionnera
    this.router.navigate([], { relativeTo: this.route, queryParams: { video: null }, replaceUrl: true });

    feed.scrollTop = index * feed.clientHeight;
    this.setActive(index, true);
  }

  ngAfterViewInit() {
    // Les slides sont recréées à chaque chargement / recherche
    this.slidesSub = this.slideRefs.changes.subscribe(() => setTimeout(() => this.observeSlides()));
    this.ecouterFinDeScroll();
  }

  /**
   * Filet de sécurité de l'IntersectionObserver : quand le scroll s'arrête,
   * la vidéo qui occupe l'écran devient la vidéo active (utile après un scroll rapide)
   */
  private ecouterFinDeScroll(): void {
    const feed = this.feedRef?.nativeElement;
    if (!feed) {
      return;
    }
    const onScroll = () => {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        if (!feed.clientHeight) {
          return;
        }
        const index = Math.round(feed.scrollTop / feed.clientHeight);
        if (index !== this.activeIndex && index < this.predicationsFiltrees.length) {
          this.zone.run(() => this.setActive(index));
        }
      }, 120);
    };
    this.zone.runOutsideAngular(() => feed.addEventListener('scroll', onScroll, { passive: true }));
    this.removeScrollListener = () => feed.removeEventListener('scroll', onScroll);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.slidesSub?.unsubscribe();
    this.realtimeSub.unsubscribe();
    this.removeScrollListener?.();
    clearTimeout(this.scrollTimer);
    this.stopProgressLoop();
    clearTimeout(this.playTimer);
    this.pauseAll();
  }

  ionViewDidEnter() {
    this.pageVisible = true;
    this.loadUserData();
    this.allerVersVideoCible();

    // Les lecteurs vidéo ne sont créés qu'une fois la navigation terminée,
    // et on laisse l'écran s'afficher avant de lancer le décodage
    clearTimeout(this.playTimer);
    this.playTimer = setTimeout(() => {
      this.feedReady = true;
      this.cdr.detectChanges();
      this.playActive();
    }, 150);
  }

  ionViewWillLeave() {
    this.pageVisible = false;
    clearTimeout(this.playTimer);
    this.stopProgressLoop();
    this.pauseAll();
  }

  // =====================================================
  // CHARGER LES DONNÉES UTILISATEUR
  // =====================================================

  private loadUserData(): void {
    try {
      const userDataStr = localStorage.getItem('user');
      this.userData = userDataStr ? JSON.parse(userDataStr) : null;
      this.userId = this.userData?.id || '';
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
    }
  }

  goToProfile(): void {
    this.router.navigate(['/tabs/profil']);
  }

  goToLive(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/tabs/live']);
  }

  // =====================================================
  // CHARGER LES PRÉDICATIONS
  // =====================================================

  /**
   * Affiche immédiatement la dernière liste connue, le réseau la rafraîchit ensuite
   */
  private chargerDepuisCache(): void {
    try {
      const cache = localStorage.getItem(this.cacheKey);
      if (cache) {
        this.appliquerPredications(JSON.parse(cache));
        this.isLoading = false;
      }
    } catch {
      localStorage.removeItem(this.cacheKey);
    }
  }

  chargerPredications(): void {
    const hasCache = this.predications.length > 0;
    this.isLoading = !hasCache;
    this.errorMessage = '';

    this.http.get<any>(this.urlArticle).subscribe({
      next: (response) => {
        if (response && response.success && Array.isArray(response.articles)) {
          const liste: Article[] = response.articles
            .filter((article: Article) => article.type?.toLowerCase() === 'predications' && !!article.youtube)
            .sort((a: Article, b: Article) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          this.appliquerPredications(liste);
          setTimeout(() => this.allerVersVideoCible());
          try {
            localStorage.setItem(this.cacheKey, JSON.stringify(liste));
          } catch {
            // Stockage plein : le cache est facultatif
          }
        } else if (!hasCache) {
          this.errorMessage = 'Aucune prédication trouvée';
          this.predications = [];
          this.predicationsFiltrees = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des prédications:', error);
        this.isLoading = false;
        if (!hasCache) {
          this.errorMessage = 'Erreur lors du chargement des prédications';
          this.predications = [];
          this.predicationsFiltrees = [];
        }
      }
    });
  }

  /**
   * Si la liste n'a pas changé (mêmes vidéos, même ordre), on met seulement à jour
   * les likes / commentaires pour ne pas reconstruire le flux ni couper la lecture
   */
  private appliquerPredications(liste: Article[]): void {
    const memesVideos = liste.length === this.predications.length &&
      liste.every((article, i) => article._id === this.predications[i]._id);

    if (memesVideos) {
      liste.forEach((article, i) => Object.assign(this.predications[i], article));
      return;
    }

    this.predications = liste;
    this.rechercher();
  }

  // =====================================================
  // LECTURE AUTOMATIQUE (IntersectionObserver)
  // =====================================================

  private observeSlides(): void {
    this.observer?.disconnect();
    const root = this.feedRef?.nativeElement;
    if (!root) {
      return;
    }

    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const index = Number((entry.target as HTMLElement).dataset['index']);
          this.zone.run(() => this.setActive(index));
        }
      });
    }, { root, threshold: [0.6] });

    this.slideRefs.forEach(slide => this.observer!.observe(slide.nativeElement));

    const index = Math.min(this.activeIndex, Math.max(this.predicationsFiltrees.length - 1, 0));
    root.scrollTop = index * root.clientHeight;
    this.setActive(index, true);
  }

  private setActive(index: number, force = false): void {
    if (index === this.activeIndex && !force) {
      return;
    }
    const previous = this.getVideo(this.activeIndex);
    if (previous) {
      previous.pause();
      previous.currentTime = 0;
    }
    this.activeIndex = index;
    this.isPaused = false;
    this.expandedDescription = null;
    // Crée le <video> de la nouvelle slide avant de le lancer
    this.cdr.detectChanges();
    this.playActive();
  }

  /**
   * Seules la vidéo active et ses voisines ont un vrai lecteur,
   * les autres n'affichent que leur image
   */
  isVideoMounted(index: number): boolean {
    return this.feedReady && Math.abs(index - this.activeIndex) <= 1;
  }

  private getVideo(index: number): HTMLVideoElement | null {
    return this.slideRefs?.get(index)?.nativeElement.querySelector('video') ?? null;
  }

  private playActive(): void {
    const active = this.getVideo(this.activeIndex);

    // Une seule vidéo joue à la fois : toutes les autres sont arrêtées
    this.feedRef?.nativeElement.querySelectorAll('video').forEach(video => {
      if (video !== active) {
        video.pause();
      }
    });

    if (!active || !this.pageVisible || this.isPaused) {
      return;
    }

    active.muted = this.isMuted;
    active.play()
      .then(() => this.pauseSiInactive(active))
      .catch(error => {
        // play() interrompu par un pause() (on a déjà changé de vidéo) : ne rien relancer
        if (error?.name !== 'NotAllowedError' || !this.estVideoActive(active)) {
          return;
        }
        // Le navigateur bloque l'autoplay avec son : on relance en muet
        this.isMuted = true;
        active.muted = true;
        active.play()
          .then(() => this.pauseSiInactive(active))
          .catch(() => {
            if (this.estVideoActive(active)) {
              this.isPaused = true;
            }
          });
      });
    this.startProgressLoop();
  }

  private estVideoActive(video: HTMLVideoElement): boolean {
    return this.pageVisible && !this.isPaused && this.getVideo(this.activeIndex) === video;
  }

  /** La lecture a pu démarrer après qu'on a scrollé ailleurs : on la coupe */
  private pauseSiInactive(video: HTMLVideoElement): void {
    if (!this.estVideoActive(video)) {
      video.pause();
    }
  }

  private pauseAll(): void {
    this.feedRef?.nativeElement.querySelectorAll('video').forEach(video => video.pause());
  }

  // La barre de progression est mise à jour hors d'Angular pour ne pas
  // relancer la détection de changements de toute l'app à chaque image
  private startProgressLoop(): void {
    this.stopProgressLoop();
    this.zone.runOutsideAngular(() => {
      const tick = () => {
        const slide = this.slideRefs?.get(this.activeIndex)?.nativeElement;
        const video = slide?.querySelector('video');
        const bar = slide?.querySelector<HTMLElement>('.reel-progress-bar');
        if (video && bar && video.duration) {
          bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
        }
        this.progressFrame = requestAnimationFrame(tick);
      };
      this.progressFrame = requestAnimationFrame(tick);
    });
  }

  private stopProgressLoop(): void {
    if (this.progressFrame) {
      cancelAnimationFrame(this.progressFrame);
      this.progressFrame = undefined;
    }
  }

  seek(index: number, event: MouseEvent): void {
    event.stopPropagation();
    const video = this.getVideo(index);
    const bar = event.currentTarget as HTMLElement;
    if (!video || !video.duration) {
      return;
    }
    const ratio = (event.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth;
    video.currentTime = Math.min(Math.max(ratio, 0), 1) * video.duration;
  }

  // Simple tap = pause/lecture, double tap = j'aime
  onVideoTap(article: Article, index: number): void {
    const now = Date.now();
    if (now - this.lastTap < 280) {
      clearTimeout(this.tapTimer);
      this.lastTap = 0;
      if (!this.isLiked(article)) {
        this.toggleLike(article);
      } else {
        this.showLikeBurst(article);
      }
      return;
    }
    this.lastTap = now;
    this.tapTimer = setTimeout(() => this.togglePlay(index), 280);
  }

  private togglePlay(index: number): void {
    const video = this.getVideo(index);
    if (!video) {
      return;
    }
    if (video.paused) {
      this.isPaused = false;
      video.play().catch(() => {});
    } else {
      this.isPaused = true;
      video.pause();
    }
  }

  toggleMute(event: Event): void {
    event.stopPropagation();
    this.isMuted = !this.isMuted;
    this.feedRef?.nativeElement.querySelectorAll('video').forEach(video => (video.muted = this.isMuted));
  }

  /** Affiche « Voir plus » quand le titre ou la description dépasse les 2 lignes visibles */
  hasLongText(article: Article): boolean {
    return (article.description?.length ?? 0) > 90 || (article.titre?.length ?? 0) > 60;
  }

  toggleDescription(article: Article, event: Event): void {
    event.stopPropagation();
    this.expandedDescription = this.expandedDescription === article._id ? null : article._id;
  }

  // =====================================================
  // LIKES
  // =====================================================

  isLiked(article: Article): boolean {
    return !!this.userId && !!article.likes?.includes(this.userId);
  }

  toggleLike(article: Article, event?: Event): void {
    event?.stopPropagation();

    if (!this.authService.requireAuth()) {
      return;
    }

    // Mise à jour optimiste
    const wasLiked = this.isLiked(article);
    const previousLikes = [...(article.likes ?? [])];
    article.likes = wasLiked
      ? previousLikes.filter(id => id !== this.userId)
      : [...previousLikes, this.userId];

    if (!wasLiked) {
      this.showLikeBurst(article);
    }

    this.http.put<any>(`${this.urlArticle}/${article._id}/like`, { utilisateurId: this.userId }).subscribe({
      next: (response) => {
        if (!response?.success) {
          article.likes = previousLikes;
        }
      },
      error: (error) => {
        console.error('Erreur like:', error);
        article.likes = previousLikes;
      }
    });
  }

  private showLikeBurst(article: Article): void {
    this.likeBurstId = null;
    setTimeout(() => (this.likeBurstId = article._id), 0);
    setTimeout(() => {
      if (this.likeBurstId === article._id) {
        this.likeBurstId = null;
      }
    }, 800);
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  }

  // =====================================================
  // COMMENTAIRES
  // =====================================================

  openComments(article: Article, event: Event): void {
    event.stopPropagation();
    this.commentsArticle = article;
    this.commentsOpen = true;
  }

  closeComments(): void {
    this.commentsOpen = false;
    this.nouveauCommentaire = '';
  }

  ajouterCommentaire(): void {
    const article = this.commentsArticle;
    const contenu = this.nouveauCommentaire.trim();
    if (!article || !contenu || this.isSendingComment) {
      return;
    }

    if (!this.authService.requireAuth()) {
      return;
    }

    const photo = this.userData?.photo && this.userData.photo !== 'assets/avatar-default.png'
      ? this.userData.photo
      : null;

    const body = {
      utilisateurId: this.userId,
      contenu,
      nom: this.userData?.nom || 'Utilisateur',
      prenom: this.userData?.prenom || '',
      photo
    };

    this.isSendingComment = true;
    this.http.post<any>(`${this.urlArticle}/${article._id}/commentaire`, body).subscribe({
      next: (response) => {
        if (response?.success) {
          const comment: Commentaire = response.commentaire ?? {
            ...body,
            createdAt: new Date().toISOString()
          };
          this.ajouterCommentaireLocal(article, comment);
          this.nouveauCommentaire = '';
        }
        this.isSendingComment = false;
      },
      error: (error) => {
        console.error('Erreur ajout commentaire:', error);
        this.isSendingComment = false;
        alert('Erreur lors de l\'ajout du commentaire');
      }
    });
  }

  /** Ajoute un commentaire s'il n'est pas déjà présent (réponse HTTP + temps réel) */
  private ajouterCommentaireLocal(article: Article, comment: Commentaire): void {
    if (comment._id && article.commentaires?.some(c => c._id === comment._id)) {
      return;
    }
    article.commentaires = [...(article.commentaires ?? []), comment];
  }

  // =====================================================
  // TEMPS RÉEL
  // =====================================================

  private appliquerEvenement(event: ArticleEvent): void {
    const article = this.predications.find(a => a._id === event.articleId);
    if (!article) {
      return;
    }

    if (event.type === 'like') {
      article.likes = event.likes;
    } else {
      this.ajouterCommentaireLocal(article, event.commentaire);
    }
  }

  getInitiale(nom: string, prenom: string): string {
    const source = prenom?.trim() || nom?.trim() || '?';
    return source.charAt(0).toUpperCase();
  }

  getNomComplet(prenom: string, nom: string): string {
    return [prenom?.trim(), nom?.trim()].filter(Boolean).join(' ') || 'Utilisateur';
  }

  // =====================================================
  // PARTAGER
  // =====================================================

  async partagerPredication(article: Article, event: Event): Promise<void> {
    event.stopPropagation();

    const url = window.location.origin + '/article/' + article._id;
    const text = `${article.titre}\n\n${article.description || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: article.titre, text, url });
      } catch (error) {
        console.log('Partage annulé');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papier !');
      } catch (error) {
        console.error('Impossible de copier le lien:', error);
      }
    }
  }

  // =====================================================
  // RECHERCHE
  // =====================================================

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.clearSearch();
    }
  }

  rechercher(): void {
    const search = this.searchText.toLowerCase().trim();

    this.predicationsFiltrees = !search
      ? [...this.predications]
      : this.predications.filter(item =>
          item.titre.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          (item.theme && item.theme.toLowerCase().includes(search))
        );
    this.activeIndex = 0;
  }

  clearSearch(): void {
    if (!this.searchText) {
      return;
    }
    this.searchText = '';
    this.predicationsFiltrees = [...this.predications];
  }

  // =====================================================
  // FORMATAGE
  // =====================================================

  formatCount(value: number | undefined): string {
    const n = value ?? 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
    return String(n);
  }

  getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    if (days < 30) return `${Math.floor(days / 7)} sem`;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getPoster(article: Article): string {
    return article.images?.[0] || '';
  }

  trackById(_: number, article: Article): string {
    return article._id;
  }
}
