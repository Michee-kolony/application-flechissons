import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit, OnDestroy {

  loadingMessages = [
    'Préparation de votre espace...',
    'Chargement des contenus...',
    'Synchronisation des données...',
    'Personnalisation de votre expérience...',
    'Presque prêt...'
  ];

  currentMessage = 0;

  private messageInterval: any;
  private redirectTimeout: any;

  constructor(
    private router: Router
  ) {}

  ngOnInit() {

    /*
     * Changement du texte toutes les secondes
     */
    this.messageInterval = setInterval(() => {

      this.currentMessage =
        (this.currentMessage + 1) %
        this.loadingMessages.length;

    }, 1000);


    /*
     * Après quelques secondes,
     * on quitte le splash.
     */
    this.redirectTimeout = setTimeout(() => {

      this.router.navigate(['/onboarding']);

    }, 5000);

  }

  ngOnDestroy() {

    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }

    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }

  }

}