import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // L'injection suffit à initialiser le thème au démarrage (voir constructeur du service)
  constructor(private themeService: ThemeService) {
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setOverlaysWebView({ overlay: false });
    }
  }
}
