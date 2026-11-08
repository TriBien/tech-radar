import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH is set by the deploy workflow for GitHub Pages project sites
// (e.g. "/tech-radar/"). Custom domains can leave it as "/".
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
