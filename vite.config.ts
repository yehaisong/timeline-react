import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  if (mode === 'library') {
    return {
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: 'src/index.ts',
          formats: ['es'],
          fileName: 'index',
          cssFileName: 'styles',
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
        },
      },
    };
  }

  return {
    plugins: [react()],
    build: {
      outDir: 'dist-demo',
      emptyOutDir: true,
    },
  };
});
