import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AuthService } from '../../services/auth.service';
import { ArticleEvent, ArticleRealtimeService } from '../../services/article-realtime.service';
import { COMMENTAIRE_MAX, CommentaireService } from '../../services/commentaire.service';
import { Subscription } from 'rxjs';

export interface CommentaireBackend {
  _id?: string;
  utilisateurId: string;
  nom: string;
  prenom: string;
  photo: string;
  contenu: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentaireFront {
  id: string;
  nom: string;
  prenom: string;
  photo: string;
  contenu: string;
  date: string;
  utilisateurId: string;
  modifie: boolean;
}

export interface Article {
  _id: string;
  titre: string;
  description: string;
  type: string;
  theme: string;
  youtube: string | null;
  images: string[];
  lien: string | null;
  likes: string[];
  commentaires: CommentaireBackend[];
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
  selector: 'app-article',
  templateUrl: './article.page.html',
  styleUrls: ['./article.page.scss'],
  standalone: false
})
export class ArticlePage implements OnInit, OnDestroy {

  private urlArticle = 'https://flechissons.com/article';

  article: Article | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  currentImageIndex: number = 0;
  isLiked: boolean = false;
  likeCount: number = 0;
  showLikeBurst: boolean = false;

  userData: UserData | null = null;
  userPhoto: string = '';
  userId: string = '';

  commentaires: CommentaireFront[] = [];
  nouveauCommentaire: string = '';
  @ViewChild('commentInput') commentInput!: ElementRef;

  // Modification d'un commentaire (un seul à la fois)
  readonly commentaireMax = COMMENTAIRE_MAX;
  editionId: string | null = null;
  editionTexte = '';
  editionErreur = '';
  isSavingEdition = false;

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  // Commentaire ouvert depuis une notification (/article/<id>?commentaire=<id>)
  private commentaireCible: string | null = null;
  commentaireSurligne: string | null = null;

  private realtimeSub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private realtime: ArticleRealtimeService,
    private commentaireService: CommentaireService
  ) {}

  ngOnInit() {
    // Utilisateur connecté, mis à jour en direct (profil modifié, connexion, déconnexion)
    this.realtimeSub.add(this.authService.user$.subscribe(() => this.loadUserData()));
    this.commentaireCible = this.route.snapshot.queryParamMap.get('commentaire');
    this.loadArticle();

    // Likes et commentaires des autres utilisateurs, en direct
    this.realtimeSub.add(this.realtime.events$.subscribe(event => this.appliquerEvenement(event)));
    this.realtimeSub.add(this.realtime.resync$.subscribe(() => this.loadArticle(false)));
  }

  ngOnDestroy() {
    this.stopVideo();
    this.realtimeSub.unsubscribe();
  }

  private appliquerEvenement(event: ArticleEvent): void {
    if (!this.article || event.articleId !== this.article._id) {
      return;
    }

    if (event.type === 'like') {
      this.article.likes = event.likes;
      this.likeCount = event.likes.length;
      this.isLiked = !!this.userId && event.likes.includes(this.userId);
    } else if (event.type === 'commentaire-modifie') {
      this.remplacerCommentaireLocal(event.commentaire as CommentaireBackend);
    } else {
      this.ajouterCommentaireLocal(this.versCommentaireFront(event.commentaire as CommentaireBackend));
    }
  }

  private versCommentaireFront(comment: CommentaireBackend): CommentaireFront {
    return {
      id: comment._id || '',
      utilisateurId: comment.utilisateurId,
      nom: comment.nom || 'Utilisateur',
      prenom: comment.prenom || '',
      photo: comment.photo || 'assets/avatar-default.png',
      contenu: comment.contenu,
      date: this.getTimeAgo(comment.createdAt),
      modifie: this.commentaireService.estModifie(comment)
    };
  }

  /** Ajoute un commentaire s'il n'est pas déjà présent (réponse HTTP + temps réel) */
  private ajouterCommentaireLocal(comment: CommentaireFront): void {
    if (comment.id && this.commentaires.some(c => c.id === comment.id)) {
      return;
    }
    this.commentaires.push(comment);
  }

  /** Remplace un commentaire par sa version modifiée (réponse HTTP + temps réel, sans doublon) */
  private remplacerCommentaireLocal(comment: CommentaireBackend): void {
    const index = this.commentaires.findIndex(c => c.id === comment._id);
    if (index !== -1) {
      this.commentaires[index] = this.versCommentaireFront(comment);
    }
  }

  // =====================================================
  // MODIFIER UN COMMENTAIRE
  // =====================================================

  peutModifier(commentaire: CommentaireFront): boolean {
    return !!commentaire.id && this.commentaireService.estAuteur(commentaire, this.userId);
  }

  commencerEdition(commentaire: CommentaireFront): void {
    this.editionId = commentaire.id;
    this.editionTexte = commentaire.contenu;
    this.editionErreur = '';
    this.isSavingEdition = false;

    // Place le curseur à la fin du texte une fois le champ affiché
    setTimeout(() => {
      const champ = document.getElementById('edition-commentaire') as HTMLTextAreaElement | null;
      champ?.focus();
      champ?.setSelectionRange(champ.value.length, champ.value.length);
    });
  }

  annulerEdition(): void {
    if (this.isSavingEdition) {
      return;
    }
    this.editionId = null;
    this.editionTexte = '';
    this.editionErreur = '';
  }

  get editionValide(): boolean {
    const contenu = this.editionTexte.trim();
    return !!contenu && contenu.length <= this.commentaireMax;
  }

  enregistrerEdition(): void {
    if (!this.article || !this.editionId || this.isSavingEdition) {
      return;
    }

    const contenu = this.editionTexte.trim();
    if (!contenu) {
      this.editionErreur = 'Le commentaire ne peut pas être vide.';
      return;
    }
    if (contenu.length > this.commentaireMax) {
      this.editionErreur = `Le commentaire ne peut pas dépasser ${this.commentaireMax} caractères.`;
      return;
    }

    this.isSavingEdition = true;
    this.editionErreur = '';

    this.commentaireService.modifier(this.article._id, this.editionId, this.userId, contenu).subscribe({
      next: (commentaire) => {
        this.remplacerCommentaireLocal(commentaire as CommentaireBackend);
        this.isSavingEdition = false;
        this.annulerEdition();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur modification commentaire:', error);
        this.isSavingEdition = false;
        this.editionErreur = this.commentaireService.messageErreur(error);
      }
    });
  }

  private loadUserData(): void {
    this.userData = this.authService.currentUser as UserData | null;
    this.userPhoto = this.userData?.photo || '';
    this.userId = this.userData?.id || '';
  }

  private stopVideo(): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.src = '';
      video.load();
    }
  }

  /** afficherChargement = false : rechargement discret (après une coupure réseau) */
  loadArticle(afficherChargement = true): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (!id) {
      this.errorMessage = 'ID de l\'article non trouve';
      this.isLoading = false;
      return;
    }

    this.isLoading = afficherChargement;
    
    this.http.get(`${this.urlArticle}/${id}`).subscribe({
      next: (response: any) => {
        console.log('Article recupere:', response);
        
        if (response.success && response.article) {
          this.article = response.article;
          
          if (this.article && this.article.likes) {
            this.likeCount = this.article.likes.length;
            if (this.userId) {
              this.isLiked = this.article.likes.some(id => id === this.userId);
            }
          } else {
            this.likeCount = 0;
          }
          
          if (this.article && this.article.commentaires) {
            this.commentaires = this.article.commentaires.map(comment => this.versCommentaireFront(comment));
          } else {
            this.commentaires = [];
          }

          this.allerAuCommentaireCible();

        } else {
          this.errorMessage = 'Article non trouve';
        }
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Erreur lors du chargement';
      }
    });
  }

  /** Fait défiler jusqu'au commentaire de la notification et le met en évidence */
  private allerAuCommentaireCible(): void {
    const id = this.commentaireCible;
    if (!id || !this.commentaires.some(c => c.id === id)) {
      return;
    }
    this.commentaireCible = null;

    // Laisse Angular afficher la liste avant de défiler
    setTimeout(() => {
      document.getElementById(`commentaire-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.commentaireSurligne = id;
      setTimeout(() => this.commentaireSurligne = null, 3000);
    }, 300);
  }

  // =====================================================
  // INITIALES ET NOMS
  // =====================================================

  /**
   * Récupère l'initiale d'un utilisateur à partir de son prénom et nom
   */
  getInitiale(nom: string, prenom: string): string {
    // Priorité au prénom
    if (prenom && prenom.trim().length > 0) {
      return prenom.trim().charAt(0).toUpperCase();
    }
    
    // Sinon, utiliser le nom
    if (nom && nom.trim().length > 0) {
      return nom.trim().charAt(0).toUpperCase();
    }
    
    // Si rien n'est disponible
    return '?';
  }

  /**
   * Récupère l'initiale de l'utilisateur connecté
   */
  getUserInitiale(): string {
    if (!this.userData) {
      return '?';
    }

    const { prenom, nom } = this.userData;

    // Priorité au prénom
    if (prenom && prenom.trim().length > 0) {
      return prenom.trim().charAt(0).toUpperCase();
    }
    
    // Sinon, utiliser le nom
    if (nom && nom.trim().length > 0) {
      return nom.trim().charAt(0).toUpperCase();
    }
    
    // Si rien n'est disponible
    return '?';
  }

  /**
   * Récupère le nom complet d'un utilisateur
   */
  getNomComplet(prenom: string, nom: string): string {
    const prenomTrim = prenom?.trim() || '';
    const nomTrim = nom?.trim() || '';
    
    if (prenomTrim && nomTrim) {
      return `${prenomTrim} ${nomTrim}`;
    }
    
    if (prenomTrim) {
      return prenomTrim;
    }
    
    if (nomTrim) {
      return nomTrim;
    }
    
    return 'Utilisateur';
  }

  // =====================================================
  // AJOUTER UN COMMENTAIRE
  // =====================================================

  ajouterCommentaire(): void {
    if (!this.nouveauCommentaire.trim() || !this.article) {
      return;
    }

    if (!this.authService.requireAuth()) {
      return;
    }

    const url = `${this.urlArticle}/${this.article._id}/commentaire`;
    
    // Déterminer la photo à envoyer (si elle est invalide, on envoie null)
    const photoToSend = (this.userPhoto && this.userPhoto !== 'assets/avatar-default.png') 
      ? this.userPhoto 
      : null;

    const body = {
      utilisateurId: this.userId,
      contenu: this.nouveauCommentaire.trim(),
      nom: this.userData?.nom || 'Utilisateur',
      prenom: this.userData?.prenom || '',
      photo: photoToSend
    };

    console.log('📤 Envoi commentaire:', body);

    this.http.post(url, body).subscribe({
      next: (response: any) => {
        if (response.success) {
          const comment = response.commentaire;
          
          // Déterminer la photo pour l'affichage
          const commentPhoto = comment.photo || 'assets/avatar-default.png';
          
          const newComment: CommentaireFront = {
            id: comment._id || Date.now().toString(),
            utilisateurId: comment.utilisateurId,
            nom: comment.nom || this.userData?.nom || 'Utilisateur',
            prenom: comment.prenom || this.userData?.prenom || '',
            photo: commentPhoto,
            contenu: comment.contenu || this.nouveauCommentaire.trim(),
            date: 'A l\'instant',
            modifie: false
          };
          
          this.ajouterCommentaireLocal(newComment);
          this.nouveauCommentaire = '';
          
          console.log('Commentaire ajoute:', response.message);
        }
      },
      error: (error) => {
        console.error('Erreur ajout commentaire:', error);
        alert('Erreur lors de l\'ajout du commentaire');
      }
    });
  }

  // =====================================================
  // LIKES
  // =====================================================

  toggleLike(): void {
    if (!this.article) {
      return;
    }

    if (!this.authService.requireAuth()) {
      return;
    }

    const url = `${this.urlArticle}/${this.article._id}/like`;
    const body = { utilisateurId: this.userId };
    // Capturé avant l'envoi : l'événement temps réel peut arriver avant la réponse
    const wasLiked = this.isLiked;

    this.http.put(url, body).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.isLiked = !wasLiked;
          this.likeCount = response.likes;

          if (!wasLiked) {
            this.triggerLikeFeedback();
          }

          console.log('Like toggled:', response.message);
        }
      },
      error: (error) => {
        // Aucun changement local avant la réponse : rien à annuler
        console.error('Erreur like:', error);
      }
    });
  }

  private triggerLikeFeedback(): void {
    this.showLikeBurst = false;
    setTimeout(() => this.showLikeBurst = true, 0);
    setTimeout(() => this.showLikeBurst = false, 700);

    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  }

  // =====================================================
  // PARTAGER
  // =====================================================

  partagerArticle(): void {
    const url = window.location.href;
    const text = `${this.article?.titre}\n${this.article?.description}`;
    
    if (navigator.share) {
      navigator.share({
        title: this.article?.titre || 'Article',
        text: text,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Lien copie dans le presse-papier !');
      }).catch(() => {});
    }
  }

  // =====================================================
  // FOCUS COMMENTAIRE
  // =====================================================

  focusComment(): void {
    if (this.commentInput) {
      this.commentInput.nativeElement.focus();
    }
  }

  // =====================================================
  // YOUTUBE
  // =====================================================

  getYoutubeId(url: string | null): string {
    if (!url) return '';
    
    const patterns = [
      /youtu\.be\/([^?&]+)/,
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtube\.com\/embed\/([^?&]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return url;
  }

  getSafeYoutubeUrl(url: string | null): SafeResourceUrl {
    const videoId = this.getYoutubeId(url);
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&rel=0&modestbranding=1`
      );
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  // =====================================================
  // IMAGES
  // =====================================================

  getImageUrl(): string {
    if (this.article && this.article.images && this.article.images.length > 0) {
      return this.article.images[this.currentImageIndex];
    }
    return 'assets/default-image.jpg';
  }

  hasImages(): boolean {
    if (this.article && this.article.images) {
      return this.article.images.length > 0;
    }
    return false;
  }

  getImageCount(): number {
    if (this.article && this.article.images) {
      return this.article.images.length;
    }
    return 0;
  }

  nextImage(): void {
    if (this.article && this.article.images && this.article.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.article.images.length;
    }
  }

  prevImage(): void {
    if (this.article && this.article.images && this.article.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.article.images.length) % this.article.images.length;
    }
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-image.jpg';
  }

  // =====================================================
  // TYPE
  // =====================================================

  isPredication(): boolean {
    if (this.article) {
      return this.article.type === 'predications';
    }
    return false;
  }

  isAnnonce(): boolean {
    if (this.article) {
      return this.article.type === 'annonces';
    }
    return false;
  }

  isExhortation(): boolean {
    if (this.article) {
      return this.article.type === 'exhortations';
    }
    return false;
  }

  getTypeLabel(): string {
    if (!this.article) return '';
    const labels: { [key: string]: string } = {
      'annonces': 'Annonce',
      'predications': 'Predication',
      'exhortations': 'Exhortation'
    };
    return labels[this.article.type] || this.article.type;
  }

  getTypeIcon(): string {
    if (!this.article) return '';
    const icons: { [key: string]: string } = {
      'annonces': 'fa-bullhorn',
      'predications': 'fa-church',
      'exhortations': 'fa-heart'
    };
    return icons[this.article.type] || 'fa-tag';
  }

  getTypeColor(): string {
    if (!this.article) return '';
    const colors: { [key: string]: string } = {
      'annonces': 'bg-blue-500',
      'predications': 'bg-purple-500',
      'exhortations': 'bg-green-500'
    };
    return colors[this.article.type] || 'bg-gray-500';
  }

  // =====================================================
  // FORMATAGE
  // =====================================================

  getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (minutes < 1) return 'A l\'instant';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    if (weeks < 4) return `${weeks} sem`;
    if (months < 12) return `${months} mois`;
    return `${years} an${years > 1 ? 's' : ''}`;
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  goBack(): void {
    this.router.navigate(['/tabs/tab1']);
  }
}