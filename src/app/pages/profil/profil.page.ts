import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

interface User {
  id?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  photo?: string;
  profilComplete?: boolean;
  role?: string;
  sexe?: string;
  telephone?: string;
  ville?: string;
  dateNaissance?: string;
  createdAt?: string;
  updatedAt?: string;
  derniereConnexion?: string;
  preferences?: {
    categories: string[];
    notifications: boolean;
    langue: string;
  };
}

@Component({
  selector: 'app-profil',
  templateUrl: './profil.page.html',
  styleUrls: ['./profil.page.scss'],
  standalone: false
})
export class ProfilPage implements OnInit {

  // =====================================================
  // UTILISATEUR
  // =====================================================

  user: User = {};

  // =====================================================
  // ÉTAT
  // =====================================================

  isLoading = false;

  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private router: Router,
    private navCtrl: NavController
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit() {
    this.loadUserData();
  }

  // =====================================================
  // CHARGER LES DONNÉES DE L'UTILISATEUR
  // =====================================================

  loadUserData() {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        console.log('✅ Utilisateur chargé:', this.user);
      } else {
        console.warn('⚠️ Aucun utilisateur trouvé dans le localStorage');
        this.user = {};
        // Rediriger vers login si pas d'utilisateur
        this.redirectToLogin();
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de l\'utilisateur:', error);
      this.user = {};
      this.redirectToLogin();
    }
  }

  // =====================================================
  // REDIRIGER VERS LOGIN
  // =====================================================

  redirectToLogin() {
    this.navCtrl.navigateRoot('/login');
  }

  // =====================================================
  // NOM COMPLET
  // =====================================================

  get fullName(): string {
    const prenom = this.user.prenom?.trim() || '';
    const nom = this.user.nom?.trim() || '';
    const fullName = `${prenom} ${nom}`.trim();
    return fullName || 'Utilisateur';
  }

  // =====================================================
  // INITIAL
  // =====================================================

  get userInitial(): string {
    // On prend la première lettre du prénom ou du nom
    if (this.user.prenom && this.user.prenom.trim()) {
      return this.user.prenom.trim().charAt(0).toUpperCase();
    }
    if (this.user.nom && this.user.nom.trim()) {
      return this.user.nom.trim().charAt(0).toUpperCase();
    }
    // Si l'email est disponible, on prend la première lettre
    if (this.user.email && this.user.email.trim()) {
      return this.user.email.trim().charAt(0).toUpperCase();
    }
    return 'U';
  }

  // =====================================================
  // PHOTO
  // =====================================================

  get hasPhoto(): boolean {
    return !!(this.user.photo && this.user.photo.trim() && this.user.photo.trim() !== '');
  }

  // =====================================================
  // GESTIONNAIRE D'ERREUR PHOTO
  // =====================================================

  onPhotoError(): void {
    console.warn('⚠️ Erreur de chargement de la photo, suppression de la photo');
    this.user.photo = '';
  }

  // =====================================================
  // DÉCONNEXION
  // =====================================================

  logout() {
    this.isLoading = true;
    console.log('🔄 Déconnexion en cours...');
    
    // Simuler un délai de déconnexion
    setTimeout(() => {
      // Supprimer les données du localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      this.isLoading = false;
      console.log('✅ Déconnecté avec succès');
      
      // Rediriger vers la page de login
      this.redirectToLogin();
      
    }, 1500);
  }

  // =====================================================
  // MODIFIER LE PROFIL
  // =====================================================

  editProfile() {
    console.log('✏️ Modifier le profil');
    // Rediriger vers la page d'édition du profil
    // this.router.navigate(['/edit-profile']);
  }

  // =====================================================
  // RAFRAÎCHIR LES DONNÉES
  // =====================================================

  refreshData() {
    this.loadUserData();
  }
}