import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Hardhat is CommonJS on purpose (package.json has no "type": "module"),
    // so these use require()/module.exports rather than ESM.
    "hardhat.config.js",
    "scripts/**",
    "test/**",
    "typechain-types/**",
  ]),
]);

export default eslintConfig;
