import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { MessageriePage } from './messagerie.page';
import { ConversationPage } from './conversation.page';

const routes: Routes = [
  { path: '', component: MessageriePage },
  { path: ':id', component: ConversationPage }
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [MessageriePage, ConversationPage]
})
export class MessageriePageModule {}
