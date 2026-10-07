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

interface CategorieAudio {
  value: string;
  label: string;
  icon: string;
}

// Mêmes valeurs que l'enum `categorie` du modèle Audio côté backend
const CATEGORIES_AUDIO: CategorieAudio[] = [
  { value: 'priere', label: 'Prière', icon: 'heart-outline' },
  { value: 'miracles', label: 'Miracles', icon: 'sparkles-outline' },
  { value: 'esperances', label: 'Espérances', icon: 'sunny-outline' },
  { value: 'temoignages', label: 'Témoignages', icon: 'chatbubble-ellipses-outline' },
  { value: 'autres', label: 'Autres', icon: 'albums-outline' }
];

const AUDIOS_CACHE_KEY = 'audios_cache';
const DURATIONS_CACHE_KEY = 'audio_durations';
// Nombre de durées lues en parallèle (chaque lecture télécharge l'en-tête du fichier)
const DURATIONS_CONCURRENCY = 2;

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
  /** L'audio en cours charge (spinner jusqu'au début de la lecture) */
  isBuffering = false;
  isLoading = true;
  isRefreshing = false;
  readonly categories = CATEGORIES_AUDIO;
  /** Nombre d'audios par catégorie, pour les filtres */
  categoryCounts: { [categorie: string]: number } = {};
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

  // Lecture des durées : file d'attente, lancée une fois la page affichée
  private durationQueue: Audio[] = [];
  private durationsActive = 0;
  private durationsStarted = false;
  private destroyed = false;

  // Liste filtrée mémorisée (évite de refiltrer à chaque détection de changements)
  private filteredCache: Audio[] = [];
  private filteredKey: [Audio[], string, string] | null = null;

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
    try {
      this.audioDurations = JSON.parse(localStorage.getItem(DURATIONS_CACHE_KEY) || '{}');
    } catch {
      this.audioDurations = {};
    }
    // La liste est construite après le premier affichage : on bascule tout de suite sur la page
    requestAnimationFrame(() => setTimeout(() => this.chargerDepuisCache()));
  }

  ionViewDidEnter() {
    // Les durées ne sont lues qu'une fois la page affichée, sans bloquer la navigation
    if (!this.durationsStarted) {
      this.durationsStarted = true;
      setTimeout(() => this.loadDurations(), 400);
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.durationQueue = [];
    this.cleanupAudio();
  }

  private chargerDepuisCache(): void {
    // Le réseau a déjà répondu : le cache serait plus ancien
    if (this.audios.length) {
      return;
    }
    try {
      const cache = localStorage.getItem(AUDIOS_CACHE_KEY);
      if (cache) {
        this.appliquerAudios(JSON.parse(cache));
        this.isLoading = false;
      }
    } catch {
      localStorage.removeItem(AUDIOS_CACHE_KEY);
    }
  }

  private appliquerAudios(liste: Audio[]): void {
    // Trier les audios par date de création (du plus récent au plus ancien)
    this.audios = [...liste].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!this.currentAudio) {
      this.featuredAudio = this.audios[0] ?? null;
    }
    this.extractCategories();
    if (this.durationsStarted) {
      this.loadDurations();
    }
  }

  get volumeIcon(): string {
    if (this.volume === 0) return 'volume-mute-outline';
    if (this.volume < 0.5) return 'volume-low-outline';
    return 'volume-high-outline';
  }

  fetchAudios() {
    this.isLoading = this.audios.length === 0;
    this.http.get<AudioResponse>(this.urlAudio).subscribe({
      next: (response) => {
        if (response.success && response.audios.length > 0) {
          this.appliquerAudios(response.audios);
          this.sauverCache(response.audios);
        }
        this.isLoading = false;
        this.isRefreshing = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading = false;
        this.isRefreshing = false;
        // Les audios en cache restent affichés : pas d'alerte dans ce cas
        if (!this.audios.length) {
          this.showErrorAlert();
        }
      }
    });
  }

  private sauverCache(audios: Audio[]): void {
    try {
      localStorage.setItem(AUDIOS_CACHE_KEY, JSON.stringify(audios));
    } catch {
      // Stockage plein : le cache est facultatif
    }
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
          this.appliquerAudios(response.audios);
          this.sauverCache(response.audios);
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
    this.categoryCounts = {};
    this.audios.forEach(audio => {
      const categorie = audio.categorie?.toLowerCase();
      if (categorie) {
        this.categoryCounts[categorie] = (this.categoryCounts[categorie] || 0) + 1;
      }
    });
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
  }

  /** Libellé affiché d'une catégorie (avec accents) */
  getCategoryLabel(categorie: string | null | undefined): string {
    const value = categorie?.toLowerCase() || '';
    const connue = this.categories.find(c => c.value === value);
    if (connue) {
      return connue.label;
    }
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }

  /** Titre de la liste selon le filtre actif */
  get listTitle(): string {
    return this.selectedCategory === 'tous'
      ? 'Tous les audios'
      : this.getCategoryLabel(this.selectedCategory);
  }

  get emptyMessage(): string {
    if (this.searchTerm.trim()) {
      return 'Aucun audio ne correspond à votre recherche.';
    }
    if (this.selectedCategory !== 'tous') {
      return `Aucun audio dans « ${this.getCategoryLabel(this.selectedCategory)} » pour le moment.`;
    }
    return 'Aucun audio disponible pour le moment.';
  }

  /**
   * Lit les durées manquantes, quelques fichiers à la fois et seulement leur en-tête
   * (avant : un lecteur par audio, tous téléchargés en même temps à l'ouverture)
   */
  loadDurations() {
    this.durationQueue = this.audios.filter(audio => !this.audioDurations[audio._id]);
    while (this.durationsActive < DURATIONS_CONCURRENCY && this.durationQueue.length) {
      this.nextDuration();
    }
  }

  private nextDuration(): void {
    const audio = this.durationQueue.shift();
    if (!audio || this.destroyed) {
      return;
    }
    this.durationsActive++;

    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    const done = () => {
      tempAudio.onloadedmetadata = null;
      tempAudio.onerror = null;
      // Stoppe le téléchargement du fichier
      tempAudio.removeAttribute('src');
      tempAudio.load();
      this.durationsActive--;
      this.nextDuration();
    };
    tempAudio.onloadedmetadata = () => {
      const duration = tempAudio.duration;
      if (duration > 0 && isFinite(duration)) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        this.audioDurations[audio._id] = `${minutes} min${seconds > 0 ? ` ${seconds}s` : ''}`;
        try {
          localStorage.setItem(DURATIONS_CACHE_KEY, JSON.stringify(this.audioDurations));
        } catch {
          // Cache facultatif
        }
      }
      done();
    };
    tempAudio.onerror = done;
    tempAudio.src = audio.fichierAudio;
  }

  trackById(_: number, audio: Audio): string {
    return audio._id;
  }

  get filteredAudios(): Audio[] {
    const key = this.filteredKey;
    if (key && key[0] === this.audios && key[1] === this.searchTerm && key[2] === this.selectedCategory) {
      return this.filteredCache;
    }
    this.filteredKey = [this.audios, this.searchTerm, this.selectedCategory];

    let filtered = this.audios;

    const query = this.searchTerm.trim().toLocaleLowerCase();
    if (query) {
      filtered = filtered.filter((audio) =>
        audio.nom?.toLocaleLowerCase().includes(query) ||
        audio.personne?.toLocaleLowerCase().includes(query) ||
        audio.categorie?.toLocaleLowerCase().includes(query) ||
        this.getCategoryLabel(audio.categorie).toLocaleLowerCase().includes(query)
      );
    }

    if (this.selectedCategory !== 'tous') {
      filtered = filtered.filter((audio) =>
        audio.categorie?.toLowerCase() === this.selectedCategory
      );
    }

    this.filteredCache = filtered;
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
    this.isBuffering = true;
    this.audioElement = new Audio(audio.fichierAudio);

    this.audioElement.volume = this.volume;

    // Spinner tant que l'audio charge (au démarrage ou pendant une coupure réseau)
    this.audioElement.addEventListener('waiting', () => this.isBuffering = true);
    this.audioElement.addEventListener('playing', () => this.isBuffering = false);

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
      this.isBuffering = false;
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
        this.isBuffering = false;
        // play() interrompu parce qu'on a lancé un autre audio : pas une vraie erreur
        if (error?.name !== 'AbortError') {
          this.showAudioErrorAlert();
        }
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
      // Stoppe le téléchargement en cours de l'ancien audio
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
      this.audioElement = null;
    }
    this.stopProgressUpdate();
    this.isPlaying = false;
    this.isBuffering = false;
  }

  // =====================================================
  // ALERTES
  // =====================================================

  async showErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Erreur',
      message: 'Impossible de charger les audios.',
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
      message: 'Impossible de lire cet audio.',
      buttons: ['OK']
    });
    await alert.present();
  }
}