import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss()],
  base: "/local-harper/",
  server: {
    headers: {
      // Required for SharedArrayBuffer (WASM threading in harper.js)
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: {
    exclude: ["harper.js"],
  },
  build: {
    target: "esnext",
  },
});
