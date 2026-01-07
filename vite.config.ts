import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd());
  
  return {
    base: env.VITE_BASE,
    server: {
      host: "::",
      port: 8080,
      proxy: {
        [env.VITE_DATA_URL] : {
          target : env.VITE_PROXY_TARGET,
          //target : 'http://localhost:5004',
          //rewrite: (path) => path.replace(/^\/dataproc/, ''),
          changeOrigin: true
        },
        [env.VITE_LOGIN_PAGE] : {
          target : env.VITE_PROXY_TARGET,
          changeOrigin: true
        }
      }
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
