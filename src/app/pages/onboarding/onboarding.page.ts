import {
  AfterViewInit,
  Component,
  OnDestroy
} from '@angular/core';

import { Router } from '@angular/router';

import Splide from '@splidejs/splide';


@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false
})
export class OnboardingPage
  implements AfterViewInit, OnDestroy {


  private splide?: Splide;


  constructor(
    private router: Router
  ) {}


  ngAfterViewInit(): void {

    this.splide = new Splide(
      '#onboarding-slider',
      {

        type: 'slide',

        perPage: 1,

        perMove: 1,

        arrows: false,

        pagination: true,

        rewind: false,

        drag: true,

        speed: 700,

        autoplay: false,

        keyboard: true,

        pauseOnHover: false,

        pauseOnFocus: false

      }
    );


    this.splide.mount();

  }


  /**
   * Termine l'onboarding.
   *
   * Cette méthode est appelée lorsque
   * l'utilisateur clique sur "Commencer"
   * ou "Passer".
   */
  finishOnboarding(): void {

    // On indique que l'onboarding a déjà été vu
    localStorage.setItem(
      'onboarding',
      'true'
    );


    // Redirection vers la connexion
    this.router.navigateByUrl('/login');

  }


  ngOnDestroy(): void {

    if (this.splide) {

      this.splide.destroy();

    }

  }

}