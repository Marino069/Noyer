import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const config = [
  ...coreWebVitals,
  ...typescript,
  prettier,
  {
    // Les couleurs vivent uniquement dans styles/tokens.css (brief §04).
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|hsl)a?\\(/], TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|hsl)a?\\(/]",
          message:
            "Couleur en dur interdite : utiliser les tokens CSS (var(--…)) de styles/tokens.css.",
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/mockServiceWorker.js",
    ],
  },
];

export default config;
