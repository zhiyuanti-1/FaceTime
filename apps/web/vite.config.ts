import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const proxyPort = process.env.FACE_API_PROXY_PORT ?? process.env.API_PORT ?? "3000";
if (!/^[0-9]{1,5}$/.test(proxyPort) || Number(proxyPort) < 1 || Number(proxyPort) > 65535) {
  throw new Error("FACE_API_PROXY_PORT 必须为有效的本机端口");
}
const proxy = { "/api/v1": `http://127.0.0.1:${proxyPort}` };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy },
  preview: { host: "127.0.0.1", proxy },
  build: { target: ["chrome120", "edge120", "safari17"] },
});
