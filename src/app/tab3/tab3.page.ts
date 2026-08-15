// tab3.page.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  commentaires?: any[];
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
export class Tab3Page implements OnInit {

  private urlArticle = 'https://backend-flechissons.onrender.com/article';

  searchText = '';
  isLoading = true;
  errorMessage = '';
  isRefreshing = false;

  predications: Article[] = [];
  predicationsFiltrees: Article[] = [];

  skeletonItems = [1, 2, 3, 4, 5];

  userData: UserData | null = null;
  userPhoto: string = '';
  userInitiale: string = '';
  userId: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.chargerPredications();
  }

  // =====================================================
  // CHARGER LES DONNÉES UTILISATEUR
  // =====================================================

  private loadUserData(): void {
    try {
      const userDataStr = localStorage.getItem('user');
      
      if (userDataStr) {
        this.userData = JSON.parse(userDataStr);
        this.userPhoto = this.userData?.photo || '';
        this.userId = this.userData?.id || '';
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

    if (prenom && prenom.length > 0) {
      this.userInitiale = prenom.charAt(0);
      return;
    }

    if (nom && nom.length > 0) {
      this.userInitiale = nom.charAt(0);
      return;
    }

    this.userInitiale = '?';
  }

  /**
   * Gestionnaire d'erreur de chargement de la photo
   */
  onPhotoError(): void {
    this.userPhoto = '';
    this.calculerInitiale();
  }

  // =====================================================
  // NAVIGATION VERS LE PROFIL
  // =====================================================

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  // =====================================================
  // GESTION DES LIKES (lecture seule)
  // =====================================================

  /**
   * Vérifie si l'utilisateur a liké une prédication
   */
  isLiked(article: Article): boolean {
    if (!this.userId || !article || !article.likes) {
      return false;
    }
    
    return article.likes.some(id => id === this.userId);
  }

  // =====================================================
  // PARTAGER
  // =====================================================

  async partagerPredication(article: Article, event: Event): Promise<void> {
    // Empêcher la navigation vers l'article
    event.stopPropagation();
    
    const url = window.location.origin + '/article/' + article._id;
    const text = `${article.titre}\n\n${article.description || ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.titre,
          text: text,
          url: url
        });
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
  // PULL-TO-REFRESH NATIF
  // =====================================================

  handleRefresh(event: any): void {
    console.log('🔄 Rafraîchissement par tirage déclenché');

    this.isRefreshing = true;
    
    this.loadUserData();

    this.http.get<any>(this.urlArticle).subscribe({
      next: (response) => {
        if (response && response.success && Array.isArray(response.articles)) {
          this.predications = response.articles
            .filter((article: Article) => article.type?.toLowerCase() === 'predications')
            .sort((a: Article, b: Article) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

          this.predicationsFiltrees = [...this.predications];
          console.log('✅ Prédications rafraîchies:', this.predications.length);
        } else {
          console.warn('⚠️ Réponse invalide lors du rafraîchissement');
        }

        this.isRefreshing = false;
        event.target.complete();
      },
      error: (error) => {
        console.error('❌ Erreur lors du rafraîchissement:', error);
        this.isRefreshing = false;
        event.target.complete();
      }
    });
  }

  // =====================================================
  // CHARGER LES PRÉDICATIONS
  // =====================================================

  chargerPredications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<any>(this.urlArticle).subscribe({
      next: (response) => {
        console.log('📦 Prédications récupérées:', response);

        if (response && response.success && Array.isArray(response.articles)) {
          this.predications = response.articles
            .filter((article: Article) => article.type?.toLowerCase() === 'predications')
            .sort((a: Article, b: Article) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

          this.predicationsFiltrees = [...this.predications];
          console.log('✅ Prédications chargées:', this.predications.length);
        } else {
          this.errorMessage = 'Aucune prédication trouvée';
          this.predications = [];
          this.predicationsFiltrees = [];
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des prédications:', error);
        this.errorMessage = 'Erreur lors du chargement des prédications';
        this.isLoading = false;
        this.predications = [];
        this.predicationsFiltrees = [];
      }
    });
  }

  // =====================================================
  // RECHERCHE
  // =====================================================

  rechercher(): void {
    const search = this.searchText.toLowerCase().trim();

    if (!search) {
      this.predicationsFiltrees = [...this.predications];
      return;
    }

    this.predicationsFiltrees = this.predications.filter(item =>
      item.titre.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      (item.theme && item.theme.toLowerCase().includes(search))
    );
  }

  clearSearch(): void {
    this.searchText = '';
    this.predicationsFiltrees = [...this.predications];
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

  getImageUrl(article: Article): string {
    if (article.images && article.images.length > 0) {
      return article.images[0];
    }
    return 'assets/images.jpg';
  }

  imageErreur(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.src = 'assets/images.jpg';
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  openArticle(id: string): void {
    this.router.navigate(['/article', id]);
  }
}