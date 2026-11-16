import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.notchx.remote',
  appName: 'NotchX',
  webDir: 'dist',
  server: {
    url: 'https://notchx.netlify.app',
    cleartext: false
  }
};

export default config;
