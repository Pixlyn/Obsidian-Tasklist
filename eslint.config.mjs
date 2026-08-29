import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "main.js",
    "node_modules/**",
    "dist/**",
    "esbuild.config.mjs",
    "version-bump.mjs"
  ]),

  ...obsidianmd.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["package.json"],
    rules: {
      "depend/ban-dependencies": "off"
    }
  },

  {
    files: ["src/main.ts"],
    rules: {
      "@typescript-eslint/unbound-method": "off"
    }
  },

  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: "./tsconfig.json" }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "no-var": "error",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["error"] }]
    }
  }
]);
