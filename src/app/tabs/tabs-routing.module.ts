import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadChildren: () => import('../tab1/tab1.module').then(m => m.Tab1PageModule)
      },
      {
        path: 'tab2',
        loadChildren: () => import('../tab2/tab2.module').then(m => m.Tab2PageModule)
      },
      {
        path: 'tab3',
        loadChildren: () => import('../tab3/tab3.module').then(m => m.Tab3PageModule)
      },
      {
        path:'contact',
        loadChildren: () => import('../pages/contact/contact.module').then(m => m.ContactPageModule)
      },
      {
        path:'profil',
        loadChildren: () => import('../pages/profil/profil.module').then(m => m.ProfilPageModule)
      },
      {
        path:'live',
        loadChildren: () => import('../pages/live/live.module').then(m => m.LivePageModule)
      },
      {
        path:'details-publication',
        loadChildren: () => import('../pages/details-publication/details-publication.module').then(m => m.DetailsPublicationPageModule)
      },
      {
        path: '',
        redirectTo: '/splash',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/splash',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
