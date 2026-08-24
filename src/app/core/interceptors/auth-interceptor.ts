// src/app/core/interceptors/auth-interceptor.ts

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  // =============================================
  // LISTE DES URLS À EXCLURE
  // =============================================

  private excludedUrls: string[] = [
    'free.bible',           // API Bible
    'api.bible',            // Autre API Bible
    'bible-api.com',        // Si vous utilisez
    'googleapis.com',       // Google APIs
    'maps.googleapis.com',  // Google Maps
    'openstreetmap.org',    // OpenStreetMap
    'cloudflare.com'        // CDN
  ];


  // =============================================
  // VÉRIFIER SI L'URL EST EXCLUE
  // =============================================

  private isExcludedUrl(url: string): boolean {

    return this.excludedUrls.some(
      excludedUrl => url.includes(excludedUrl)
    );

  }


  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {

    // =============================================
    // VÉRIFIER SI L'URL EST EXCLUE
    // =============================================

    const isExcluded = this.isExcludedUrl(request.url);


    // =============================================
    // RÉCUPÉRER LE TOKEN
    // =============================================

    const token = localStorage.getItem('token');


    // =============================================
    // CLONER LA REQUÊTE (UNIQUEMENT SI NON EXCLUE)
    // =============================================

    let authRequest = request;

    if (token && !isExcluded) {

      authRequest = request.clone({

        setHeaders: {

          Authorization: `Bearer ${token}`

        }

      });

      console.log(
        '🔐 Token ajouté à la requête:',
        request.url
      );

    } else if (isExcluded) {

      console.log(
        '🚫 URL exclue, pas de token ajouté:',
        request.url
      );

    }


    // =============================================
    // INTERCEPTER LA RÉPONSE
    // =============================================

    return next.handle(authRequest).pipe(

      catchError((error: HttpErrorResponse) => {

        console.error(
          '❌ HTTP Error:',
          error.status,
          error.message,
          'URL:',
          request.url
        );

        // =========================================
        // ERREUR 401 - NON AUTHENTIFIÉ
        // UNIQUEMENT POUR LES URLS DE VOTRE BACKEND
        // =========================================

        if (
          error.status === 401 &&
          !this.isExcludedUrl(request.url)
        ) {

          // Supprimer les données locales
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userId');

          // Rediriger vers login
          this.router.navigateByUrl('/login', {
            replaceUrl: true
          });

        }

        return throwError(() => error);

      })

    );

  }

}