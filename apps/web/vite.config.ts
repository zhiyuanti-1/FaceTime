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
  // 端口优先取环境变量（由启动脚本注入），其次 apps/api/.env，最后默认值
  const apiPort = Number(process.env.API_PORT || env.API_PORT || 3000);
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "127.0.0.1",
      port: Number(process.env.WEB_PORT || env.WEB_PORT || 5173),
      proxy: {
        "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
      },
    },
    preview: { host: "127.0.0.1" },
    build: { target: ["chrome120", "edge120", "safari17"] },
  };
});
