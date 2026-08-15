import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ayemtech.flechissons',
  appName: 'flechissons',
  webDir: 'www',
  plugins: {
    YoutubePlayer: {
      patchRefererHeader: true,
      refererHeader: 'https://www.youtube.com'
    }
  }
};

export default config;