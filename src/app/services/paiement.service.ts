import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export type Devise = 'USD' | 'CDF';
export type Operateur = 'mpesa' | 'orange' | 'airtel';
export type TypeContribution = 'offrande' | 'dime' | 'don' | 'action_de_graces' | 'mission' | 'autre';
export type StatutPaiement = 'en_attente' | 'reussi' | 'echoue';

export interface DemandePaiement {
  montant: number;
  devise: Devise;
  operateur: Operateur;
  /** 9 chiffres, sans l'indicatif +243 */
  telephone: string;
  objet: string;
  description?: string;
  type?: TypeContribution;
  nom?: string;
}

export interface Paiement {
  depositId: string;
  reference: string;
  type: TypeContribution;
  objet: string;
  montant: number;
  devise: Devise;
  operateur: Operateur;
  statut: StatutPaiement;
  /** Raison de l'échec, à afficher au fidèle */
  message: string | null;
  createdAt: string;
  dateFinalisation: string | null;
}

interface ReponsePaiement {
  success: boolean;
  message?: string;
  paiement: Paiement;
}

/**
 * Paiements Mobile Money via PawaPay (backend : /api/pawapay).
 * Le JWT est ajouté par l'intercepteur si le fidèle est connecté :
 * le paiement est alors rattaché à son compte.
 */
@Injectable({ providedIn: 'root' })
export class PaiementService {

  private readonly url = 'https://flechissons.com/api/pawapay';

  constructor(private http: HttpClient) {}

  /** Lance le paiement : le fidèle reçoit la demande de code PIN sur son téléphone */
  lancer(demande: DemandePaiement): Observable<ReponsePaiement> {
    return this.http.post<ReponsePaiement>(`${this.url}/depot`, demande);
  }

  /** Statut actuel du paiement */
  statut(depositId: string): Observable<Paiement> {
    return this.http
      .get<ReponsePaiement>(`${this.url}/depot/${encodeURIComponent(depositId)}`)
      .pipe(map(reponse => reponse.paiement));
  }

  /** Message d'erreur lisible pour le fidèle */
  messageErreur(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Connexion impossible. Vérifiez votre connexion Internet et réessayez.';
    }
    return error.error?.message || 'Le paiement n\'a pas pu être lancé. Veuillez réessayer.';
  }
}
