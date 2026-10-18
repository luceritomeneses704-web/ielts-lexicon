import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // 相对路径：部署到 GitHub Pages 子路径（/仓库名/）时资源也能正确加载
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // 大型词库拆为独立 chunk：首屏不加载，切词典/查词时才动态 import
      rollupOptions: {
        output: {
          manualChunks(id) {
            // ECDICT 补充词库（26 万词）：独立 chunk，只有牛津查不到时才下载
            if (id.includes('data/ecdictSupplement')) return 'ecdict-supplement';
            // 西语词库 3.8MB：仅在切换到西语词典时加载
            if (id.includes('data/spanishLexicon')) return 'spanish-lexicon';
            if (id.includes('data/oxfordLexicon')) return 'oxford-lexicon';
            if (id.includes('data/cambridgeIeltsExamBank')) return 'cambridge-bank';
            if (id.includes('data/')) return 'lexicon-bundle';
            return undefined;
          },
        },
      },
    },
  };
});
