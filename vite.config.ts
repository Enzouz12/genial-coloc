import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charge toutes les variables d'environnement, y compris NAVITIA_TOKEN
  // (non préfixé VITE_, donc jamais exposé au client).
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        // L'app appelle /navitia/... ; le proxy ajoute le token et relaie
        // vers api.navitia.io. Évite la fuite du token et les soucis CORS.
        "/navitia": {
          target: "https://api.navitia.io",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/navitia/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.NAVITIA_TOKEN) {
                proxyReq.setHeader("Authorization", env.NAVITIA_TOKEN);
              }
            });
          },
        },
      },
    },
  };
});
