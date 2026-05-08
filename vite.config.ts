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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          // React runtime — must be isolated, everything depends on it
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("react/jsx-runtime")
          ) return "vendor-react";

          // Radix UI — large set of headless primitives
          if (id.includes("@radix-ui")) return "vendor-radix";

          // Charting (Recharts + d3)
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";

          // PDF/print/export
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("react-to-print")) return "vendor-pdf";

          // Date handling
          if (id.includes("date-fns")) return "vendor-date";

          // Animation runtime
          if (id.includes("framer-motion")) return "vendor-motion";

          // Supabase client + react-query
          if (id.includes("@supabase") || id.includes("@tanstack/react-query")) return "vendor-data";

          // Icons
          if (id.includes("lucide-react")) return "vendor-icons";

          // Router
          if (id.includes("react-router")) return "vendor-router";

          // Attendance heatmap calendar (used in UserProfile + Leave)
          if (id.includes("react-activity-calendar")) return "vendor-calendar";

          // Excel export (used in Tasks, FinanceDashboard, OpsDashboard)
          if (id.includes("/xlsx/") || id.includes("\\xlsx\\") || id.includes("node_modules/xlsx")) return "vendor-xlsx";

          // Firebase (auth + firestore) — two packages: firebase + @firebase
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) return "vendor-firebase";

          // Everything else
          return "vendor-misc";
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },


}));
