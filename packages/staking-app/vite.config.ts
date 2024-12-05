import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/main.tsx',
      name: 'poc-app',
      fileName: (format) => `poc-app.${format}.js`,
      formats: ['es', 'umd'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['react', 'react-dom'],
      input: './src/main.tsx',
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    }
  }
})
