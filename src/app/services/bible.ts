import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BibleVerse {
  v: number | string;
  t: string;
  q?: number[];
  p?: boolean;
  b?: boolean;
  s?: string;
  ms?: string;
  d?: string;
}

export interface BibleChapter {
  translation: string;
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

@Injectable({
  providedIn: 'root'
})
export class BibleService {

  private readonly API_URL = 'https://free.bible/bible/segond';

  /**
   * Correspondance entre les noms français
   * et les identifiants utilisés par l'API.
   */
  private books: Record<string, string> = {

    // Ancien Testament
    'genese': 'genesis',
    'genèse': 'genesis',
    'exode': 'exodus',
    'levitique': 'leviticus',
    'lévitique': 'leviticus',
    'nombres': 'numbers',
    'deuteronome': 'deuteronomy',
    'deutéronome': 'deuteronomy',
    'josue': 'joshua',
    'josué': 'joshua',
    'juges': 'judges',
    'ruth': 'ruth',

    '1 samuel': '1-samuel',
    '2 samuel': '2-samuel',

    '1 rois': '1-kings',
    '2 rois': '2-kings',

    '1 chroniques': '1-chronicles',
    '2 chroniques': '2-chronicles',

    'esdras': 'ezra',
    'nehemie': 'nehemiah',
    'néhémie': 'nehemiah',
    'esther': 'esther',
    'job': 'job',
    'psaumes': 'psalms',
    'psaume': 'psalms',
    'proverbes': 'proverbs',
    'ecclesiaste': 'ecclesiastes',
    'ecclésiaste': 'ecclesiastes',
    'cantique': 'song-of-solomon',
    'esaie': 'isaiah',
    'ésaïe': 'isaiah',
    'jeremie': 'jeremiah',
    'jérémie': 'jeremiah',
    'lamentations': 'lamentations',
    'ezekiel': 'ezekiel',
    'ézékiel': 'ezekiel',
    'daniel': 'daniel',
    'osee': 'hosea',
    'osée': 'hosea',
    'joel': 'joel',
    'joël': 'joel',
    'amos': 'amos',
    'abdias': 'obadiah',
    'jonas': 'jonah',
    'michee': 'micah',
    'michée': 'micah',
    'nahum': 'nahum',
    'habacuc': 'habakkuk',
    'sophonie': 'zephaniah',
    'aggee': 'haggai',
    'aggée': 'haggai',
    'zacharie': 'zechariah',
    'malachie': 'malachi',

    // Nouveau Testament
    'matthieu': 'matthew',
    'marc': 'mark',
    'luc': 'luke',
    'jean': 'john',
    'actes': 'acts',
    'romains': 'romans',

    '1 corinthiens': '1-corinthians',
    '2 corinthiens': '2-corinthians',

    'galates': 'galatians',
    'ephesiens': 'ephesians',
    'éphésiens': 'ephesians',
    'philippiens': 'philippians',
    'colossiens': 'colossians',

    '1 thessaloniciens': '1-thessalonians',
    '2 thessaloniciens': '2-thessalonians',

    '1 timothee': '1-timothy',
    '1 timothée': '1-timothy',
    '2 timothee': '2-timothy',
    '2 timothée': '2-timothy',

    'tite': 'titus',
    'philemon': 'philemon',
    'philémon': 'philemon',
    'hebreux': 'hebrews',
    'hébreux': 'hebrews',
    'jacques': 'james',

    '1 pierre': '1-peter',
    '2 pierre': '2-peter',

    '1 jean': '1-john',
    '2 jean': '2-john',
    '3 jean': '3-john',

    'jude': 'jude',
    'apocalypse': 'revelation'
  };

  constructor(private http: HttpClient) {}

  /**
   * Récupérer un chapitre complet.
   */
  getChapter(book: string, chapter: number): Observable<BibleChapter> {

    const bookId = this.getBookId(book);

    const url = `${this.API_URL}/${bookId}/${chapter}.json`;

    return this.http.get<BibleChapter>(url);
  }

  /**
   * Transformer le nom français du livre
   * en identifiant API.
   */
  getBookId(book: string): string {

    const normalized = book
      .trim()
      .toLowerCase();

    const bookId = this.books[normalized];

    if (!bookId) {
      throw new Error(`Livre biblique inconnu : ${book}`);
    }

    return bookId;
  }

}