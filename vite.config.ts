import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  // ⭐ custom domain ke liye

  plugins: [react()],
  base: "/scswebsite/", 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});