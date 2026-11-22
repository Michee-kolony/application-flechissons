import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, IonContent, NavController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, MediaResult } from '@capacitor/camera';
import { Subscription, timer } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ContactEglise, Conversation, MessageChat, MessagerieService } from '../../services/messagerie.service';
import { FONDS_PRESETS, FondEcran, FondEcranService } from '../../services/fond-ecran.service';

/**
 * Message affiché : peut être en cours d'envoi ou en échec (envoi optimiste, comme WhatsApp).
 * Une photo en cours d'envoi garde son fichier (pour réessayer) et un aperçu local.
 */
type MessageAffiche = MessageChat & { etat?: 'envoi' | 'echec'; fichier?: File; apercuLocal?: string };

// Photos : redimensionnées (1600 px) et ré-encodées en JPEG avant l'envoi
const PHOTO_DIMENSION_MAX = 1600;
const PHOTO_QUALITE = 0.82;
const PHOTO_TAILLE_MAX = 10 * 1024 * 1024;

// Codes d'erreur du plugin @capacitor/camera (mêmes valeurs que la page de profil)
const CAMERA_ANNULEE = ['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0020'];
const CAMERA_REFUSEE = ['OS-PLUG-CAMR-0003', 'OS-PLUG-CAMR-0005'];

/** Débuts de message proposés quand la conversation est vide (touche Fléchissons) */
const SUGGESTIONS = [
  { icone: '🙏', libelle: 'Demande de prière', texte: 'Bonjour, je voudrais vous confier un sujet de prière : ' },
  { icone: '💬', libelle: 'Besoin de conseil', texte: "Bonjour, j'aurais besoin de vos conseils au sujet de " },
  { icone: '✨', libelle: 'Témoignage', texte: 'Bonjour, je voudrais partager un témoignage : ' },
  { icone: '⛪', libelle: "Question sur l'église", texte: "Bonjour, j'ai une question au sujet de l'église : " }
];

/** Deux messages du même auteur à moins de 5 minutes d'écart forment un groupe */
const ECART_GROUPE_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
  standalone: false
})
export class ConversationPage {

  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('saisie') saisie?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('choixFichier') choixFichier?: ElementRef<HTMLInputElement>;
  @ViewChild('choixFond') choixFond?: ElementRef<HTMLInputElement>;

  readonly suggestions = SUGGESTIONS;

  conversationId = '';
  interlocuteur: ContactEglise | null = null;
  messages: MessageAffiche[] = [];
  chargement = true;
  erreur = '';
  complet = true;
  chargementAnciens = false;
  luJusqua: string | null = null;
  texte = '';
  indisponible = false;

  /** Photo choisie, en attente de la légende et de l'envoi (écran d'aperçu) */
  photo: { fichier: File; url: string } | null = null;
  legende = '';
  preparationPhoto = false;

  /** Photo affichée en plein écran */
  visionneuse: string | null = null;

  /** Bouton « descendre » : visible quand on a remonté le fil */
  loinDuBas = false;
  nouveauxEnDessous = 0;

  private actualisation?: Subscription;
  private appuiLong?: ReturnType<typeof setTimeout>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private auth: AuthService,
    private messagerie: MessagerieService,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    private fondEcran: FondEcranService,
    private alertCtrl: AlertController
  ) {}

  ionViewWillEnter(): void {
    this.conversationId = this.route.snapshot.paramMap.get('id') || '';
    this.appliquerFond();

    // Ouverte depuis une notification sans être connecté
    if (!this.auth.isLoggedIn) {
      this.auth.openLoginModal();
      void this.navCtrl.navigateRoot('/tabs/tab1');
      return;
    }

    // Infos de l'interlocuteur transmises par la liste, sinon relues sur le serveur
    const etat = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    const transmise: Conversation | undefined = etat?.conversation;
    if (transmise && transmise._id === this.conversationId) {
      this.interlocuteur = transmise.interlocuteur;
      this.indisponible = !transmise.interlocuteur;
    } else {
      this.chargerInterlocuteur();
    }

    this.chargerMessages();
  }

  ionViewWillLeave(): void {
    this.actualisation?.unsubscribe();
    this.actualisation = undefined;
    this.visionneuse = null;
    this.choixFondOuvert = false;
    this.apercuFond = null;
  }


  // =====================================================
  // CHARGEMENT
  // =====================================================

  private chargerInterlocuteur(): void {
    this.messagerie.conversations().subscribe({
      next: r => {
        const c = r.conversations.find(x => x._id === this.conversationId);
        if (c) {
          this.interlocuteur = c.interlocuteur;
          this.indisponible = !c.interlocuteur;
        }
      },
      error: () => {}
    });
  }

  private chargerMessages(): void {
    this.chargement = !this.messages.length;
    this.erreur = '';

    this.messagerie.messages(this.conversationId).subscribe({
      next: page => {
        // Garde les messages encore en cours d'envoi ou en échec
        const enAttente = this.messages.filter(m => m.etat);
        this.messages = [...page.messages, ...enAttente];
        this.complet = page.complet;
        this.luJusqua = page.luParInterlocuteurJusqua;
        this.chargement = false;
        this.messagerie.rafraichirNonLus();
        this.defilerEnBas(0);

        // Nouveaux messages toutes les 4 secondes tant que la page est ouverte
        this.actualisation?.unsubscribe();
        this.actualisation = timer(4000, 4000).subscribe(() => this.actualiser());
      },
      error: (err: HttpErrorResponse) => {
        this.chargement = false;
        this.erreur = err.status === 404
          ? 'Cette conversation est introuvable.'
          : 'Impossible de charger les messages. Vérifiez votre connexion.';
      }
    });
  }

  private get derniersConfirmes(): MessageAffiche[] {
    return this.messages.filter(m => !m.etat);
  }

  private actualiser(): void {
    if (document.visibilityState === 'hidden') {
      return;
    }
    const confirmes = this.derniersConfirmes;
    const dernier = confirmes[confirmes.length - 1];

    this.messagerie.messages(this.conversationId, dernier ? { apres: dernier.createdAt } : {}).subscribe({
      next: page => {
        this.luJusqua = page.luParInterlocuteurJusqua;
        const connus = new Set(this.messages.map(m => m._id));
        const nouveaux = page.messages.filter(m => !connus.has(m._id));
        if (!nouveaux.length) {
          return;
        }
        this.insererConfirmes(nouveaux);
        this.messagerie.rafraichirNonLus();

        const recus = nouveaux.filter(m => m.auteur === 'admin').length;
        if (this.loinDuBas) {
          this.nouveauxEnDessous += recus;
        } else {
          this.defilerEnBas();
        }
      },
      error: () => {}
    });
  }

  /** Ajoute des messages confirmés avant ceux encore en attente */
  private insererConfirmes(nouveaux: MessageAffiche[]): void {
    const confirmes = this.derniersConfirmes;
    const enAttente = this.messages.filter(m => m.etat);
    this.messages = [...confirmes, ...nouveaux, ...enAttente];
  }

  chargerAnciens(): void {
    const premier = this.derniersConfirmes[0];
    if (this.complet || this.chargementAnciens || !premier) {
      return;
    }
    this.chargementAnciens = true;

    this.messagerie.messages(this.conversationId, { avant: premier.createdAt }).subscribe({
      next: page => {
        this.messages = [...page.messages, ...this.messages];
        this.complet = page.complet;
        this.chargementAnciens = false;
      },
      error: () => this.chargementAnciens = false
    });
  }


  // =====================================================
  // ENVOI (optimiste : la bulle apparaît tout de suite avec une horloge)
  // =====================================================

  envoyer(): void {
    const texte = this.texte.trim();
    if (!texte || this.indisponible) {
      return;
    }
    this.texte = '';
    this.ajouterProvisoire(texte);
    this.ajusterSaisie();
  }

  /** Envoi depuis l'écran d'aperçu de la photo (légende facultative) */
  envoyerPhoto(): void {
    if (!this.photo || this.indisponible) {
      return;
    }
    const { fichier, url } = this.photo;
    const legende = this.legende.trim();
    this.photo = null;
    this.legende = '';
    this.ajouterProvisoire(legende, fichier, url);
  }

  private ajouterProvisoire(texte: string, fichier?: File, apercuLocal?: string): void {
    const provisoire: MessageAffiche = {
      _id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      conversation: this.conversationId,
      auteur: 'utilisateur',
      texte,
      image: apercuLocal ? { url: apercuLocal } : null,
      luLe: null,
      createdAt: new Date().toISOString(),
      etat: 'envoi',
      fichier,
      apercuLocal
    };

    this.messages = [...this.messages, provisoire];
    this.erreur = '';
    this.defilerEnBas();
    this.transmettre(provisoire);
  }

  private transmettre(provisoire: MessageAffiche): void {
    provisoire.etat = 'envoi';

    this.messagerie.envoyer(this.conversationId, provisoire.texte, provisoire.fichier).subscribe({
      next: r => {
        // Le message réel remplace la bulle provisoire (sauf s'il est déjà arrivé par l'actualisation)
        const dejaLa = this.messages.some(m => m._id === r.message._id);
        this.messages = this.messages.filter(m => m._id !== provisoire._id);
        if (!dejaLa) {
          this.insererConfirmes([r.message]);
        }
        if (provisoire.apercuLocal) {
          // Laisse le temps à la photo du serveur de s'afficher avant de libérer l'aperçu
          setTimeout(() => URL.revokeObjectURL(provisoire.apercuLocal!), 10000);
        }
      },
      error: (err: HttpErrorResponse) => {
        provisoire.etat = 'echec';
        this.messages = [...this.messages];
        if (err.status === 410) {
          this.indisponible = true;
        }
        this.erreur = err.error?.message || 'Message non envoyé. Touchez-le pour réessayer.';
      }
    });
  }


  // =====================================================
  // PHOTOS : APPAREIL PHOTO OU GALERIE
  // =====================================================

  async ajouterPhoto(): Promise<void> {
    if (this.indisponible || this.preparationPhoto) {
      return;
    }
    const feuille = await this.actionSheetCtrl.create({
      header: 'Envoyer une photo',
      buttons: [
        { text: 'Appareil photo', icon: 'camera-outline', handler: () => void this.prendrePhoto('camera') },
        { text: 'Galerie', icon: 'images-outline', handler: () => void this.prendrePhoto('galerie') },
        { text: 'Annuler', role: 'cancel' }
      ]
    });
    await feuille.present();
  }

  private async prendrePhoto(source: 'camera' | 'galerie'): Promise<void> {
    // Navigateur : sélecteur de fichier classique
    if (!Capacitor.isNativePlatform()) {
      this.choixFichier?.nativeElement.click();
      return;
    }

    try {
      let resultat: MediaResult | undefined;
      if (source === 'camera') {
        resultat = await Camera.takePhoto({ quality: 90, correctOrientation: true });
      } else {
        const { results } = await Camera.chooseFromGallery({ quality: 90, correctOrientation: true });
        resultat = results?.[0];
      }
      if (!resultat?.webPath) {
        return;
      }
      this.preparationPhoto = true;
      const blob = await (await fetch(resultat.webPath)).blob();
      await this.preparerPhoto(new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
    } catch (error: any) {
      if (CAMERA_ANNULEE.includes(error?.code) || /cancel/i.test(error?.message || '')) {
        return;
      }
      this.erreur = CAMERA_REFUSEE.includes(error?.code)
        ? 'Autorisez l’accès à l’appareil photo et aux photos dans les réglages du téléphone.'
        : 'La photo n’a pas pu être récupérée.';
    } finally {
      this.preparationPhoto = false;
    }
  }

  surFichierChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (fichier) {
      this.preparationPhoto = true;
      void this.preparerPhoto(fichier).finally(() => this.preparationPhoto = false);
    }
  }

  private async preparerPhoto(fichier: File): Promise<void> {
    const compresse = await this.compresser(fichier);
    if (compresse.size > PHOTO_TAILLE_MAX) {
      this.erreur = 'Cette photo est trop lourde (10 Mo maximum).';
      return;
    }
    this.erreur = '';
    this.legende = '';
    this.photo = { fichier: compresse, url: URL.createObjectURL(compresse) };
  }

  annulerPhoto(): void {
    if (this.photo) {
      URL.revokeObjectURL(this.photo.url);
    }
    this.photo = null;
    this.legende = '';
  }

  /** Redimensionne et ré-encode en JPEG ; garde l'original si la compression échoue */
  private async compresser(fichier: File): Promise<File> {
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(fichier);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
        img.src = url;
      });
      const echelle = Math.min(1, PHOTO_DIMENSION_MAX / Math.max(image.naturalWidth, image.naturalHeight));
      const largeur = Math.round(image.naturalWidth * echelle);
      const hauteur = Math.round(image.naturalHeight * echelle);
      const canvas = document.createElement('canvas');
      canvas.width = largeur;
      canvas.height = hauteur;
      const contexte = canvas.getContext('2d');
      if (!contexte) {
        return fichier;
      }
      contexte.fillStyle = '#ffffff';
      contexte.fillRect(0, 0, largeur, hauteur);
      contexte.drawImage(image, 0, 0, largeur, hauteur);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITE));
      if (!blob || (blob.size >= fichier.size && /jpe?g/i.test(fichier.type))) {
        return fichier;
      }
      return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    } catch {
      return fichier;
    }
  }

  ouvrirPhoto(url: string | null | undefined, event?: Event): void {
    event?.stopPropagation();
    if (url) {
      this.visionneuse = url;
    }
  }

  fermerPhoto(): void {
    this.visionneuse = null;
  }


  reessayer(message: MessageAffiche): void {
    if (message.etat !== 'echec' || this.indisponible) {
      return;
    }
    this.erreur = '';
    this.messages = [...this.messages.filter(m => m._id !== message._id), message];
    this.transmettre(message);
  }

  utiliserSuggestion(texte: string): void {
    this.texte = texte;
    setTimeout(() => {
      const zone = this.saisie?.nativeElement;
      if (zone) {
        zone.focus();
        zone.setSelectionRange(zone.value.length, zone.value.length);
        this.ajusterSaisie();
      }
    });
  }

  /** Zone de saisie qui s'agrandit avec le texte (jusqu'à 6 lignes environ) */
  ajusterSaisie(): void {
    setTimeout(() => {
      const zone = this.saisie?.nativeElement;
      if (!zone) {
        return;
      }
      zone.style.height = 'auto';
      zone.style.height = `${Math.min(zone.scrollHeight, 140)}px`;
    });
  }


  // =====================================================
  // FOND D'ÉCRAN (enregistré sur l'appareil uniquement)
  // =====================================================

  readonly presets = FONDS_PRESETS;

  /** Fond appliqué (valeur CSS), null = fond Fléchissons par défaut */
  fondCss: string | null = null;

  /** Fenêtre de choix du fond */
  choixFondOuvert = false;

  /** Fond en cours d'aperçu ('defaut' = revenir au fond par défaut) */
  apercuFond: FondEcran | 'defaut' | null = null;

  preparationFond = false;

  private get sombre(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  appliquerFond(): void {
    const fond = this.fondEcran.pour(this.conversationId);
    this.fondCss = fond ? this.fondEcran.css(fond, this.sombre) || null : null;
  }

  get apercuCss(): string | null {
    if (!this.apercuFond || this.apercuFond === 'defaut') {
      return null;
    }
    return this.fondEcran.css(this.apercuFond, this.sombre) || null;
  }

  async menu(): Promise<void> {
    const feuille = await this.actionSheetCtrl.create({
      buttons: [
        { text: 'Fond d’écran', icon: 'image-outline', handler: () => { this.choixFondOuvert = true; } },
        { text: 'Supprimer la discussion', icon: 'trash-outline', role: 'destructive', handler: () => void this.confirmerSuppression() },
        { text: 'Annuler', role: 'cancel' }
      ]
    });
    await feuille.present();
  }

  private async confirmerSuppression(): Promise<void> {
    const nom = this.interlocuteur?.nom || 'votre interlocuteur';
    const alerte = await this.alertCtrl.create({
      header: 'Supprimer la discussion ?',
      message: `Les messages et les photos de cette discussion disparaîtront de votre application. ${nom} garde sa copie jusqu'à l'effacement du 1er du mois.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Supprimer', role: 'destructive', handler: () => this.supprimerDiscussion() }
      ]
    });
    await alerte.present();
  }

  private supprimerDiscussion(): void {
    this.messagerie.supprimer(this.conversationId).subscribe({
      next: () => {
        this.actualisation?.unsubscribe();
        this.messages = [];
        this.messagerie.rafraichirNonLus();
        void this.toastCtrl.create({ message: 'Discussion supprimée', duration: 1500, position: 'bottom' }).then(t => t.present());
        void this.navCtrl.navigateBack('/tabs/messagerie');
      },
      error: () => {
        this.erreur = 'La discussion n’a pas pu être supprimée. Réessayez.';
      }
    });
  }

  fermerChoixFond(): void {
    this.choixFondOuvert = false;
  }

  choisirPreset(id: string): void {
    this.apercuFond = { type: 'preset', id };
  }

  choisirDefaut(): void {
    this.apercuFond = 'defaut';
  }

  /** Photo de l'appareil (galerie) */
  async choisirPhotoFond(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.choixFond?.nativeElement.click();
      return;
    }
    try {
      const { results } = await Camera.chooseFromGallery({ quality: 90, correctOrientation: true });
      const resultat = results?.[0];
      if (!resultat?.webPath) {
        return;
      }
      this.preparationFond = true;
      const blob = await (await fetch(resultat.webPath)).blob();
      await this.preparerFond(blob);
    } catch (error: any) {
      if (CAMERA_ANNULEE.includes(error?.code) || /cancel/i.test(error?.message || '')) {
        return;
      }
      this.erreur = CAMERA_REFUSEE.includes(error?.code)
        ? 'Autorisez l’accès à vos photos dans les réglages du téléphone.'
        : 'La photo n’a pas pu être récupérée.';
    } finally {
      this.preparationFond = false;
    }
  }

  surFondChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (fichier) {
      this.preparationFond = true;
      void this.preparerFond(fichier).finally(() => this.preparationFond = false);
    }
  }

  /** Réduit la photo (1280 px, JPEG) pour qu'elle tienne dans la mémoire de l'app */
  private async preparerFond(fichier: Blob): Promise<void> {
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(fichier);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
        img.src = url;
      });
      const echelle = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * echelle);
      canvas.height = Math.round(image.naturalHeight * echelle);
      const contexte = canvas.getContext('2d');
      if (!contexte) {
        throw new Error('Canvas indisponible');
      }
      contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
      this.apercuFond = { type: 'image', donnees: canvas.toDataURL('image/jpeg', 0.8) };
    } catch {
      this.erreur = 'Cette photo ne peut pas être utilisée comme fond d’écran.';
    }
  }

  annulerApercuFond(): void {
    this.apercuFond = null;
  }

  /** Applique le fond en aperçu à cette conversation, ou à toutes */
  validerFond(pourToutes: boolean): void {
    const fond = this.apercuFond;
    if (!fond) {
      return;
    }

    if (fond === 'defaut') {
      this.fondEcran.reinitialiser(this.conversationId);
      if (pourToutes) {
        this.fondEcran.reinitialiser(null);
      }
    } else {
      const ok = this.fondEcran.definir(fond, pourToutes ? null : this.conversationId);
      if (!ok) {
        this.erreur = 'Pas assez de place sur l’appareil pour enregistrer ce fond. Essayez une autre photo.';
        return;
      }
      // Fond pour toutes : cette conversation suit aussi le fond commun
      if (pourToutes) {
        this.fondEcran.reinitialiser(this.conversationId);
      }
    }

    this.apercuFond = null;
    this.choixFondOuvert = false;
    this.appliquerFond();
    void this.toastCtrl.create({
      message: pourToutes ? 'Fond appliqué à toutes vos conversations' : 'Fond appliqué à cette conversation',
      duration: 1600,
      position: 'top'
    }).then(t => t.present());
  }


  // =====================================================
  // APPUI LONG : COPIER (et réessayer / supprimer un message en échec)
  // =====================================================

  debutAppui(message: MessageAffiche): void {
    this.finAppui();
    this.appuiLong = setTimeout(() => void this.menuMessage(message), 500);
  }

  finAppui(): void {
    if (this.appuiLong) {
      clearTimeout(this.appuiLong);
      this.appuiLong = undefined;
    }
  }

  private async menuMessage(message: MessageAffiche): Promise<void> {
    const boutons: any[] = [];
    if (message.texte) {
      boutons.push({ text: 'Copier', icon: 'copy-outline', handler: () => void this.copier(message.texte) });
    }
    if (message.image?.url) {
      boutons.push({ text: 'Voir la photo', icon: 'expand-outline', handler: () => this.ouvrirPhoto(message.image?.url) });
    }

    if (message.etat === 'echec') {
      boutons.push(
        { text: 'Réessayer', icon: 'refresh-outline', handler: () => this.reessayer(message) },
        {
          text: 'Supprimer',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => { this.messages = this.messages.filter(m => m._id !== message._id); }
        }
      );
    }

    boutons.push({ text: 'Annuler', role: 'cancel' });

    const feuille = await this.actionSheetCtrl.create({ buttons: boutons });
    await feuille.present();
  }

  private async copier(texte: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texte);
      const toast = await this.toastCtrl.create({ message: 'Message copié', duration: 1500, position: 'bottom' });
      await toast.present();
    } catch {
      // Presse-papiers indisponible : rien à faire
    }
  }


  // =====================================================
  // DÉFILEMENT
  // =====================================================

  async surScroll(): Promise<void> {
    const el = await this.content?.getScrollElement();
    if (!el) {
      return;
    }
    this.loinDuBas = el.scrollHeight - el.scrollTop - el.clientHeight > 220;
    if (!this.loinDuBas) {
      this.nouveauxEnDessous = 0;
    }
  }

  descendre(): void {
    this.nouveauxEnDessous = 0;
    this.defilerEnBas();
  }

  private defilerEnBas(duree = 250): void {
    setTimeout(() => void this.content?.scrollToBottom(duree), 50);
  }


  // =====================================================
  // AFFICHAGE
  // =====================================================

  /** Premier message d'un groupe : il porte la petite pointe de la bulle */
  debutGroupe(index: number): boolean {
    if (index === 0 || this.nouveauJour(index)) {
      return true;
    }
    const prec = this.messages[index - 1];
    const cur = this.messages[index];
    return prec.auteur !== cur.auteur
      || new Date(cur.createdAt).getTime() - new Date(prec.createdAt).getTime() > ECART_GROUPE_MS;
  }

  estLu(message: MessageAffiche): boolean {
    return message.auteur === 'utilisateur' && !message.etat && !!this.luJusqua
      && new Date(message.createdAt).getTime() <= new Date(this.luJusqua).getTime();
  }

  iconeEtat(message: MessageAffiche): string {
    if (message.etat === 'envoi') {
      return 'time-outline';
    }
    if (message.etat === 'echec') {
      return 'alert-circle';
    }
    return this.estLu(message) ? 'checkmark-done' : 'checkmark';
  }

  nouveauJour(index: number): boolean {
    if (index === 0) {
      return true;
    }
    return new Date(this.messages[index - 1].createdAt).toDateString()
      !== new Date(this.messages[index].createdAt).toDateString();
  }

  libelleJour(date: string): string {
    const d = new Date(date);
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    if (d.toDateString() === new Date().toDateString()) {
      return "Aujourd'hui";
    }
    if (d.toDateString() === hier.toDateString()) {
      return 'Hier';
    }
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  heure(date: string): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  initiales(nom: string | undefined): string {
    return (nom || '?').split(/\s+/).slice(0, 2).map(m => m.charAt(0).toUpperCase()).join('');
  }

  trackById(_: number, item: MessageAffiche): string {
    return item._id;
  }
}
