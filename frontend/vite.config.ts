import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Порт фронтенда фиксируем на 5173 — этот origin разрешён в CORS на backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
