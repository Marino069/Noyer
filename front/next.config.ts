import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // msw/browser exclut la condition "node" ; le passage SSR du composant client
    // MocksProvider ne pourrait donc pas le résoudre (il n'est jamais exécuté côté serveur).
    resolveAlias: {
      "msw/browser": "./node_modules/msw/lib/browser/index.js",
    },
  },
};

export default nextConfig;
