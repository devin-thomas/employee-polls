import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/employee-polls/" : "/",
  plugins: [react({ include: /\.[jt]sx?$/ })],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
}));
