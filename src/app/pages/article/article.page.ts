import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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

  private urlArticle = 'https://backend-flechissons.onrender.com/article';

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

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadArticle();
  }

  ngOnDestroy() {
    this.stopVideo();
  }

  private loadUserData(): void {
    try {
      const userDataStr = localStorage.getItem('user');
      
      if (userDataStr) {
        this.userData = JSON.parse(userDataStr);
        this.userPhoto = this.userData?.photo || '';
        this.userId = this.userData?.id || '';
      }
    } catch (error) {
      console.error('Erreur chargement donnees utilisateur:', error);
    }
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

  loadArticle(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (!id) {
      this.errorMessage = 'ID de l\'article non trouve';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    
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
            this.commentaires = this.article.commentaires.map((comment: CommentaireBackend) => ({
              id: comment._id || '',
              utilisateurId: comment.utilisateurId,
              nom: comment.nom || 'Utilisateur',
              prenom: comment.prenom || '',
              photo: comment.photo || 'assets/avatar-default.png',
              contenu: comment.contenu,
              date: this.getTimeAgo(comment.createdAt)
            }));
          } else {
            this.commentaires = [];
          }

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
    if (!this.nouveauCommentaire.trim() || !this.article || !this.userId) {
      console.warn('Commentaire vide ou utilisateur non connecte');
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
            date: 'A l\'instant'
          };
          
          this.commentaires.push(newComment);
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
    if (!this.article || !this.userId) {
      console.warn('Utilisateur non connecte');
      return;
    }

    const url = `${this.urlArticle}/${this.article._id}/like`;
    const body = { utilisateurId: this.userId };
    
    this.http.put(url, body).subscribe({
      next: (response: any) => {
        if (response.success) {
          const wasLiked = this.isLiked;
          this.isLiked = !this.isLiked;
          this.likeCount = response.likes;

          if (!wasLiked && this.isLiked) {
            this.triggerLikeFeedback();
          }

          console.log('Like toggled:', response.message);
        }
      },
      error: (error) => {
        console.error('Erreur like:', error);
        this.isLiked = !this.isLiked;
        this.likeCount = this.isLiked ? this.likeCount + 1 : this.likeCount - 1;
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