import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FluxVideoConfig, Tab3Page } from './tab3.page';

// Le même flux vidéo sert aux prédications et aux exhortations.
// Les deux routes restent sous /tabs/tab3 pour garder l'onglet actif.
const predications: FluxVideoConfig = {
  type: 'predications',
  titre: 'Prédications',
  kicker: 'PAROLE DE VIE',
  singulier: 'prédication'
};

const exhortations: FluxVideoConfig = {
  type: 'exhortations',
  titre: 'Exhortations',
  kicker: 'ENCOURAGEMENT',
  singulier: 'exhortation'
};

const routes: Routes = [
  {
    path: '',
    component: Tab3Page,
    data: { flux: predications }
  },
  {
    path: 'exhortations',
    component: Tab3Page,
    data: { flux: exhortations }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Tab3PageRoutingModule {}
