import { defineConfig } from "vite";

// Relative asset paths, so the built game works from any https path it is served under.
export default defineConfig({
  base: "./",
  build: { outDir: "dist", emptyOutDir: true },
});
