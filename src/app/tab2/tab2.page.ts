import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';

interface Audio {
  _id: string;
  nom: string;
  personne: string;
  photoCouverture: string;
  photoCouvertureKey: string;
  fichierAudio: string;
  fichierAudioKey: string;
  categorie: string;
  datePublication: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface AudioResponse {
  success: boolean;
  count: number;
  audios: Audio[];
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class Tab2Page implements OnInit, OnDestroy {
  
  private urlAudio = "https://backend-flechissons.onrender.com/audio";

  searchTerm = '';
  selectedCategory = 'tous';
  featured: any = {
    title: "Dieu a changé ma vie",
    image: "https://picsum.photos/800/500?random=1"
  };

  // Données dynamiques
  audios: Audio[] = [];
  featuredAudio: Audio | null = null;
  currentAudio: Audio | null = null;
  isPlaying = false;
  isLoading = true;
  categories: string[] = [];
  audioDurations: { [key: string]: string } = {};
  
  private audioElement: HTMLAudioElement | null = null;

  constructor(
    private http: HttpClient,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.fetchAudios();
  }

  ngOnDestroy() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  fetchAudios() {
    this.isLoading = true;
    this.http.get<AudioResponse>(this.urlAudio).subscribe({
      next: (response) => {
        if (response.success && response.audios.length > 0) {
          this.audios = response.audios;
          this.featuredAudio = response.audios[0];
          this.extractCategories();
          this.loadDurations();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading = false;
        this.showErrorAlert();
      }
    });
  }

  extractCategories() {
    const uniqueCategories = new Set<string>();
    this.audios.forEach(audio => {
      if (audio.categorie) {
        uniqueCategories.add(audio.categorie.toLowerCase());
      }
    });
    this.categories = Array.from(uniqueCategories);
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
  }

  loadDurations() {
    this.audios.forEach(audio => {
      this.getAudioDuration(audio._id, audio.fichierAudio);
    });
  }

  getAudioDuration(id: string, url: string) {
    const tempAudio = new Audio(url);
    tempAudio.addEventListener('loadedmetadata', () => {
      const duration = tempAudio.duration;
      if (duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const formattedDuration = `${minutes} min${seconds > 0 ? ` ${seconds}s` : ''}`;
        this.audioDurations[id] = formattedDuration;
      }
    });
  }

  get filteredAudios() {
    let filtered = this.audios;

    // Filtrer par recherche
    const query = this.searchTerm.trim().toLocaleLowerCase();
    if (query) {
      filtered = filtered.filter((audio) =>
        audio.nom.toLocaleLowerCase().includes(query) ||
        audio.personne.toLocaleLowerCase().includes(query) ||
        audio.categorie.toLocaleLowerCase().includes(query)
      );
    }

    // Filtrer par catégorie
    if (this.selectedCategory !== 'tous') {
      filtered = filtered.filter((audio) =>
        audio.categorie.toLowerCase() === this.selectedCategory
      );
    }

    return filtered;
  }

  playAudio(audio: Audio | null) {
    if (!audio) return;

    // Si c'est le même audio, on toggle play/pause
    if (this.currentAudio?._id === audio._id) {
      this.togglePlayPause();
      return;
    }

    // Arrêter l'audio actuel
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    this.currentAudio = audio;
    this.featuredAudio = audio; // Mettre à jour le featured avec l'audio en cours
    this.audioElement = new Audio(audio.fichierAudio);
    
    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('Erreur de lecture:', e);
      this.isPlaying = false;
      this.showAudioErrorAlert();
    });

    this.audioElement.play()
      .then(() => {
        this.isPlaying = true;
      })
      .catch((error) => {
        console.error('Erreur:', error);
        this.isPlaying = false;
        this.showAudioErrorAlert();
      });
  }

  togglePlayPause() {
    if (!this.audioElement) return;

    if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    } else {
      this.audioElement.play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch((error) => {
          console.error('Erreur:', error);
          this.isPlaying = false;
        });
    }
  }

  async showErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Erreur',
      message: 'Impossible de charger les témoignages audio.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showAudioErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Erreur de lecture',
      message: 'Impossible de lire ce témoignage.',
      buttons: ['OK']
    });
    await alert.present();
  }
}