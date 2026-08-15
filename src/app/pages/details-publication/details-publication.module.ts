import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DetailsPublicationPageRoutingModule } from './details-publication-routing.module';

import { DetailsPublicationPage } from './details-publication.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetailsPublicationPageRoutingModule
  ],
  declarations: [DetailsPublicationPage]
})
export class DetailsPublicationPageModule {}
