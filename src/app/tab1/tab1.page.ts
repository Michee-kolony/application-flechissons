// tab1.page.ts
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonInfiniteScroll } from '@ionic/angular';
import { Subscription, interval } from 'rxjs';
import Splide from '@splidejs/splide';

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
    'https://backend-flechissons.onrender.com/article';

  articles: Article[] = [];

  predications: Article[] = [];

  annonces: Article[] = [];

  annoncesVisibles: Article[] = [];

  chargementPredications = true;
  chargementAnnonces = true;

  nombreAnnoncesAffichees = 5;

  plusDAnnonces = true;

  private splide: Splide | null = null;

  /**
   * Rafraîchissement automatique
   */
  private refreshSubscription?: Subscription;

  /**
   * Permet d'éviter de recréer Splide inutilement
   */
  private vuePrete = false;

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

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Charger les données de l'utilisateur depuis le localStorage
    this.loadUserData();
    
    this.chargerArticles();

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
  }

  ngAfterViewInit(): void {
    this.vuePrete = true;

    /**
     * Si les données sont déjà disponibles
     */
    if (this.predications.length > 0) {
      setTimeout(() => {
        this.initialiserSplide();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    /**
     * Arrêter le rafraîchissement automatique
     */
    this.refreshSubscription?.unsubscribe();

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
      const userDataStr = localStorage.getItem('user');
      
      if (userDataStr) {
        this.userData = JSON.parse(userDataStr);
        
        // Déterminer le nom à afficher
        if (this.userData) {
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
   * GESTION DES LIKES (lecture seule)
   * ========================================================
   */

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

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * ========================================================
   * PULL-TO-REFRESH NATIF
   * ========================================================
   */

  /**
   * Gestionnaire du rafraîchissement par tirage
   */
  handleRefresh(event: any): void {
    console.log('🔄 Rafraîchissement par tirage déclenché');

    this.isRefreshing = true;

    // Recharger les données utilisateur
    this.loadUserData();

    // Recharger les articles
    this.http.get<any>(this.urlArticle)
      .subscribe({
        next: (response) => {
          if (
            response &&
            response.success &&
            Array.isArray(response.articles)
          ) {
            this.traiterArticles(response.articles);
            console.log('✅ Articles rafraîchis avec succès');
          } else {
            console.warn('⚠️ Réponse invalide lors du rafraîchissement');
          }

          // Terminer le rafraîchissement
          this.isRefreshing = false;
          event.target.complete();

          // Re-initialiser Splide après le rafraîchissement
          setTimeout(() => {
            this.initialiserSplide();
          }, 100);
        },
        error: (error) => {
          console.error('❌ Erreur lors du rafraîchissement :', error);

          // Terminer le rafraîchissement avec erreur
          this.isRefreshing = false;
          event.target.complete();

          // Afficher un toast ou une notification d'erreur
          this.showRefreshError();
        }
      });
  }

  /**
   * Affiche une erreur de rafraîchissement
   */
  private showRefreshError(): void {
    console.warn('⚠️ Impossible de rafraîchir les données');
  }

  /**
   * ========================================================
   * CHARGEMENT INITIAL
   * ========================================================
   */

  chargerArticles(): void {
    this.chargementPredications = true;
    this.chargementAnnonces = true;

    this.http.get<any>(this.urlArticle)
      .subscribe({
        next: (response) => {
          if (
            response &&
            response.success &&
            Array.isArray(response.articles)
          ) {
            this.traiterArticles(response.articles);
          } else {
            this.predications = [];
            this.annonces = [];
            this.annoncesVisibles = [];
          }

          this.chargementPredications = false;
          this.chargementAnnonces = false;

          setTimeout(() => {
            this.initialiserSplide();
          }, 100);
        },
        error: (error) => {
          console.error(
            'Erreur lors de la récupération des articles :',
            error
          );

          this.predications = [];
          this.annonces = [];
          this.annoncesVisibles = [];

          this.chargementPredications = false;
          this.chargementAnnonces = false;
        }
      });
  }

  /**
   * ========================================================
   * ACTUALISATION AUTOMATIQUE
   * ========================================================
   */

  actualiserArticles(): void {
    // Ne pas actualiser si un rafraîchissement est en cours
    if (this.isRefreshing) {
      return;
    }

    // Recharger les données utilisateur
    this.loadUserData();

    this.http.get<any>(this.urlArticle)
      .subscribe({
        next: (response) => {
          if (
            response &&
            response.success &&
            Array.isArray(response.articles)
          ) {
            this.traiterArticles(response.articles);
            console.log('🔄 Actualisation automatique réussie');
          }
        },
        error: (error) => {
          /**
           * On ne vide PAS les données existantes
           * si l'actualisation échoue.
           */
          console.error(
            'Erreur lors de l’actualisation automatique :',
            error
          );
        }
      });
  }

  /**
   * ========================================================
   * TRAITER LES ARTICLES
   * ========================================================
   */

  private traiterArticles(
    articles: Article[]
  ): void {
    this.articles = articles;

    /**
     * ======================================================
     * PRÉDICATIONS
     * ======================================================
     */

    this.predications = [...this.articles]
      .filter(
        article =>
          article.type?.toLowerCase() === 'predications'
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 3);

    /**
     * ======================================================
     * ANNONCES
     * ======================================================
     *
     * Plus récente → plus ancienne
     */

    this.annonces = [...this.articles]
      .filter(
        article =>
          article.type?.toLowerCase() === 'annonces'
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

    /**
     * Remettre à jour l'affichage
     */

    this.mettreAJourAnnoncesVisibles();

    /**
     * Mettre à jour Splide
     */

    if (this.vuePrete) {
      setTimeout(() => {
        this.initialiserSplide();
      }, 50);
    }
  }

  /**
   * ========================================================
   * ANNONCES VISIBLES
   * ========================================================
   */

  private mettreAJourAnnoncesVisibles(): void {
    this.annoncesVisibles =
      this.annonces.slice(
        0,
        this.nombreAnnoncesAffichees
      );

    this.plusDAnnonces =
      this.annoncesVisibles.length <
      this.annonces.length;
  }

  /**
   * ========================================================
   * INFINITE SCROLL
   * ========================================================
   */

  chargerPlusAnnonces(
    event: any
  ): void {
    /**
     * Ajouter 5 annonces
     */

    this.nombreAnnoncesAffichees += 5;

    this.mettreAJourAnnoncesVisibles();

    /**
     * Terminer l'animation Ionic
     */

    setTimeout(() => {
      event.target.complete();
    }, 300);
  }

  /**
   * ========================================================
   * SPLIDE
   * ========================================================
   */

  private initialiserSplide(): void {
    if (this.splide) {
      this.splide.destroy();
      this.splide = null;
    }

    if (this.predications.length === 0) {
      return;
    }

    const carousel =
      document.querySelector('#image-carousel');

    if (!carousel) {
      return;
    }

    this.splide = new Splide(
      '#image-carousel',
      {
        type: 'loop',
        autoplay: true,
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