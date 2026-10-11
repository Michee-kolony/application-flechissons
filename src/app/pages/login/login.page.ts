import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    nom: string;
    email: string;
    prenom: string;
    photo: string;
    sexe: string;
    dateNaissance: string | null;
    telephone: string;
    ville: string;
    preferences: {
      categories: string[];
      notifications: boolean;
      langue: string;
    };
    profilComplete: boolean;
    role: string;
    derniereConnexion: string;
    createdAt: string;
    updatedAt: string;
  };
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {

  // =====================================================
  // FORMULAIRE
  // =====================================================

  loginData = {
    email: '',
    password: ''
  };

  // =====================================================
  // ÉTATS
  // =====================================================

  isLoading = false;
  showPassword = false;

  // =====================================================
  // ERREURS (affichées en rouge sous les champs)
  // =====================================================

  errors = {
    email: '',
    password: ''
  };

  // Erreur qui ne concerne pas un champ précis (serveur, réseau…)
  formError = '';

  // Message après une inscription réussie
  registeredMessage = '';

  // =====================================================
  // API
  // =====================================================

  private apiUrl = 'https://flechissons.com/user';

  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    // Arrivée depuis l'inscription : e-mail pré-rempli
    const state = this.router.getCurrentNavigation()?.extras.state;

    if (state?.['registered']) {
      this.loginData.email = state['email'] || '';
      this.registeredMessage = 'Votre compte a été créé. Connectez-vous pour continuer.';
    }
  }

  // =====================================================
  // AFFICHER / MASQUER MOT DE PASSE
  // =====================================================

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // =====================================================
  // EFFACER L'ERREUR D'UN CHAMP QUAND ON LE MODIFIE
  // =====================================================

  clearError(field: keyof LoginPage['errors']): void {
    this.errors[field] = '';
    this.formError = '';
  }

  // =====================================================
  // CONNEXION
  // =====================================================

  login(): void {

    if (this.isLoading) {
      return;
    }

    // ---------------------------------------------------
    // NETTOYAGE
    // ---------------------------------------------------

    const email = this.loginData.email.trim();
    const password = this.loginData.password;

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    this.formError = '';
    this.errors = {
      email: !email
        ? 'Veuillez saisir votre adresse e-mail.'
        : !this.isValidEmail(email)
          ? 'Veuillez saisir une adresse e-mail valide.'
          : '',
      password: !password
        ? 'Veuillez saisir votre mot de passe.'
        : ''
    };

    if (this.errors.email || this.errors.password) {
      return;
    }

    // ---------------------------------------------------
    // LOADING
    // ---------------------------------------------------

    this.isLoading = true;

    // ---------------------------------------------------
    // API
    // POST /user/login
    // ---------------------------------------------------

    this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      {
        email,
        password
      }
    ).subscribe({

      // =================================================
      // SUCCÈS
      // =================================================

      next: (response) => {

        console.log(
          '✅ LOGIN RESPONSE :',
          response
        );

        // -----------------------------------------------
        // VÉRIFICATION RÉPONSE
        // -----------------------------------------------

        if (
          !response.success ||
          !response.token ||
          !response.user
        ) {

          this.isLoading = false;
          this.formError = response.message || 'Connexion impossible.';
          return;
        }

        // -----------------------------------------------
        // STOCKER TOKEN + UTILISATEUR (prévient toutes les pages)
        // -----------------------------------------------

        this.authService.setSession(
          response.token,
          response.user
        );

        this.isLoading = false;

        // -----------------------------------------------
        // REDIRECTION
        // /tabs/tab1
        // -----------------------------------------------

        this.router.navigateByUrl(
          '/tabs/tab1',
          {
            replaceUrl: true
          }
        );
      },

      // =================================================
      // ERREUR
      // =================================================

      error: (error) => {

        console.error(
          '❌ LOGIN ERROR :',
          error
        );

        this.isLoading = false;

        // -----------------------------------------------
        // IDENTIFIANTS INCORRECTS → sous le mot de passe
        // -----------------------------------------------

        if (error?.status === 401) {
          this.errors.password =
            error?.error?.message ||
            'E-mail ou mot de passe incorrect.';
          return;
        }

        // -----------------------------------------------
        // SERVEUR INACCESSIBLE
        // -----------------------------------------------

        if (error?.status === 0) {
          this.formError =
            'Impossible de contacter le serveur. Vérifiez votre connexion.';
          return;
        }

        this.formError =
          error?.error?.message ||
          'Une erreur est survenue. Veuillez réessayer.';
      }

    });
  }

  // =====================================================
  // VALIDATION EMAIL
  // =====================================================

  private isValidEmail(email: string): boolean {

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
  }
}
