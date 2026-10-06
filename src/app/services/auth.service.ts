import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface StoredUser {
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

  private userSubject = new BehaviorSubject<StoredUser | null>(this.readStoredUser());

  /**
   * Utilisateur connecté, mis à jour en direct (connexion, modification du profil,
   * déconnexion). Les pages s'y abonnent pour ne jamais afficher un profil périmé.
   */
  readonly user$: Observable<StoredUser | null> = this.userSubject.asObservable();

  constructor(zone: NgZone) {
    // Version web : garde les autres onglets du navigateur synchronisés
    window.addEventListener('storage', event => {
      if (event.key === USER_KEY || event.key === TOKEN_KEY || event.key === null) {
        zone.run(() => this.userSubject.next(this.readStoredUser()));
      }
    });
  }

  get isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  get currentUserId(): string {
    return localStorage.getItem(USER_ID_KEY) || '';
  }

  get currentUser(): StoredUser | null {
    return this.userSubject.value;
  }

  /** Après la connexion : enregistre la session et prévient toutes les pages */
  setSession(token: string, user: StoredUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_ID_KEY, user.id);
    this.saveUser(user);
  }

  /** Après une modification du profil : fusionne les nouveaux champs et prévient toutes les pages */
  updateUser(changes: Partial<StoredUser>): void {
    const current = this.userSubject.value;
    if (!current) {
      return;
    }
    this.saveUser({ ...current, ...changes });
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
    this.userSubject.next(null);
  }

  private saveUser(user: StoredUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSubject.next(user);
  }

  private readStoredUser(): StoredUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw && localStorage.getItem(TOKEN_KEY) ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
