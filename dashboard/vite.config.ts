import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": backend } },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    coverage: {
      include: ["src/**"],
      exclude: ["src/main.tsx", "src/test-setup.ts"],
      thresholds: { statements: 80 },
    },
  },
});
