import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

interface ProfilePreferences {
  categories: string[];
  notifications: boolean;
  langue: string;
}

interface ProfileUser {
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
}

@Component({
  selector: 'app-editprofil',
  templateUrl: './editprofil.page.html',
  styleUrls: ['./editprofil.page.scss'],
  standalone: false
})
export class EditprofilPage implements OnInit {

  user: ProfileUser = {};
  isSaving = false;
  isPhotoSheetOpen = false;
  photoPreview = '';
  selectedCategories: string[] = [];

  readonly categories = [
    { value: 'priere', label: 'Prière', icon: 'heart-outline' },
    { value: 'predications', label: 'Prédications', icon: 'mic-outline' },
    { value: 'temoignages', label: 'Témoignages', icon: 'chatbubble-ellipses-outline' },
    { value: 'actualites', label: 'Actualités', icon: 'newspaper-outline' }
  ];

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadUser();
  }

  private loadUser(): void {
    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    try {
      this.user = JSON.parse(savedUser);
      this.user.preferences = {
        categories: this.user.preferences?.categories || [],
        notifications: this.user.preferences?.notifications ?? true,
        langue: this.user.preferences?.langue || 'fr'
      };
      this.selectedCategories = [...(this.user.preferences?.categories || [])];
    } catch {
      this.navCtrl.navigateRoot('/login');
    }
  }

  get userInitial(): string {
    return (this.user.prenom || this.user.nom || this.user.email || 'U').trim().charAt(0).toUpperCase();
  }

  toggleCategory(category: string): void {
    this.selectedCategories = this.selectedCategories.includes(category)
      ? this.selectedCategories.filter(item => item !== category)
      : [...this.selectedCategories, category];
  }

  openPhotoPicker(): void {
    this.isPhotoSheetOpen = true;
  }

  closePhotoPicker(): void {
    this.isPhotoSheetOpen = false;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async saveProfile(): Promise<void> {
    this.isSaving = true;
    const preferences: ProfilePreferences = {
      categories: this.selectedCategories,
      notifications: this.user.preferences?.notifications ?? true,
      langue: this.user.preferences?.langue || 'fr'
    };

    this.user.preferences = preferences;
    this.user.profilComplete = Boolean(
      this.user.prenom?.trim() && this.user.sexe && this.user.dateNaissance && this.user.ville?.trim()
    );

    localStorage.setItem('user', JSON.stringify(this.user));

    const toast = await this.toastController.create({
      message: 'Votre profil a bien été enregistré.',
      duration: 1800,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
    this.isSaving = false;
    this.navCtrl.navigateBack('/tabs/profil');
  }

}
