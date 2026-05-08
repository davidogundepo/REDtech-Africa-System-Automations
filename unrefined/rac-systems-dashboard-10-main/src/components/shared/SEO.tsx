import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
}

const BASE = "RAC Automations";

/**
 * Lightweight per-page SEO helper.
 * - Sets <title> as "<page> · RAC Automations"
 * - Updates the <meta name="description"> tag
 * - Maintains a single <link rel="canonical"> matching the current URL
 *
 * No external deps (we don't pull react-helmet just for this).
 */
export function SEO({ title, description }: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${BASE}` : BASE;
    document.title = fullTitle;

    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description.slice(0, 158);
    }

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href.split("?")[0].split("#")[0];
  }, [title, description]);

  return null;
}
