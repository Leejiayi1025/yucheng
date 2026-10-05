import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 构建产物输出到 前端/dist，由后端 Express 托管（http://localhost:4000/）
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
