import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { ThemeService } from './services/theme.service';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // L'injection suffit à initialiser le thème au démarrage (voir constructeur du service)
  constructor(
    private themeService: ThemeService,
    private pushNotificationService: PushNotificationService
  ) {
    // iOS : la page passe sous la barre d'état et les headers réservent
    // var(--ion-safe-area-top). Sans overlay, iOS met une bande noire derrière
    // l'heure et la batterie, illisibles en mode clair.
    if (Capacitor.getPlatform() === 'android') {
      void StatusBar.setOverlaysWebView({ overlay: false });
    }
    // Notifications push : permission, token, clic sur une notification
    void this.pushNotificationService.initialiser();
  }
}
