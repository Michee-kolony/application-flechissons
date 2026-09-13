import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface StoredUser {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  photo?: string;
  [key: string]: unknown;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const USER_ID_KEY = 'userId';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loginModalOpenSubject = new BehaviorSubject<boolean>(false);
  loginModalOpen$ = this.loginModalOpenSubject.asObservable();

  get isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  get currentUserId(): string {
    return localStorage.getItem(USER_ID_KEY) || '';
  }

  get currentUser(): StoredUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * A appeler avant toute action reservee aux utilisateurs connectes (like, commentaire...).
   * Retourne true si l'utilisateur est connecte, sinon ouvre la modal de connexion et retourne false.
   */
  requireAuth(): boolean {
    if (this.isLoggedIn) {
      return true;
    }
    this.openLoginModal();
    return false;
  }

  openLoginModal(): void {
    this.loginModalOpenSubject.next(true);
  }

  closeLoginModal(): void {
    this.loginModalOpenSubject.next(false);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_ID_KEY);
  }
}
