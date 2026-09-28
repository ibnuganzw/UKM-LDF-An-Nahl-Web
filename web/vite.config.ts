import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'exclude-unreviewed-surah-notes',
      apply: 'build',
      transform(_code, id) {
        if (id.replace(/\\/g, '/').endsWith('/src/data/surahInfo.ts')) {
          throw new Error('Unreviewed surah notes cannot be imported into a public build.');
        }
      },
    },
  ],
  server: {
    port: Number(process.env.PORT) || 5174,
    strictPort: true,
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/public/assets/fonts/**', '**/.cache/**']
    }
  },
})
