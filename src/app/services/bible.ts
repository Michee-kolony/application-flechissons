import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';

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

export interface VersetDuJour {
  /** Date du jour (AAAA-MM-JJ) : le verset change à minuit */
  date: string;
  texte: string;
  /** Référence affichée, ex. « Jean 3:16 » */
  reference: string;
}

/**
 * Versets proposés comme « verset du jour » : [livre (clé de `books`), chapitre, verset].
 * Un tirage dans toute la Bible tomberait souvent sur des généalogies ou des
 * morceaux de phrase ; le texte, lui, vient toujours de l'API.
 */
const VERSETS_DU_JOUR: [string, number, number][] = [
  ['jean', 3, 16], ['jean', 14, 6], ['jean', 14, 27], ['jean', 8, 32], ['jean', 10, 10],
  ['jean', 15, 5], ['jean', 16, 33], ['jean', 11, 25], ['jean', 1, 12], ['jean', 6, 35],
  ['psaumes', 23, 4], ['psaumes', 27, 14], ['psaumes', 46, 2], ['psaumes', 37, 5], ['psaumes', 91, 1],
  ['psaumes', 119, 105], ['psaumes', 121, 2], ['psaumes', 34, 9], ['psaumes', 55, 23], ['psaumes', 118, 24],
  ['psaumes', 16, 8], ['psaumes', 62, 2], ['psaumes', 103, 2], ['psaumes', 139, 14], ['psaumes', 30, 6],
  ['proverbes', 3, 5], ['proverbes', 3, 6], ['proverbes', 16, 3], ['proverbes', 18, 10], ['proverbes', 4, 23],
  ['ésaïe', 40, 31], ['ésaïe', 41, 10], ['ésaïe', 43, 2], ['ésaïe', 26, 3], ['ésaïe', 54, 10],
  ['jérémie', 29, 11], ['jérémie', 33, 3], ['lamentations', 3, 22], ['josué', 1, 9], ['deutéronome', 31, 6],
  ['nombres', 6, 24], ['sophonie', 3, 17], ['michée', 6, 8], ['habacuc', 3, 19], ['nahum', 1, 7],
  ['matthieu', 6, 33], ['matthieu', 11, 28], ['matthieu', 5, 9], ['matthieu', 7, 7], ['jean', 13, 34],
  ['marc', 9, 23], ['marc', 11, 24], ['luc', 1, 37], ['luc', 6, 31],
  ['romains', 8, 28], ['romains', 8, 31], ['romains', 8, 38], ['romains', 12, 2], ['romains', 12, 12],
  ['romains', 15, 13], ['romains', 5, 8], ['romains', 10, 9],
  ['1 corinthiens', 13, 4], ['1 corinthiens', 10, 13], ['1 corinthiens', 16, 14], ['2 corinthiens', 5, 17],
  ['2 corinthiens', 12, 9], ['galates', 2, 20], ['galates', 5, 22], ['galates', 6, 9],
  ['éphésiens', 2, 8], ['éphésiens', 3, 20], ['éphésiens', 6, 10], ['philippiens', 4, 13],
  ['philippiens', 4, 6], ['philippiens', 4, 7], ['philippiens', 1, 6], ['colossiens', 3, 23],
  ['1 thessaloniciens', 5, 16], ['2 timothée', 1, 7], ['hébreux', 11, 1], ['hébreux', 13, 5],
  ['hébreux', 4, 16], ['jacques', 1, 5], ['jacques', 4, 8], ['1 pierre', 5, 7],
  ['1 jean', 4, 18], ['1 jean', 1, 9], ['1 jean', 4, 19], ['apocalypse', 21, 4]
];

const VERSET_CACHE_KEY = 'verset_du_jour';

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
   * Verset du jour : tiré au hasard, mais le même toute la journée pour tout le monde.
   * Mis en cache : l'API n'est appelée qu'une fois par jour.
   */
  getVersetDuJour(): Observable<VersetDuJour> {
    const maintenant = new Date();
    const date = [
      maintenant.getFullYear(),
      String(maintenant.getMonth() + 1).padStart(2, '0'),
      String(maintenant.getDate()).padStart(2, '0')
    ].join('-');

    const cache = this.lireVersetEnCache();
    if (cache?.date === date) {
      return of(cache);
    }

    // Numéro du jour mélangé : l'ordre des versets paraît aléatoire d'un jour à l'autre
    const jour = Math.floor(Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()) / 86400000);
    const index = Math.imul(jour, 2654435761) >>> 0;
    const [livre, chapitre, verset] = VERSETS_DU_JOUR[index % VERSETS_DU_JOUR.length];

    return this.getChapter(livre, chapitre).pipe(
      map(data => {
        const trouve = data.verses?.find(v => Number(v.v) === verset);
        if (!trouve?.t) {
          throw new Error(`Verset introuvable : ${livre} ${chapitre}:${verset}`);
        }
        return {
          date,
          texte: this.majuscule(trouve.t.trim()),
          reference: `${this.nomAffiche(livre)} ${chapitre}:${verset}`
        };
      }),
      tap(resultat => {
        try {
          localStorage.setItem(VERSET_CACHE_KEY, JSON.stringify(resultat));
        } catch {
          // Cache facultatif
        }
      })
    );
  }

  /** Dernier verset du jour connu (affiché hors connexion, même s'il date d'hier) */
  lireVersetEnCache(): VersetDuJour | null {
    try {
      return JSON.parse(localStorage.getItem(VERSET_CACHE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  /** Certains versets commencent en milieu de phrase (« et déchargez-vous… ») */
  private majuscule(texte: string): string {
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  /** « 1 corinthiens » → « 1 Corinthiens » */
  private nomAffiche(livre: string): string {
    return livre.replace(/(^|\s)(\p{L})/gu, (_, espace, lettre) => espace + lettre.toUpperCase());
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