import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const config = [
  ...coreWebVitals,
  ...typescript,
  prettier,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
