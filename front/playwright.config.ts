import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Build et serveur avec les mocks MSW (navigateur + serveur) et la boutique activée,
// sans back. Le build est propre à ce test (NEXT_PUBLIC_* est figé au build).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Les apparitions au défilement (E8-10) masquent les sections hors écran le temps de
    // l'animation : axe les compterait comme du texte sans contraste. Le parcours teste le
    // contenu, donc animations coupées (le code les désactive déjà avec reduced-motion).
    reducedMotion: "reduce",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/fr`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_MOCKS: "true",
      NEXT_PUBLIC_SHOP_ENABLED: "true",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
