import { Injectable } from '@angular/core';

/**
 * Fond d'écran des conversations, choisi par l'utilisateur.
 * Enregistré uniquement sur l'appareil (localStorage) : rien n'est envoyé au serveur.
 *
 * - un fond « global » pour toutes les conversations,
 * - éventuellement un fond propre à une conversation (prioritaire).
 */
export type FondEcran =
  | { type: 'image'; donnees: string }   // photo de l'appareil (data URL JPEG compressée)
  | { type: 'preset'; id: string };      // fond prêt à l'emploi

export interface FondPreset {
  id: string;
  libelle: string;
  css: string;
}

/** Fonds prêts à l'emploi (la touche Fléchissons) */
export const FONDS_PRESETS: FondPreset[] = [
  { id: 'aube', libelle: 'Aube', css: 'linear-gradient(160deg, #ffe7d1 0%, #ffd0b0 45%, #f7a072 100%)' },
  { id: 'creme', libelle: 'Crème', css: 'linear-gradient(180deg, #fbf4ea 0%, #f3e5d3 100%)' },
  { id: 'ciel', libelle: 'Ciel', css: 'linear-gradient(170deg, #dff1ff 0%, #b9dcf7 55%, #8ec5ee 100%)' },
  { id: 'olivier', libelle: 'Olivier', css: 'linear-gradient(165deg, #eef3e2 0%, #cfdcb4 60%, #a9bf86 100%)' },
  { id: 'lavande', libelle: 'Lavande', css: 'linear-gradient(165deg, #f1eaff 0%, #d9c9f5 55%, #b9a2e6 100%)' },
  { id: 'nuit', libelle: 'Nuit', css: 'linear-gradient(170deg, #1d1b2f 0%, #2c2547 55%, #4a2c3f 100%)' }
];

const CLE_GLOBAL = 'fond_conversations';
const cleConversation = (id: string) => `fond_conversation_${id}`;

@Injectable({ providedIn: 'root' })
export class FondEcranService {

  /** Fond à afficher pour une conversation (le sien, sinon le global, sinon null = fond par défaut) */
  pour(conversationId: string): FondEcran | null {
    return this.lire(cleConversation(conversationId)) ?? this.lire(CLE_GLOBAL);
  }

  /** La conversation a-t-elle son propre fond ? */
  aFondPropre(conversationId: string): boolean {
    return !!this.lire(cleConversation(conversationId));
  }

  /**
   * Enregistre un fond. `conversationId` null = toutes les conversations.
   * Retourne false si l'appareil manque de place.
   */
  definir(fond: FondEcran, conversationId: string | null): boolean {
    const cle = conversationId ? cleConversation(conversationId) : CLE_GLOBAL;
    try {
      localStorage.setItem(cle, JSON.stringify(fond));
      return true;
    } catch {
      return false;
    }
  }

  /** Revenir au fond par défaut (pour une conversation, ou pour toutes) */
  reinitialiser(conversationId: string | null): void {
    localStorage.removeItem(conversationId ? cleConversation(conversationId) : CLE_GLOBAL);
  }

  /** Valeur CSS « background » d'un fond (avec un voile sombre en mode sombre pour la lisibilité) */
  css(fond: FondEcran, sombre: boolean): string {
    const voile = sombre
      ? 'linear-gradient(rgba(0, 0, 0, .38), rgba(0, 0, 0, .38))'
      : 'linear-gradient(rgba(255, 255, 255, .06), rgba(255, 255, 255, .06))';

    if (fond.type === 'image') {
      return `${voile}, url("${fond.donnees}") center / cover no-repeat`;
    }
    const preset = FONDS_PRESETS.find(p => p.id === fond.id);
    return preset ? `${voile}, ${preset.css}` : '';
  }

  private lire(cle: string): FondEcran | null {
    try {
      const brut = localStorage.getItem(cle);
      if (!brut) {
        return null;
      }
      const fond = JSON.parse(brut) as FondEcran;
      if (fond?.type === 'image' && typeof fond.donnees === 'string' && fond.donnees.startsWith('data:image/')) {
        return fond;
      }
      if (fond?.type === 'preset' && FONDS_PRESETS.some(p => p.id === fond.id)) {
        return fond;
      }
      return null;
    } catch {
      return null;
    }
  }
}
