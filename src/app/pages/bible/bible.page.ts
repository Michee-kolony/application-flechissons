import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import {
  BibleService,
  BibleChapter,
  BibleVerse
} from '../../services/bible';

@Component({
  selector: 'app-bible',
  templateUrl: './bible.page.html',
  styleUrls: ['./bible.page.scss'],
  standalone: false
})
export class BiblePage implements OnInit {

  @ViewChild(IonContent) content!: IonContent;

  selectedBook: string = '';
  chapterNumber: number | null = null;

  bible: BibleChapter | null = null;
  verses: BibleVerse[] = [];

  loading: boolean = false;
  errorMessage: string = '';

  // =====================================================
  // LES 66 LIVRES DE LA BIBLE
  // =====================================================

  books = [

    // ANCIEN TESTAMENT
    { name: 'Genèse', value: 'genese' },
    { name: 'Exode', value: 'exode' },
    { name: 'Lévitique', value: 'levitique' },
    { name: 'Nombres', value: 'nombres' },
    { name: 'Deutéronome', value: 'deuteronome' },

    { name: 'Josué', value: 'josue' },
    { name: 'Juges', value: 'juges' },
    { name: 'Ruth', value: 'ruth' },

    { name: '1 Samuel', value: '1 samuel' },
    { name: '2 Samuel', value: '2 samuel' },

    { name: '1 Rois', value: '1 rois' },
    { name: '2 Rois', value: '2 rois' },

    { name: '1 Chroniques', value: '1 chroniques' },
    { name: '2 Chroniques', value: '2 chroniques' },

    { name: 'Esdras', value: 'esdras' },
    { name: 'Néhémie', value: 'nehemie' },
    { name: 'Esther', value: 'esther' },

    { name: 'Job', value: 'job' },
    { name: 'Psaumes', value: 'psaumes' },
    { name: 'Proverbes', value: 'proverbes' },
    { name: 'Ecclésiaste', value: 'ecclesiaste' },
    { name: 'Cantique des cantiques', value: 'cantique' },

    { name: 'Ésaïe', value: 'esaie' },
    { name: 'Jérémie', value: 'jeremie' },
    { name: 'Lamentations', value: 'lamentations' },
    { name: 'Ézéchiel', value: 'ezekiel' },
    { name: 'Daniel', value: 'daniel' },

    { name: 'Osée', value: 'osee' },
    { name: 'Joël', value: 'joel' },
    { name: 'Amos', value: 'amos' },
    { name: 'Abdias', value: 'abdias' },
    { name: 'Jonas', value: 'jonas' },
    { name: 'Michée', value: 'michee' },
    { name: 'Nahum', value: 'nahum' },
    { name: 'Habacuc', value: 'habacuc' },
    { name: 'Sophonie', value: 'sophonie' },
    { name: 'Aggée', value: 'aggee' },
    { name: 'Zacharie', value: 'zacharie' },
    { name: 'Malachie', value: 'malachie' },

    // NOUVEAU TESTAMENT
    { name: 'Matthieu', value: 'matthieu' },
    { name: 'Marc', value: 'marc' },
    { name: 'Luc', value: 'luc' },
    { name: 'Jean', value: 'jean' },

    { name: 'Actes', value: 'actes' },

    { name: 'Romains', value: 'romains' },

    { name: '1 Corinthiens', value: '1 corinthiens' },
    { name: '2 Corinthiens', value: '2 corinthiens' },

    { name: 'Galates', value: 'galates' },
    { name: 'Éphésiens', value: 'ephesiens' },
    { name: 'Philippiens', value: 'philippiens' },
    { name: 'Colossiens', value: 'colossiens' },

    { name: '1 Thessaloniciens', value: '1 thessaloniciens' },
    { name: '2 Thessaloniciens', value: '2 thessaloniciens' },

    { name: '1 Timothée', value: '1 timothee' },
    { name: '2 Timothée', value: '2 timothee' },

    { name: 'Tite', value: 'tite' },
    { name: 'Philémon', value: 'philemon' },

    { name: 'Hébreux', value: 'hebreux' },
    { name: 'Jacques', value: 'jacques' },

    { name: '1 Pierre', value: '1 pierre' },
    { name: '2 Pierre', value: '2 pierre' },

    { name: '1 Jean', value: '1 jean' },
    { name: '2 Jean', value: '2 jean' },
    { name: '3 Jean', value: '3 jean' },

    { name: 'Jude', value: 'jude' },
    { name: 'Apocalypse', value: 'apocalypse' }

  ];

  constructor(
    private bibleService: BibleService
  ) {}

  ngOnInit(): void {
    console.log('📖 Bible initialisée');
  }

  // =====================================================
  // RECHERCHER UN CHAPITRE
  // =====================================================

  searchBible(): void {

    this.errorMessage = '';

    // Vérifier le livre
    if (!this.selectedBook) {

      this.errorMessage =
        'Veuillez sélectionner un livre biblique.';

      return;
    }

    // Vérifier le chapitre
    if (
      this.chapterNumber === null ||
      this.chapterNumber === undefined ||
      this.chapterNumber <= 0
    ) {

      this.errorMessage =
        'Veuillez entrer un numéro de chapitre valide.';

      return;
    }

    // Empêcher une double recherche
    if (this.loading) {
      return;
    }

    this.loading = true;

    // Nettoyer l'ancien résultat
    this.bible = null;
    this.verses = [];

    console.log('📖 Recherche Bible :');
    console.log('Livre :', this.selectedBook);
    console.log('Chapitre :', this.chapterNumber);

    this.bibleService
      .getChapter(
        this.selectedBook,
        this.chapterNumber
      )
      .subscribe({

        next: (data: BibleChapter) => {

          console.log('📖 Bible :', data);

          this.bible = data;
          this.verses = data.verses || [];

          this.loading = false;
          this.errorMessage = '';

        },

        error: (error) => {

          console.error(
            '❌ Erreur Bible :',
            error
          );

          this.loading = false;

          this.bible = null;
          this.verses = [];

          if (error?.status === 404) {

            this.errorMessage =
              'Ce chapitre est introuvable.';

          } else {

            this.errorMessage =
              'Impossible de charger ce chapitre. Vérifiez votre connexion internet.';
          }

        }

      });
  }

  // =====================================================
  // CHANGEMENT DE LIVRE
  // =====================================================

  onBookChange(): void {

    this.errorMessage = '';

    this.bible = null;
    this.verses = [];

  }

  getDisplayedBookName(apiBookName: string): string {
    const selectedBook = this.books.find(book => book.value === this.selectedBook);

    return selectedBook?.name || apiBookName;
  }

  // =====================================================
  // CHANGEMENT DE CHAPITRE
  // =====================================================

  onChapterChange(): void {

    this.errorMessage = '';

    this.bible = null;
    this.verses = [];

  }

  // =====================================================
  // APPUYER SUR ENTER
  // =====================================================

  onEnter(event: Event): void {

    event.preventDefault();

    if (!this.loading) {
      this.searchBible();
    }

  }

  async scrollToTop(): Promise<void> {
    await this.content?.scrollToTop(500);
  }

}