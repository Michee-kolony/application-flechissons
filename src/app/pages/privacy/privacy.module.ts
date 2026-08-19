import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PrivacyPageRoutingModule } from './privacy-routing.module';
import { PrivacyPage } from './privacy.page';

@NgModule({
  imports: [CommonModule, IonicModule, PrivacyPageRoutingModule],
  declarations: [PrivacyPage]
})
export class PrivacyPageModule {}
