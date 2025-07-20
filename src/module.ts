import { defineNuxtModule, installModule, hasNuxtModule } from "@nuxt/kit";
import { type OutputOptions } from "rollup";

/**
 * @typedef {Object} ModuleOptions
 * @description
 * Možnosti konfigurace modulu `seo-optimizer-module`.
 *
 * @property {boolean} seoEnabled - Povolení modulu SEO.
 * @property {boolean} dropConsole - Odstranění `console.log` z produkčního kódu.
 * @property {boolean} nitroCompress - Povolení komprese veřejných souborů Nitro.
 * @property {boolean} nitroMinify - Povolení minifikace Nitro kódu.
 * @property {boolean} disableDeepUseAsyncData - Zakázání hlubokého `useAsyncData`.
 * @property {boolean} criticalCSSEnabled - Povolení generování kritického CSS.
 * @property {boolean} PWAEnabled - Povolení podpory PWA.
 * @property {Record<string, any>} manualChunks - Konfigurace manuálních chunků pro Rollup.
 */
export interface ModuleOptions {
  seoEnabled: boolean;
  dropConsole: boolean;
  nitroCompress: boolean;
  nitroMinify: boolean;
  disableDeepUseAsyncData: boolean;
  criticalCSSEnabled: boolean;
  PWAEnabled: boolean;
  manualChunks: Record<string, any>;
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
 *     dropConsole: true,
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
    dropConsole: true,
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

    // Odstranění `console.log` z produkčního kódu
    if (_options.dropConsole) {
      _nuxt.hook("vite:extendConfig", (viteConfig) => {
        viteConfig.esbuild ||= {};
        viteConfig.esbuild.pure ||= [];
        viteConfig.esbuild.pure.push("console.log");
      });
    }

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
    });

    // Zakázání hlubokého `useAsyncData`
    if (_options.disableDeepUseAsyncData) {
      _nuxt.options.experimental.defaults.useAsyncData.deep = false;
    }
  },
});
