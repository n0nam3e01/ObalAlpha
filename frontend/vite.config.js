import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tunnel hosts (ngrok etc.) come from VITE_DEV_ALLOWED_HOSTS as a
// comma-separated list, so a throwaway dev URL never gets committed.
const allowedHosts = (process.env.VITE_DEV_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3000' },
    allowedHosts,
  },
});
