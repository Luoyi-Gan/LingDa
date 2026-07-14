import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * PostCSS 插件：把历史样式中的 `rpx` 单位整体改写成 `calc(var(--rpx) * N)`。
 * 这样原 WXSS 几乎可以 1:1 粘过来，rpx 数值不用手改，
 * 真机/桌面响应式由 global.scss 里的 --rpx 变量统一控制。
 */
function rpxToVar() {
  const RPX = /(-?\d*\.?\d+)rpx/g;
  return {
    postcssPlugin: 'postcss-rpx-to-var',
    Declaration(decl) {
      if (decl.value && decl.value.includes('rpx')) {
        decl.value = decl.value.replace(RPX, 'calc(var(--rpx) * $1)');
      }
    },
  };
}
rpxToVar.postcss = true;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    // 注：tailwind 先于 rpxToVar 处理 @tailwind 指令并生成 utility，rpxToVar 仅触达旧 .module.scss
    postcss: { plugins: [tailwindcss(), rpxToVar(), autoprefixer()] },
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  // 生产预览：单端口同时托管前端 + 反代 /api 到本机后端，
  // 这样一条 cloudflared 隧道即可对外（同源、无跨域、无混合内容）。
  preview: {
    port: 4173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    // 允许任意 *.trycloudflare.com 主机访问（隧道地址会变）
    allowedHosts: true,
  },
});
