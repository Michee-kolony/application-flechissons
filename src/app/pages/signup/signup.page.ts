import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface RegisterResponse {
  success: boolean;
  message: string;

  // Le backend peut toujours renvoyer le token.
  // Le frontend ne le stocke PAS.
  token?: string;

  user?: {
    id: string;
    nom: string;
    email: string;
    prenom: string;
    photo: string | null;
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
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false
})
export class SignupPage {

  // =====================================================
  // API
  // =====================================================

  private apiUrl = 'https://flechissons.com/user';

  // =====================================================
  // ÉTAPE
  // =====================================================

  currentStep = 1;
  isLoading = false;

  // =====================================================
  // MOT DE PASSE
  // =====================================================

  showPassword = false;
  showConfirmPassword = false;

  // =====================================================
  // DONNÉES UTILISATEUR
  // =====================================================

  userData = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  // =====================================================
  // ERREURS (affichées en rouge sous les champs)
  // =====================================================

  errors = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  // Erreur qui ne concerne pas un champ précis (serveur, réseau…)
  formError = '';

  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // =====================================================
  // PASSWORD VISIBILITY
  // =====================================================

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // =====================================================
  // EFFACER L'ERREUR D'UN CHAMP QUAND ON LE MODIFIE
  // =====================================================

  clearError(field: keyof SignupPage['errors']): void {
    this.errors[field] = '';
    this.formError = '';
  }

  // =====================================================
  // VALIDATIONS
  // =====================================================

  private validateFullName(fullName: string): string {
    if (!fullName) {
      return 'Veuillez saisir votre nom complet.';
    }
    if (fullName.length < 2) {
      return 'Votre nom doit contenir au moins 2 caractères.';
    }
    return '';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // =====================================================
  // ÉTAPE SUIVANTE
  // =====================================================

  nextStep(): void {
    if (this.currentStep !== 1) {
      return;
    }

    this.errors.fullName = this.validateFullName(this.userData.fullName.trim());

    if (this.errors.fullName) {
      return;
    }

    this.currentStep = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =====================================================
  // ÉTAPE PRÉCÉDENTE
  // =====================================================

  prevStep(): void {
    if (this.currentStep > 1 && !this.isLoading) {
      this.currentStep--;
      this.formError = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // =====================================================
  // INSCRIPTION
  // =====================================================

  submitForm(): void {

    // ÉVITER DOUBLE CLIC
    if (this.isLoading) {
      return;
    }

    // ---------------------------------------------------
    // NORMALISATION
    // ---------------------------------------------------

    const fullName = this.userData.fullName.trim();
    const email = this.userData.email.trim().toLowerCase();
    const password = this.userData.password;
    const confirmPassword = this.userData.confirmPassword;

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    this.formError = '';

    this.errors.fullName = this.validateFullName(fullName);

    if (this.errors.fullName) {
      this.currentStep = 1;
      return;
    }

    this.errors.email = !email
      ? 'Veuillez saisir votre adresse e-mail.'
      : !this.isValidEmail(email)
        ? 'Veuillez saisir une adresse e-mail valide.'
        : '';

    this.errors.password = !password
      ? 'Veuillez choisir un mot de passe.'
      : password.length < 6
        ? 'Le mot de passe doit contenir au moins 6 caractères.'
        : '';

    this.errors.confirmPassword = !confirmPassword
      ? 'Veuillez confirmer votre mot de passe.'
      : password && password !== confirmPassword
        ? 'Les mots de passe ne correspondent pas.'
        : '';

    if (this.errors.email || this.errors.password || this.errors.confirmPassword) {
      return;
    }

    // ---------------------------------------------------
    // LOADING
    // ---------------------------------------------------

    this.isLoading = true;

    // ---------------------------------------------------
    // API REGISTER
    // Le token éventuellement renvoyé n'est PAS stocké :
    // l'utilisateur se connecte ensuite sur /login.
    // ---------------------------------------------------

    this.http.post<RegisterResponse>(
      `${this.apiUrl}/register`,
      {
        nom: fullName,
        email: email,
        password: password
      }
    ).subscribe({

      // =================================================
      // SUCCÈS
      // =================================================

      next: (response) => {

        console.log('✅ REGISTER RESPONSE :', response);

        this.isLoading = false;

        if (!response.success) {
          this.formError = response.message || 'Impossible de créer votre compte.';
          return;
        }

        // Redirection vers la connexion, e-mail pré-rempli
        this.router.navigate(
          ['/login'],
          {
            state: {
              email: email,
              registered: true
            }
          }
        );
      },

      // =================================================
      // ERREUR
      // =================================================

      error: (error) => {

        console.error('❌ REGISTER ERROR :', error);

        this.isLoading = false;

        // E-mail déjà utilisé → sous le champ e-mail
        if (error?.status === 409) {
          this.errors.email =
            error?.error?.message ||
            'Cette adresse e-mail est déjà utilisée.';
          return;
        }

        // Serveur inaccessible
        if (error?.status === 0) {
          this.formError =
            'Impossible de contacter le serveur. Vérifiez votre connexion.';
          return;
        }

        if (error?.status === 400) {
          this.formError =
            error?.error?.message ||
            'Veuillez vérifier les informations saisies.';
          return;
        }

        this.formError =
          error?.error?.message ||
          'Une erreur est survenue. Veuillez réessayer.';
      }

    });
  }
}
