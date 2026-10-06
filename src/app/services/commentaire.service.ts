import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CommentaireTempsReel } from './article-realtime.service';

/** Longueur maximale d'un commentaire (même limite que le backend) */
export const COMMENTAIRE_MAX = 500;

/**
 * Modification des commentaires d'un article par leur auteur
 */
@Injectable({ providedIn: 'root' })
export class CommentaireService {

  private readonly urlArticle = 'https://flechissons.com/article';

  constructor(private http: HttpClient) {}

  /** Renvoie le commentaire mis à jour par le serveur */
  modifier(articleId: string, commentaireId: string, utilisateurId: string, contenu: string): Observable<CommentaireTempsReel> {
    return this.http.put<{ success: boolean; message: string; commentaire: CommentaireTempsReel }>(
      `${this.urlArticle}/${articleId}/commentaire/${commentaireId}`,
      { utilisateurId, contenu }
    ).pipe(map(response => response.commentaire));
  }

  /** Message à afficher à l'utilisateur pour une erreur de modification */
  messageErreur(error: HttpErrorResponse): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.status === 0) {
      return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
    }
    return 'Erreur lors de la modification du commentaire.';
  }

  /** Le commentaire a-t-il été modifié après sa publication ? */
  estModifie(commentaire: { createdAt?: string; updatedAt?: string }): boolean {
    return !!commentaire.updatedAt && !!commentaire.createdAt && commentaire.updatedAt !== commentaire.createdAt;
  }

  /** L'utilisateur connecté est-il l'auteur du commentaire ? */
  estAuteur(commentaire: { utilisateurId?: string }, userId: string): boolean {
    return !!userId && String(commentaire.utilisateurId) === String(userId);
  }
}
