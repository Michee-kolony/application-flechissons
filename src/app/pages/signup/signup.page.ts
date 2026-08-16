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

  private apiUrl = 'https://backend-flechissons.onrender.com/user';


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
  // TOAST
  // =====================================================

  showToast = false;

  toastType: 'success' | 'error' = 'success';

  toastMessage = '';

  private toastTimeout: any;


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

    this.showPassword =
      !this.showPassword;

  }


  toggleConfirmPasswordVisibility(): void {

    this.showConfirmPassword =
      !this.showConfirmPassword;

  }


  // =====================================================
  // TOAST
  // =====================================================

  showSuccessToast(message: string): void {

    this.displayToast(
      message,
      'success'
    );

  }


  showErrorToast(message: string): void {

    this.displayToast(
      message,
      'error'
    );

  }


  private displayToast(
    message: string,
    type: 'success' | 'error'
  ): void {

    clearTimeout(
      this.toastTimeout
    );

    this.toastMessage =
      message;

    this.toastType =
      type;

    this.showToast =
      true;

    this.toastTimeout =
      setTimeout(() => {

        this.closeToast();

      }, 3500);

  }


  closeToast(): void {

    this.showToast =
      false;

  }


  // =====================================================
  // ÉTAPE SUIVANTE
  // =====================================================

  nextStep(): void {

    if (this.currentStep === 1) {

      const fullName =
        this.userData.fullName.trim();


      // -----------------------------------------------
      // NOM VIDE
      // -----------------------------------------------

      if (!fullName) {

        this.showErrorToast(
          'Veuillez saisir votre nom complet.'
        );

        return;

      }


      // -----------------------------------------------
      // NOM TROP COURT
      // -----------------------------------------------

      if (fullName.length < 2) {

        this.showErrorToast(
          'Votre nom doit contenir au moins 2 caractères.'
        );

        return;

      }


      // -----------------------------------------------
      // PASSER À L'ÉTAPE 2
      // -----------------------------------------------

      this.currentStep = 2;


      window.scrollTo({

        top: 0,

        behavior: 'smooth'

      });

    }

  }


  // =====================================================
  // ÉTAPE PRÉCÉDENTE
  // =====================================================

  prevStep(): void {

    if (
      this.currentStep > 1 &&
      !this.isLoading
    ) {

      this.currentStep--;


      window.scrollTo({

        top: 0,

        behavior: 'smooth'

      });

    }

  }


  // =====================================================
  // INSCRIPTION
  // =====================================================

  submitForm(): void {

    // -----------------------------------------------
    // ÉVITER DOUBLE CLIC
    // -----------------------------------------------

    if (this.isLoading) {

      return;

    }


    // =================================================
    // NORMALISATION
    // =================================================

    const fullName =
      this.userData.fullName.trim();

    const email =
      this.userData.email
        .trim()
        .toLowerCase();

    const password =
      this.userData.password;

    const confirmPassword =
      this.userData.confirmPassword;


    // =================================================
    // NOM
    // =================================================

    if (!fullName) {

      this.showErrorToast(
        'Veuillez saisir votre nom complet.'
      );

      this.currentStep = 1;

      return;

    }


    if (fullName.length < 2) {

      this.showErrorToast(
        'Votre nom doit contenir au moins 2 caractères.'
      );

      this.currentStep = 1;

      return;

    }


    // =================================================
    // EMAIL
    // =================================================

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


    // =================================================
    // PASSWORD
    // =================================================

    if (!password) {

      this.showErrorToast(
        'Veuillez choisir un mot de passe.'
      );

      return;

    }


    if (password.length < 6) {

      this.showErrorToast(
        'Le mot de passe doit contenir au moins 6 caractères.'
      );

      return;

    }


    // =================================================
    // CONFIRM PASSWORD
    // =================================================

    if (!confirmPassword) {

      this.showErrorToast(
        'Veuillez confirmer votre mot de passe.'
      );

      return;

    }


    if (
      password !==
      confirmPassword
    ) {

      this.showErrorToast(
        'Les mots de passe ne correspondent pas.'
      );

      return;

    }


    // =================================================
    // LOADING
    // =================================================

    this.isLoading = true;


    // =================================================
    // API REGISTER
    // =================================================

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

        console.log(
          '✅ REGISTER RESPONSE :',
          response
        );


        // -----------------------------------------------
        // VÉRIFIER RÉPONSE
        // -----------------------------------------------

        if (!response.success) {

          this.isLoading = false;

          this.showErrorToast(

            response.message ||
            'Impossible de créer votre compte.'

          );

          return;

        }


        // =================================================
        // IMPORTANT :
        // AUCUN localStorage
        // =================================================

        // ❌ PAS DE :
        // localStorage.setItem('token', ...)

        // ❌ PAS DE :
        // localStorage.setItem('user', ...)

        // ❌ PAS DE :
        // localStorage.setItem('userId', ...)


        console.log(
          '🚫 Aucun token ni utilisateur enregistré localement.'
        );


        // =================================================
        // FIN LOADING
        // =================================================

        this.isLoading = false;


        // =================================================
        // TOAST
        // =================================================

        this.showSuccessToast(

          response.message ||
          'Votre compte a été créé avec succès !'

        );


        // =================================================
        // REDIRECTION LOGIN
        // =================================================

        setTimeout(() => {

          this.router.navigate(
            ['/login'],
            {
              state: {
                email: email,
                registered: true
              }
            }
          );

        }, 1000);

      },


      // =================================================
      // ERREUR
      // =================================================

      error: (error) => {

        console.error(
          '❌ REGISTER ERROR :',
          error
        );


        this.isLoading = false;


        // =================================================
        // MESSAGE PAR DÉFAUT
        // =================================================

        let message =
          'Une erreur est survenue. Veuillez réessayer.';


        // =================================================
        // MESSAGE BACKEND
        // =================================================

        if (
          error?.error?.message
        ) {

          message =
            error.error.message;

        }


        // =================================================
        // 409 CONFLICT
        // =================================================

        if (
          error?.status === 409
        ) {

          message =
            error?.error?.message ||
            'Cette adresse e-mail est déjà utilisée.';

        }


        // =================================================
        // 400 BAD REQUEST
        // =================================================

        if (
          error?.status === 400
        ) {

          message =
            error?.error?.message ||
            'Veuillez vérifier les informations saisies.';

        }


        // =================================================
        // SERVEUR INACCESSIBLE
        // =================================================

        if (
          error?.status === 0
        ) {

          message =
            'Impossible de contacter le serveur. Vérifiez votre connexion.';

        }


        // =================================================
        // AFFICHER ERREUR
        // =================================================

        this.showErrorToast(
          message
        );

      }

    });

  }


  // =====================================================
  // VALIDATION EMAIL
  // =====================================================

  private isValidEmail(
    email: string
  ): boolean {

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(
      email
    );

  }

}