import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-64.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "설계잇츠me",
        short_name: "설계잇츠me",
        description: "설계잇츠me — 사다리로 설계 몰빵 매니저를 정해요.",
        lang: "ko",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fff6e5",
        theme_color: "#fff6e5",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webp}"],
        // 기록 API 는 서비스워커가 index.html 로 바꿔치지 않게
        navigateFallbackDenylist: [/^\/api\//],
        // 폰트는 유니코드 조각이 많아서 미리 받지 않고, 쓰는 조각만 캐시
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: { cacheName: "fonts", expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],
  // npm run dev 일 때도 기록은 맥 서버(npm run server)로 보낸다
  server: { proxy: { "/api": "http://localhost:4173" } },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
