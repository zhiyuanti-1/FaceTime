import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(() => {
  const env = loadEnv(
    "development",
    fileURLToPath(new URL("../api", import.meta.url)),
    "",
  );
  const apiPort = Number(env.API_PORT || 3000);
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "127.0.0.1",
      port: Number(env.WEB_PORT || 5173),
      proxy: {
        "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
      },
    },
    preview: { host: "127.0.0.1" },
    build: { target: ["chrome120", "edge120", "safari17"] },
  };
});
