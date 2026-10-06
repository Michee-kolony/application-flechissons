import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface ProfilePreferences {
  categories: string[];
  notifications: boolean;
  langue: string;
}

interface ProfileUser {
  id?: string;
  nom?: string;
  email?: string;
  prenom?: string;
  photo?: string;
  sexe?: string;
  dateNaissance?: string;
  telephone?: string;
  ville?: string;
  profilComplete?: boolean;
  preferences?: ProfilePreferences;
  role?: string;
  derniereConnexion?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UploadError {
  icon: string;
  title: string;
  message: string;
  hint: string;
}

// Mêmes règles que le backend (middlewares/upload.js)
const PHOTO_MAX_SIZE = 5 * 1024 * 1024;
const PHOTO_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

@Component({
  selector: 'app-editprofil',
  templateUrl: './editprofil.page.html',
  styleUrls: ['./editprofil.page.scss'],
  standalone: false
})
export class EditprofilPage implements OnInit {

  user: ProfileUser = {
    preferences: {
      categories: [],
      notifications: true,
      langue: 'fr'
    }
  };
  
  isSaving = false;
  isPhotoSheetOpen = false;
  uploadError: UploadError | null = null;
  photoPreview = '';
  selectedCategories: string[] = [];
  private selectedFile: File | null = null; // Stocker le fichier sélectionné
  
  // =====================================================
  // API - LOCALHOST
  // =====================================================
  
  private apiUrl = 'https://flechissons.com/user';

  // =====================================================
  // CATÉGORIES
  // =====================================================

  readonly categories = [
    { value: 'priere', label: 'Prière', icon: 'heart-outline' },
    { value: 'predications', label: 'Prédications', icon: 'mic-outline' },
    { value: 'temoignages', label: 'Témoignages', icon: 'chatbubble-ellipses-outline' },
    { value: 'actualites', label: 'Actualités', icon: 'newspaper-outline' }
  ];

  // =====================================================
  // CONSTRUCTEUR
  // =====================================================

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit() {
    this.loadUser();
  }

  // =====================================================
  // CHARGER UTILISATEUR
  // =====================================================

  private loadUser(): void {
    // Page reservee aux utilisateurs connectes : si ce n'est pas le
    // cas (ex. accès direct par URL), on affiche la modal de connexion
    // et on renvoie vers l'accueil plutot que de forcer /login.
    if (!this.authService.isLoggedIn) {
      this.authService.requireAuth();
      this.navCtrl.navigateRoot('/tabs/tab1');
      return;
    }

    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      this.authService.requireAuth();
      this.navCtrl.navigateRoot('/tabs/tab1');
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      
      // Initialiser l'utilisateur avec des préférences par défaut
      this.user = {
        ...parsedUser,
        preferences: {
          categories: parsedUser.preferences?.categories || [],
          notifications: parsedUser.preferences?.notifications ?? true,
          langue: parsedUser.preferences?.langue || 'fr'
        }
      };
      
      this.selectedCategories = [...(this.user.preferences?.categories || [])];
      
      // Charger la photo si présente
      if (this.user.photo) {
        this.photoPreview = this.user.photo;
      }
      
    } catch {
      this.navCtrl.navigateRoot('/tabs/tab1');
    }
  }

  // =====================================================
  // GET INITIALES
  // =====================================================

  get userInitial(): string {
    return (this.user.prenom || this.user.nom || this.user.email || 'U').trim().charAt(0).toUpperCase();
  }

  // =====================================================
  // TOGGLE CATÉGORIE
  // =====================================================

  toggleCategory(category: string): void {
    this.selectedCategories = this.selectedCategories.includes(category)
      ? this.selectedCategories.filter(item => item !== category)
      : [...this.selectedCategories, category];
  }

  // =====================================================
  // OUVERTURE PHOTO
  // =====================================================

  openPhotoPicker(): void {
    this.isPhotoSheetOpen = true;
  }

  // =====================================================
  // FERMETURE PHOTO
  // =====================================================

  closePhotoPicker(): void {
    this.isPhotoSheetOpen = false;
  }

  // =====================================================
  // SÉLECTION PHOTO
  // =====================================================

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    // Permet de re-sélectionner le même fichier après une erreur
    input.value = '';

    if (!file) {
      return;
    }

    const error = this.validatePhoto(file);
    if (error) {
      this.uploadError = error;
      return;
    }

    // Stocker le fichier pour l'upload
    this.selectedFile = file;

    // Aperçu local
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // =====================================================
  // ERREURS PHOTO (MODAL)
  // =====================================================

  private validatePhoto(file: File): UploadError | null {
    // Certains Android ne renseignent pas le type MIME : on regarde l'extension
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const formatOk = file.type
      ? PHOTO_FORMATS.includes(file.type)
      : PHOTO_EXTENSIONS.includes(extension);

    if (!formatOk) {
      return this.formatError(extension || file.type);
    }
    if (file.size > PHOTO_MAX_SIZE) {
      return this.sizeError(file.size);
    }
    return null;
  }

  private sizeError(size?: number): UploadError {
    const mo = size ? ` (${(size / 1024 / 1024).toFixed(1).replace('.', ',')} Mo)` : '';
    return {
      icon: 'resize-outline',
      title: 'Photo trop lourde',
      message: `Votre photo${mo} dépasse la taille maximale autorisée de 5 Mo.`,
      hint: 'Choisissez une autre photo, ou réduisez-la avant de l\'envoyer (une capture d\'écran de la photo suffit souvent).'
    };
  }

  private formatError(format?: string): UploadError {
    const detail = format ? ` (.${format.replace(/^image\//, '')})` : '';
    return {
      icon: 'image-outline',
      title: 'Format non accepté',
      message: `Ce type de fichier${detail} n'est pas accepté pour la photo de profil.`,
      hint: 'Formats acceptés : JPG, PNG ou WEBP. Sur iPhone, les photos HEIC ne sont pas acceptées.'
    };
  }

  /** Traduit une erreur d'upload du serveur, ou null si ce n'est pas une erreur de photo */
  private photoErrorFromResponse(error: any): UploadError | null {
    const code = error?.error?.code;
    if (code === 'LIMIT_FILE_SIZE' || error?.status === 413) {
      return this.sizeError(this.selectedFile?.size);
    }
    if (code === 'INVALID_IMAGE_FORMAT') {
      return this.formatError(this.selectedFile?.name.split('.').pop()?.toLowerCase());
    }
    return null;
  }

  closeUploadError(): void {
    this.uploadError = null;
  }

  chooseAnotherPhoto(): void {
    this.uploadError = null;
    this.openPhotoPicker();
  }

  // =====================================================
  // SAUVEGARDER PROFIL (AVEC PHOTO)
  // =====================================================

  async saveProfile(): Promise<void> {
    this.isSaving = true;

    try {
      // =================================================
      // RÉCUPÉRER LE TOKEN
      // =================================================
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token manquant. Veuillez vous reconnecter.');
      }

      // =================================================
      // PRÉPARER LES DONNÉES AVEC FORM DATA
      // =================================================
      
      const formData = new FormData();

      // Ajouter les champs textes
      formData.append('prenom', this.user.prenom || '');
      formData.append('sexe', this.user.sexe || '');
      
      if (this.user.dateNaissance) {
        formData.append('dateNaissance', this.user.dateNaissance);
      }
      
      formData.append('telephone', this.user.telephone || '');
      formData.append('ville', this.user.ville || '');
      
      // Ajouter les préférences (convertir en JSON)
      formData.append('categories', JSON.stringify(this.selectedCategories));
      formData.append('notifications', String(this.user.preferences?.notifications ?? true));
      formData.append('langue', this.user.preferences?.langue || 'fr');

      // =================================================
      // AJOUTER LA PHOTO SI SÉLECTIONNÉE
      // =================================================
      
      if (this.selectedFile) {
        formData.append('photo', this.selectedFile, this.selectedFile.name);
        console.log('📸 Photo ajoutée :', this.selectedFile.name);
      }

      // =================================================
      // HEADERS (SANS Content-Type pour FormData)
      // =================================================
      
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // =================================================
      // APPEL API
      // =================================================
      
      console.log('📤 Envoi des données avec FormData...');
      
      const response = await this.http.put<{
        success: boolean;
        message: string;
        user: ProfileUser;
      }>(
        `${this.apiUrl}/profile`,
        formData,
        { headers }
      ).toPromise();

      console.log('✅ Réponse API :', response);

      // =================================================
      // VÉRIFIER RÉPONSE
      // =================================================
      
      if (!response || !response.success) {
        throw new Error(response?.message || 'Erreur lors de la sauvegarde');
      }

      // =================================================
      // METTRE À JOUR LOCALSTORAGE
      // =================================================
      
      // Conserver les champs qui ne sont pas dans la réponse
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Fusionner avec les nouvelles données
      const updatedUser = {
        ...currentUser,
        ...response.user,
        // S'assurer que les préférences sont bien à jour
        preferences: {
          categories: this.selectedCategories,
          notifications: this.user.preferences?.notifications ?? true,
          langue: this.user.preferences?.langue || 'fr'
        }
      };

      // Sauvegarder dans localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Mettre à jour l'user local
      this.user = updatedUser;
      
      // Mettre à jour la photo preview si une nouvelle photo a été uploadée
      if (response.user?.photo) {
        this.photoPreview = response.user.photo;
        this.selectedFile = null; // Réinitialiser le fichier
      }

      console.log('💾 User mis à jour dans localStorage :', updatedUser);

      // =================================================
      // TOAST SUCCESS
      // =================================================
      
      const toast = await this.toastController.create({
        message: this.selectedFile ? 'Profil et photo mis à jour !' : 'Votre profil a bien été enregistré.',
        duration: 1800,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

      // =================================================
      // REDIRECTION
      // =================================================
      
      this.isSaving = false;
      this.navCtrl.navigateBack('/tabs/profil');

    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde :', error);

      // =================================================
      // GESTION DES ERREURS
      // =================================================

      const photoError = this.photoErrorFromResponse(error);
      if (photoError) {
        // La photo refusée ne doit pas être renvoyée au prochain enregistrement
        this.selectedFile = null;
        this.photoPreview = this.user.photo || '';
        this.uploadError = photoError;
        this.isSaving = false;
        return;
      }

      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
      
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // =================================================
      // TOAST ERROR
      // =================================================
      
      const toast = await this.toastController.create({
        message: errorMessage,
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();

      this.isSaving = false;
    }
  }

  // =====================================================
  // DATA URL TO FILE
  // =====================================================

  private dataURLToFile(dataURL: string, filename: string): File {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  // =====================================================
  // SAUVEGARDER COMPLET (supprimé car tout est dans saveProfile)
  // =====================================================

  // La méthode saveProfile gère maintenant tout (texte + photo)
}