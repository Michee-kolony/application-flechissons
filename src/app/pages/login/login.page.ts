import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  // TOAST
  // =====================================================

  showToast = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';

  private toastTimeout: any;

  // =====================================================
  // API
  // =====================================================

  private apiUrl = 'https://backend-flechissons.onrender.com/user';

  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // =====================================================
  // AFFICHER / MASQUER MOT DE PASSE
  // =====================================================

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // =====================================================
  // TOAST SUCCESS
  // =====================================================

  showSuccessToast(message: string): void {
    this.displayToast(message, 'success');
  }

  // =====================================================
  // TOAST ERROR
  // =====================================================

  showErrorToast(message: string): void {
    this.displayToast(message, 'error');
  }

  // =====================================================
  // AFFICHER TOAST
  // =====================================================

  private displayToast(
    message: string,
    type: 'success' | 'error'
  ): void {

    clearTimeout(this.toastTimeout);

    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    this.toastTimeout = setTimeout(() => {
      this.closeToast();
    }, 3500);
  }

  // =====================================================
  // FERMER TOAST
  // =====================================================

  closeToast(): void {
    this.showToast = false;
  }

  // =====================================================
  // CONNEXION
  // =====================================================

  login(): void {

    // ---------------------------------------------------
    // NETTOYAGE
    // ---------------------------------------------------

    const email = this.loginData.email.trim();
    const password = this.loginData.password;

    // ---------------------------------------------------
    // VALIDATION EMAIL
    // ---------------------------------------------------

    if (!email) {
      this.showErrorToast(
        'Veuillez saisir votre adresse e-mail.'
      );
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showErrorToast(
        'Veuillez saisir une adresse e-mail valide.'
      );
      return;
    }

    // ---------------------------------------------------
    // VALIDATION MOT DE PASSE
    // ---------------------------------------------------

    if (!password) {
      this.showErrorToast(
        'Veuillez saisir votre mot de passe.'
      );
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

          this.showErrorToast(
            response.message ||
            'Connexion impossible.'
          );

          return;
        }

        // -----------------------------------------------
        // STOCKER TOKEN
        // -----------------------------------------------

        localStorage.setItem(
          'token',
          response.token
        );

        // -----------------------------------------------
        // STOCKER UTILISATEUR
        // -----------------------------------------------

        localStorage.setItem(
          'user',
          JSON.stringify(response.user)
        );

        // -----------------------------------------------
        // STOCKER ID UTILISATEUR
        // -----------------------------------------------

        localStorage.setItem(
          'userId',
          response.user.id
        );

        // -----------------------------------------------
        // LOGS
        // -----------------------------------------------

        console.log(
          '💾 User enregistré dans localStorage :',
          response.user
        );

        console.log(
          '🔐 Token enregistré dans localStorage'
        );

        console.log(
          '🆔 User ID enregistré :',
          response.user.id
        );

        // -----------------------------------------------
        // ARRÊT LOADING
        // -----------------------------------------------

        this.isLoading = false;

        // -----------------------------------------------
        // TOAST SUCCESS
        // -----------------------------------------------

        this.showSuccessToast(
          response.message ||
          'Connexion réussie !'
        );

        // -----------------------------------------------
        // REDIRECTION
        // /tabs/tab1
        // -----------------------------------------------

        setTimeout(() => {

          this.router.navigateByUrl(
            '/tabs/tab1',
            {
              replaceUrl: true
            }
          );

        }, 1000);
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

        let message =
          'Une erreur est survenue. Veuillez réessayer.';

        // -----------------------------------------------
        // MESSAGE BACKEND
        // -----------------------------------------------

        if (error?.error?.message) {

          message = error.error.message;

        }

        // -----------------------------------------------
        // ERREUR 401
        // -----------------------------------------------

        if (error?.status === 401) {

          message =
            error?.error?.message ||
            'E-mail ou mot de passe incorrect.';

        }

        // -----------------------------------------------
        // SERVEUR INACCESSIBLE
        // -----------------------------------------------

        if (error?.status === 0) {

          message =
            'Impossible de contacter le serveur. Vérifiez votre connexion.';

        }

        // -----------------------------------------------
        // AFFICHER ERREUR
        // -----------------------------------------------

        this.showErrorToast(message);
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

  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  googleLogin(): void {

    this.showErrorToast(
      'La connexion Google sera disponible prochainement.'
    );
  }

}