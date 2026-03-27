import type { Config } from "jest";

/**
 * Configuration Jest pour les tests unitaires de l'algorithme SGR.
 * Utilise ts-jest pour la transpilation TypeScript.
 * Section mémoire : 4.1 — Stratégie de test
 */
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    // Résolution de l'alias @/* défini dans tsconfig.json
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Ajustements pour Jest (moduleResolution node au lieu de bundler)
          moduleResolution: "node",
          module: "commonjs",
        },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "lib/risk-algorithm/**/*.ts",
    "application/use-cases/sgr/**/*.ts",
  ],
};

export default config;
