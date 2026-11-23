import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/app.[ext]"
      }
    }
  }
});