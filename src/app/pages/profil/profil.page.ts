import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { ThemeMode, ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

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
    private navCtrl: NavController,
    public themeService: ThemeService,
    private authService: AuthService
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
    // Le profil est reserve aux utilisateurs connectes : si ce n'est
    // pas le cas, on affiche la modal de connexion discrete et on
    // renvoie l'utilisateur vers l'accueil (pas de redirection forcee
    // vers /login, l'app reste en libre acces).
    if (!this.authService.isLoggedIn) {
      this.user = {};
      this.authService.requireAuth();
      this.navCtrl.navigateRoot('/tabs/tab1');
      return;
    }

    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        console.log('✅ Utilisateur chargé:', this.user);
        console.log('📸 Photo:', this.user.photo);
      } else {
        this.user = {};
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de l\'utilisateur:', error);
      this.user = {};
    }
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
    // Mettre à jour le localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser.photo = '';
    localStorage.setItem('user', JSON.stringify(currentUser));
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

      // Retour à l'accueil (l'app reste en libre accès après déconnexion)
      this.navCtrl.navigateRoot('/tabs/tab1');

    }, 1500);
  }

  // =====================================================
  // APPARENCE (MODE CLAIR / SOMBRE)
  // =====================================================

  setThemeMode(mode: ThemeMode) {
    this.themeService.setMode(mode);
  }

  // =====================================================
  // MODIFIER LE PROFIL
  // =====================================================

  editProfile() {
    console.log('✏️ Modifier le profil');
    this.router.navigate(['/editprofil']);
  }

  // =====================================================
  // RAFRAÎCHIR LES DONNÉES
  // =====================================================

  refreshData() {
    console.log('🔄 Rafraîchissement des données...');
    this.loadUserData();
  }

  // =====================================================
  // ION VIEW WILL ENTER - RECHARGE À CHAQUE RETOUR
  // =====================================================

  ionViewWillEnter() {
    console.log('📱 Retour sur la page profil - Rechargement des données');
    this.loadUserData();
  }
}