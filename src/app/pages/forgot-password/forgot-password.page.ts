import { Component, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

interface ApiResponse {
  success: boolean;
  message: string;
  code?: string;
  retryAfter?: number;
}

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage implements OnDestroy {

  // =====================================================
  // ÉTAPES
  // 1 : e-mail — 2 : code — 3 : nouveau mot de passe
  // =====================================================

  currentStep: 1 | 2 | 3 = 1;

  // =====================================================
  // FORMULAIRE
  // =====================================================

  email = '';
  code = '';
  password = '';
  confirmPassword = '';

  // =====================================================
  // ÉTATS
  // =====================================================

  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  // Message vert (code envoyé)
  notice = '';

  // Délai avant de pouvoir renvoyer un code (secondes)
  resendIn = 0;
  private resendTimer?: ReturnType<typeof setInterval>;

  // =====================================================
  // ERREURS (affichées en rouge sous les champs)
  // =====================================================

  errors = {
    email: '',
    code: '',
    password: '',
    confirmPassword: ''
  };

  // Erreur qui ne concerne pas un champ précis (serveur, réseau…)
  formError = '';

  // =====================================================
  // API
  // =====================================================

  private apiUrl = 'https://flechissons.com/user';

  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.stopResendTimer();
  }

  // =====================================================
  // EFFACER L'ERREUR D'UN CHAMP QUAND ON LE MODIFIE
  // =====================================================

  clearError(field: keyof ForgotPasswordPage['errors']): void {
    this.errors[field] = '';
    this.formError = '';
  }

  // Garde uniquement les chiffres du code
  onCodeChange(value: string | null | undefined): void {
    const digits = (value || '').replace(/\D/g, '').slice(0, 6);
    if (digits !== value) {
      setTimeout(() => this.code = digits);
    }
    this.clearError('code');
  }

  // =====================================================
  // RETOUR À L'ÉTAPE PRÉCÉDENTE
  // =====================================================

  prevStep(): void {
    if (this.isLoading) {
      return;
    }

    this.formError = '';

    if (this.currentStep === 3) {
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      this.currentStep = 1;
      this.code = '';
      this.notice = '';
    }
  }

  // =====================================================
  // ÉTAPE 1 — ENVOYER LE CODE
  // POST /user/forgot-password
  // =====================================================

  sendCode(): void {

    if (this.isLoading) {
      return;
    }

    const email = this.email.trim();

    this.formError = '';
    this.errors.email = !email
      ? 'Veuillez saisir votre adresse e-mail.'
      : !this.isValidEmail(email)
        ? 'Veuillez saisir une adresse e-mail valide.'
        : '';

    if (this.errors.email) {
      return;
    }

    this.isLoading = true;

    this.http.post<ApiResponse>(
      `${this.apiUrl}/forgot-password`,
      { email }
    ).subscribe({

      next: (response) => {
        this.isLoading = false;
        this.email = email;
        this.code = '';
        this.notice = 'Un code vous a été envoyé par e-mail.';
        this.currentStep = 2;
        this.startResendTimer(response.retryAfter || 60);
      },

      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        // Code déjà envoyé il y a moins d'une minute : on passe quand même à l'étape 2
        if (error?.status === 429 && error.error?.code === 'TOO_SOON') {
          this.email = email;
          this.notice = 'Un code vous a déjà été envoyé. Vérifiez votre boîte mail.';
          this.currentStep = 2;
          this.startResendTimer(error.error.retryAfter || 60);
          return;
        }

        if (error?.status === 404) {
          this.errors.email =
            error.error?.message || 'Aucun compte associé à cet e-mail.';
          return;
        }

        this.formError = this.serverMessage(error);
      }

    });
  }

  // =====================================================
  // RENVOYER LE CODE (étape 2)
  // =====================================================

  resendCode(): void {

    if (this.isLoading || this.resendIn > 0) {
      return;
    }

    this.isLoading = true;
    this.formError = '';
    this.errors.code = '';

    this.http.post<ApiResponse>(
      `${this.apiUrl}/forgot-password`,
      { email: this.email }
    ).subscribe({

      next: (response) => {
        this.isLoading = false;
        this.code = '';
        this.notice = 'Un nouveau code vous a été envoyé.';
        this.startResendTimer(response.retryAfter || 60);
      },

      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        if (error?.status === 429 && error.error?.retryAfter) {
          this.startResendTimer(error.error.retryAfter);
        }

        this.formError = this.serverMessage(error);
      }

    });
  }

  // =====================================================
  // ÉTAPE 2 — VÉRIFIER LE CODE
  // POST /user/verify-reset-code
  // =====================================================

  verifyCode(): void {

    if (this.isLoading) {
      return;
    }

    this.formError = '';
    this.errors.code = this.code.length !== 6
      ? 'Le code contient 6 chiffres.'
      : '';

    if (this.errors.code) {
      return;
    }

    this.isLoading = true;

    this.http.post<ApiResponse>(
      `${this.apiUrl}/verify-reset-code`,
      { email: this.email, code: this.code }
    ).subscribe({

      next: () => {
        this.isLoading = false;
        this.notice = '';
        this.currentStep = 3;
      },

      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.handleCodeError(error);
      }

    });
  }

  // =====================================================
  // ÉTAPE 3 — NOUVEAU MOT DE PASSE
  // POST /user/reset-password
  // =====================================================

  resetPassword(): void {

    if (this.isLoading) {
      return;
    }

    this.formError = '';
    this.errors.password = !this.password
      ? 'Veuillez saisir un nouveau mot de passe.'
      : this.password.length < 6
        ? 'Le mot de passe doit contenir au moins 6 caractères.'
        : '';
    this.errors.confirmPassword = !this.confirmPassword
      ? 'Veuillez confirmer le mot de passe.'
      : this.confirmPassword !== this.password
        ? 'Les mots de passe ne correspondent pas.'
        : '';

    if (this.errors.password || this.errors.confirmPassword) {
      return;
    }

    this.isLoading = true;

    this.http.post<ApiResponse>(
      `${this.apiUrl}/reset-password`,
      {
        email: this.email,
        code: this.code,
        password: this.password
      }
    ).subscribe({

      next: () => {
        this.isLoading = false;
        this.stopResendTimer();

        this.router.navigateByUrl('/login', {
          replaceUrl: true,
          state: {
            passwordReset: true,
            email: this.email
          }
        });
      },

      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        const codeError = error.error?.code;

        // Code expiré / invalide entre-temps : retour à l'étape du code
        if (
          codeError === 'CODE_EXPIRED' ||
          codeError === 'CODE_INVALID' ||
          codeError === 'CODE_INCORRECT' ||
          codeError === 'TOO_MANY_ATTEMPTS'
        ) {
          this.currentStep = 2;
          this.handleCodeError(error);
          return;
        }

        if (codeError === 'PASSWORD_TOO_SHORT' || codeError === 'PASSWORD_REQUIRED') {
          this.errors.password = error.error.message;
          return;
        }

        this.formError = this.serverMessage(error);
      }

    });
  }

  // =====================================================
  // OUTILS
  // =====================================================

  private handleCodeError(error: HttpErrorResponse): void {

    const codeError = error.error?.code;

    if (codeError === 'CODE_INCORRECT') {
      this.errors.code = error.error.message;
      return;
    }

    // Code expiré, invalide ou trop d'essais : il faut en redemander un
    if (
      codeError === 'CODE_EXPIRED' ||
      codeError === 'CODE_INVALID' ||
      codeError === 'TOO_MANY_ATTEMPTS'
    ) {
      this.code = '';
      this.notice = '';
      this.errors.code = error.error.message;
      this.stopResendTimer();
      return;
    }

    this.formError = this.serverMessage(error);
  }

  private serverMessage(error: HttpErrorResponse): string {

    if (error?.status === 0) {
      return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    }

    return error?.error?.message ||
      'Une erreur est survenue. Veuillez réessayer.';
  }

  private startResendTimer(seconds: number): void {
    this.stopResendTimer();
    this.resendIn = seconds;

    this.resendTimer = setInterval(() => {
      this.resendIn--;
      if (this.resendIn <= 0) {
        this.stopResendTimer();
      }
    }, 1000);
  }

  private stopResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = undefined;
    }
    this.resendIn = 0;
  }

  private isValidEmail(email: string): boolean {

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
  }
}
