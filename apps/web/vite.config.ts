import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps, context) {
        if (context.hostType !== "html") {
          return deps;
        }

        return deps.filter((dependency) => {
          const normalizedDependency = dependency.replaceAll("\\", "/");
          return !normalizedDependency.startsWith("assets/attendance-");
        });
      }
    },
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");

          if (normalizedId.includes("driver.js")) {
            return "onboarding";
          }

          if (
            normalizedId.includes("framer-motion") ||
            normalizedId.includes("motion-dom") ||
            normalizedId.includes("motion-utils")
          ) {
            return "motion";
          }

          if (
            normalizedId.includes("react-hook-form") ||
            normalizedId.includes("@hookform/resolvers") ||
            normalizedId.includes("/zod/")
          ) {
            return "forms";
          }

          if (
            normalizedId.includes("/features/onboarding/") ||
            normalizedId.includes("/features/public-onboarding/")
          ) {
            return "onboarding";
          }

          if (
            normalizedId.includes("/layouts/dashboard-layout") ||
            normalizedId.includes("/pages/dashboard-page")
          ) {
            return "dashboard";
          }

          if (
            normalizedId.includes("/pages/members-page") ||
            normalizedId.includes("/components/member-card") ||
            normalizedId.includes("/pages/member-detail-page")
          ) {
            return "members";
          }

          if (normalizedId.includes("/pages/attendance-page")) {
            return "attendance";
          }

          if (normalizedId.includes("/packages/api-client/")) {
            return "api-client";
          }

          if (normalizedId.includes("node_modules")) {
            if (normalizedId.includes("lucide-react")) return "icons";
            if (normalizedId.includes("@tanstack")) return "react-query";
            if (
              normalizedId.includes("openapi-fetch") ||
              normalizedId.includes("set-cookie-parser") ||
              normalizedId.includes("/cookie/")
            ) {
              return "api-client";
            }
            if (
              normalizedId.includes("/react/") ||
              normalizedId.includes("/react-dom/") ||
              normalizedId.includes("/react-router/") ||
              normalizedId.includes("/react-router-dom/") ||
              normalizedId.includes("/scheduler/")
            ) {
              return "react-vendor";
            }
            return "vendor";
          }

          return undefined;
        }
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      open: true,
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true
    }) as PluginOption
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
