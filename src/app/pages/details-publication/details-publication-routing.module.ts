import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetailsPublicationPage } from './details-publication.page';

const routes: Routes = [
  {
    path: '',
    component: DetailsPublicationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetailsPublicationPageRoutingModule {}
