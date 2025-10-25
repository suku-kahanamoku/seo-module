import { defineNuxtModule, installModule, hasNuxtModule } from "@nuxt/kit";
import { type OutputOptions } from "rollup";

/**
 * @typedef {Object} ModuleOptions
 * @description
 * Možnosti konfigurace modulu `seo-optimizer-module`.
 *
 * @property {boolean} seoEnabled - Povolení modulu SEO.
 * @property {boolean} nitroCompress - Povolení komprese veřejných souborů Nitro.
 * @property {boolean} nitroMinify - Povolení minifikace Nitro kódu.
 * @property {boolean} disableDeepUseAsyncData - Zakázání hlubokého `useAsyncData`.
 * @property {boolean} criticalCSSEnabled - Povolení generování kritického CSS.
 * @property {boolean} PWAEnabled - Povolení podpory PWA.
 * @property {Record<string, any>} manualChunks - Konfigurace manuálních chunků pro Rollup.
 */
export interface ModuleOptions {
  seoEnabled: boolean;
  nitroCompress: boolean;
  nitroMinify: boolean;
  disableDeepUseAsyncData: boolean;
  criticalCSSEnabled: boolean;
  PWAEnabled: boolean;
  manualChunks: Record<string, any>;
  // Additional SEO-related options
  sitemapEnabled?: boolean;
  robotsEnabled?: boolean;
}

/**
 * @module seo-optimizer-module
 * @description
 * Tento modul optimalizuje Nuxt aplikaci pro SEO a výkon. Přidává podporu pro SEO, PWA, kritické CSS,
 * kompresi a minifikaci kódu a další optimalizace.
 *
 * @example
 * ```typescript
 * export default defineNuxtConfig({
 *   seoOptimizerModule: {
 *     seoEnabled: true,
 *   },
 * });
 * ```
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "seo-optimizer-module", // Název modulu
    configKey: "seoOptimizerModule", // Klíč pro konfiguraci v Nuxt configu
  },

  // Výchozí možnosti konfigurace Nuxt modulu
  defaults: {
    seoEnabled: true,
    nitroCompress: true,
    nitroMinify: true,
    disableDeepUseAsyncData: true,
    criticalCSSEnabled: true,
    PWAEnabled: true,
    manualChunks: {
      enabled: false,
      rootComponents: [
        "nuxt-root.vue",
        "nuxt-error-page.vue",
        "error-500",
        "error-404.vue",
      ],
    },
    // SEO-related defaults
    sitemapEnabled: true,
    robotsEnabled: true,
  },

  /**
   * @function setup
   * @description
   * Hlavní funkce modulu, která nastavuje optimalizace a přidává potřebné moduly.
   *
   * @param {ModuleOptions} _options - Uživatelské možnosti konfigurace.
   * @param {Nuxt} _nuxt - Instance Nuxt aplikace.
   */
  async setup(_options, _nuxt) {
    // SEO
    if (_options.seoEnabled) {
      if (!hasNuxtModule("@nuxtjs/seo")) {
        await installModule("@nuxtjs/seo"); // Instalace modulu SEO
      }
    }

    // Critical CSS
    if (_options.criticalCSSEnabled) {
      if (!hasNuxtModule("@nuxtjs/critters")) {
        await installModule("@nuxtjs/critters"); // Instalace modulu pro kritické CSS
      }
    }

    // PWA
    if (_options.PWAEnabled) {
      if (!hasNuxtModule("@vite-pwa/nuxt")) {
        await installModule("@vite-pwa/nuxt"); // Instalace modulu PWA
      }
    }

    // Sitemap, Robots optimization modules (optional)
    if (_options.sitemapEnabled) {
      if (!hasNuxtModule("@nuxtjs/sitemap")) {
        // Sitemap generation helps crawlers discover pages
        await installModule("@nuxtjs/sitemap");
      }
    }

    if (_options.robotsEnabled) {
      if (!hasNuxtModule("@nuxtjs/robots")) {
        // Provide robots.txt for crawler control
        await installModule("@nuxtjs/robots");
      }
    }

    // Add a couple of default link tags useful for SEO/performance
    _nuxt.options.app.head.link = _nuxt.options.app.head.link || [];
    const links = _nuxt.options.app.head.link;
    const pushLinkIfMissing = (attrs: Record<string, any>) => {
      // ignore invalid attrs
      if (!attrs || !attrs.rel) return;

      // If href is provided, match by rel+href; otherwise match by rel only
      const matcher = (l: any) =>
        attrs.href
          ? l.rel === attrs.rel && l.href === attrs.href
          : l.rel === attrs.rel;
      const existing = links.find(matcher);

      if (existing) {
        // merge attributes so we don't lose useful flags like crossorigin/as/type
        Object.assign(existing, attrs);
      } else {
        links.push(attrs);
      }
    };

    // Preconnect to Google Fonts (common optimization) — harmless if not used
    pushLinkIfMissing({
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossorigin: true,
    });
    // Basic manifest link (if PWA enabled it may supply its own)
    if (_options.PWAEnabled) {
      pushLinkIfMissing({ rel: "manifest", href: "/manifest.webmanifest" });
    }
    _nuxt.options.app.head.link = links;

    // Konfigurace manuálních chunků
    if (_options.manualChunks.enabled) {
      _nuxt.hook("vite:extendConfig", (viteConfig, env) => {
        const chunks = Object.entries(_options.manualChunks);

        if (
          !chunks.length ||
          !env.isClient ||
          process.env.NODE_ENV !== "production"
        )
          return;

        (
          viteConfig.build!.rollupOptions!.output as OutputOptions
        ).manualChunks = (_id: string) => {
          for (const [name, ids] of chunks) {
            for (const id of ids) {
              if (_id.includes(id)) {
                return name;
              }
            }
          }
        };
      });
    }

    // Nitro konfigurace
    _nuxt.hook("nitro:config", (nitroConfig) => {
      // Komprese veřejných souborů
      if (_options.nitroCompress) {
        nitroConfig.compressPublicAssets = true;
      }

      // Minifikace Nitro kódu
      if (_options.nitroMinify) {
        nitroConfig.minify = true;
      }

      // Route rules for caching static assets and adding an optimization header
      nitroConfig.routeRules = nitroConfig.routeRules || {};
      // Long cache for immutable static assets
      nitroConfig.routeRules["/**/*.{js,css,svg,png,jpg,jpeg,webp,ico,woff2}"] =
        nitroConfig.routeRules[
          "/**/*.{js,css,svg,png,jpg,jpeg,webp,ico,woff2}"
        ] || {
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        };
      // Short cache for HTML (can be overridden per-route)
      nitroConfig.routeRules["/**"] = nitroConfig.routeRules["/**"] || {
        headers: { "cache-control": "public, max-age=0, must-revalidate" },
      };
      // Add a small identifying header
      const globalRule = nitroConfig.routeRules["/**"];
      if (globalRule && globalRule.headers) {
        globalRule.headers["x-optimized-by"] = "seo-optimizer-module";
      }
    });

    // Zakázání hlubokého `useAsyncData`
    if (_options.disableDeepUseAsyncData) {
      _nuxt.options.experimental.defaults.useAsyncData.deep = false;
    }
  },
});
