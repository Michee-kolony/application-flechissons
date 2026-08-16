import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const onboardingGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);

  const onboardingDone =
    localStorage.getItem('onboarding') === 'true';

  if (onboardingDone) {

    return router.createUrlTree(['/tabs/tab1']);

  }

  return true;
};