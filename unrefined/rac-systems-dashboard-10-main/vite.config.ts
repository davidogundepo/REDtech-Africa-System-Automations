import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split heavy shared vendors into their own long-cache chunks so the
    // main bundle stays small and updates to app code don't bust vendor cache.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          // CRITICAL: React must live in the same chunk as anything that
          // reads React.forwardRef at module top-level (Radix, etc.) to
          // avoid "Cannot read properties of undefined (reading 'forwardRef')"
          // caused by chunk-evaluation ordering.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("react/jsx-runtime") ||
            id.includes("@radix-ui")
          ) return "vendor-core";
          // Charting (Recharts + d3) is by far the heaviest dep
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          // PDF/print/export workflows
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("react-to-print")) return "vendor-pdf";
          // Date handling
          if (id.includes("date-fns")) return "vendor-date";
          // Animation runtime
          if (id.includes("framer-motion")) return "vendor-motion";
          // Supabase client + auth
          if (id.includes("@supabase") || id.includes("@tanstack/react-query")) return "vendor-data";
          // Icons
          if (id.includes("lucide-react")) return "vendor-icons";
          // Everything else (router, utils, etc.) → vendor-core
          return "vendor-core";
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
}));
