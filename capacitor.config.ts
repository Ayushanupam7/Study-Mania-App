import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studymania.app',
  appName: 'Study Mania App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
