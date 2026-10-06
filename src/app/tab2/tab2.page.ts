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
  
  private urlAudio = "https://flechissons.com/audio";

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
  isRefreshing = false;
  categories: string[] = [];
  audioDurations: { [key: string]: string } = {};
  
  // Variables pour le lecteur
  audioProgress = 0;
  currentTime = '0:00';
  totalDuration = '0:00';
  durationInSeconds = 0;
  currentSeconds = 0;

  // Lecteur plein écran
  playerOpen = false;
  
  // Variables pour le volume
  volume = 0.8;
  previousVolume = 0.8;
  showVolumeSlider = false;
  
  private audioElement: HTMLAudioElement | null = null;
  private progressInterval: any;

  constructor(
    private http: HttpClient,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.fetchAudios();
    // Restaurer le volume sauvegardé
    const savedVolume = localStorage.getItem('audioVolume');
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
  }

  ngOnDestroy() {
    this.cleanupAudio();
  }

  get volumeIcon(): string {
    if (this.volume === 0) return 'volume-mute-outline';
    if (this.volume < 0.5) return 'volume-low-outline';
    return 'volume-high-outline';
  }

  fetchAudios() {
    this.isLoading = true;
    this.http.get<AudioResponse>(this.urlAudio).subscribe({
      next: (response) => {
        if (response.success && response.audios.length > 0) {
          // Trier les audios par date de création (du plus récent au plus ancien)
          this.audios = response.audios.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          this.featuredAudio = this.audios[0];
          this.extractCategories();
          this.loadDurations();
        }
        this.isLoading = false;
        this.isRefreshing = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading = false;
        this.isRefreshing = false;
        this.showErrorAlert();
      }
    });
  }

  // =====================================================
  // PULL-TO-REFRESH
  // =====================================================

  handleRefresh(event: any) {
    this.isRefreshing = true;
    
    this.cleanupAudio();
    this.currentAudio = null;
    this.audioProgress = 0;
    this.currentTime = '0:00';
    this.totalDuration = '0:00';
    
    this.http.get<AudioResponse>(this.urlAudio).subscribe({
      next: (response) => {
        if (response.success && response.audios.length > 0) {
          this.audios = response.audios.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          this.featuredAudio = this.audios[0];
          this.extractCategories();
          this.loadDurations();
        }
        this.isRefreshing = false;
        event.target.complete();
      },
      error: (error) => {
        console.error('Erreur lors du rafraîchissement:', error);
        this.isRefreshing = false;
        event.target.complete();
        this.showRefreshErrorAlert();
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

    const query = this.searchTerm.trim().toLocaleLowerCase();
    if (query) {
      filtered = filtered.filter((audio) =>
        audio.nom.toLocaleLowerCase().includes(query) ||
        audio.personne.toLocaleLowerCase().includes(query) ||
        audio.categorie.toLocaleLowerCase().includes(query)
      );
    }

    if (this.selectedCategory !== 'tous') {
      filtered = filtered.filter((audio) =>
        audio.categorie.toLowerCase() === this.selectedCategory
      );
    }

    return filtered;
  }

  playAudio(audio: Audio | null) {
    if (!audio) return;

    if (this.currentAudio?._id === audio._id) {
      this.togglePlayPause();
      return;
    }

    this.cleanupAudio();

    this.currentAudio = audio;
    this.featuredAudio = audio;
    this.currentSeconds = 0;
    this.audioProgress = 0;
    this.currentTime = '0:00';
    this.playerOpen = true;
    this.audioElement = new Audio(audio.fichierAudio);
    
    this.audioElement.volume = this.volume;
    
    this.audioElement.addEventListener('loadedmetadata', () => {
      this.durationInSeconds = this.audioElement!.duration;
      this.totalDuration = this.formatTime(this.durationInSeconds);
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.audioProgress = 100;
      this.currentTime = this.totalDuration;
      this.stopProgressUpdate();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.updateProgress();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('Erreur de lecture:', e);
      this.isPlaying = false;
      this.stopProgressUpdate();
      this.showAudioErrorAlert();
    });

    this.audioElement.play()
      .then(() => {
        this.isPlaying = true;
        this.startProgressUpdate();
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
      this.stopProgressUpdate();
    } else {
      this.audioElement.play()
        .then(() => {
          this.isPlaying = true;
          this.startProgressUpdate();
        })
        .catch((error) => {
          console.error('Erreur:', error);
          this.isPlaying = false;
        });
    }
  }

  updateProgress() {
    if (this.audioElement) {
      const current = this.audioElement.currentTime;
      const duration = this.audioElement.duration;
      if (duration > 0) {
        this.audioProgress = (current / duration) * 100;
        this.currentSeconds = current;
        this.currentTime = this.formatTime(current);
        this.totalDuration = this.formatTime(duration);
        this.durationInSeconds = duration;
      }
    }
  }

  startProgressUpdate() {
    this.stopProgressUpdate();
    this.progressInterval = setInterval(() => {
      this.updateProgress();
    }, 500);
  }

  stopProgressUpdate() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // =====================================================
  // GESTION DU SEEK (AVANCER/RECULER)
  // =====================================================

  seek(seconds: number) {
    if (!this.audioElement) return;
    
    const newTime = this.audioElement.currentTime + seconds;
    const maxTime = this.audioElement.duration;
    
    // Empêcher de dépasser les limites
    if (newTime < 0) {
      this.audioElement.currentTime = 0;
    } else if (newTime > maxTime) {
      this.audioElement.currentTime = maxTime;
    } else {
      this.audioElement.currentTime = newTime;
    }
    
    // Mettre à jour l'affichage immédiatement
    this.updateProgress();
  }

  seekTo(event: MouseEvent) {
    if (!this.audioElement) return;
    
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;
    
    const duration = this.audioElement.duration;
    if (duration > 0) {
      const newTime = percentage * duration;
      this.audioElement.currentTime = Math.max(0, Math.min(newTime, duration));
      this.updateProgress();
    }
  }

  /** Curseur de progression du lecteur plein écran */
  seekToValue(event: Event) {
    if (!this.audioElement) return;
    const value = parseFloat((event.target as HTMLInputElement).value);
    const duration = this.audioElement.duration;
    if (duration > 0 && !isNaN(value)) {
      this.audioElement.currentTime = Math.max(0, Math.min(value, duration));
      this.updateProgress();
    }
  }

  // =====================================================
  // LECTEUR PLEIN ÉCRAN
  // =====================================================

  openPlayer() {
    if (this.currentAudio) {
      this.playerOpen = true;
    }
  }

  minimizePlayer() {
    this.playerOpen = false;
  }

  // =====================================================
  // GESTION DU VOLUME
  // =====================================================

  toggleVolumeSlider() {
    this.showVolumeSlider = !this.showVolumeSlider;
    if (this.showVolumeSlider) {
      setTimeout(() => {
        this.showVolumeSlider = false;
      }, 3000);
    }
  }

  setVolume(event: any) {
    const value = parseFloat(event.target.value);
    this.volume = value;
    if (this.audioElement) {
      this.audioElement.volume = value;
    }
    localStorage.setItem('audioVolume', value.toString());
  }

  // =====================================================
  // FERMETURE
  // =====================================================

  closeNowPlaying() {
    this.cleanupAudio();
    this.currentAudio = null;
    this.audioProgress = 0;
    this.currentTime = '0:00';
    this.totalDuration = '0:00';
    this.durationInSeconds = 0;
    this.currentSeconds = 0;
    this.showVolumeSlider = false;
    this.playerOpen = false;
  }

  cleanupAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    this.stopProgressUpdate();
    this.isPlaying = false;
  }

  // =====================================================
  // ALERTES
  // =====================================================

  async showErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Erreur',
      message: 'Impossible de charger les témoignages audio.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showRefreshErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Erreur de rafraîchissement',
      message: 'Impossible de rafraîchir les données. Veuillez réessayer.',
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