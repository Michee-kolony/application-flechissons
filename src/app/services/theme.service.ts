import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private mode: ThemeMode = 'system';
  private media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    this.mode = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';

    this.media.addEventListener('change', () => {
      if (this.mode === 'system') {
        this.applyIsDark(this.media.matches);
      }
    });

    this.applyIsDark(this.isDark);
  }

  get currentMode(): ThemeMode {
    return this.mode;
  }

  get isDark(): boolean {
    return this.mode === 'dark' || (this.mode === 'system' && this.media.matches);
  }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    this.applyIsDark(this.isDark);
  }

  private applyIsDark(isDark: boolean): void {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      }).catch(() => {});
    }
  }
}
