import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF d'abord, WebP en repli (brief §07 Performance).
    formats: ["image/avif", "image/webp"],
    // Largeurs alignées sur les breakpoints 600 / 900 px (et leur double pour les écrans HiDPI).
    deviceSizes: [600, 900, 1200, 1800, 2400],
    imageSizes: [320, 480],
    // Grain du bois : pas de qualité inférieure à 80.
    qualities: [80],
  },
  turbopack: {
    // msw/browser exclut la condition "node" ; le passage SSR du composant client
    // MocksProvider ne pourrait donc pas le résoudre (il n'est jamais exécuté côté serveur).
    resolveAlias: {
      "msw/browser": "./node_modules/msw/lib/browser/index.js",
    },
  },
};

export default nextConfig;
