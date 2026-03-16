import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const ignores = [
  "**/dist/**",
  "**/coverage/**",
  "**/.expo/**",
  "**/node_modules/**",
  "**/schema.ts",
  "**/eslint.config.mjs",
  "**/vite.config.ts",
  "**/metro.config.js",
  "**/babel.config.js",
  "**/index.js",
  "prettier.config.mjs"
];

export function createBaseConfig({ browser = false, reactNative = false } = {}) {
  return tseslint.config(
    {
      ignores
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: {
          ...(browser ? globals.browser : {}),
          ...(reactNative ? globals.browser : {}),
          ...globals.node
        },
        parserOptions: {
          projectService: true,
          tsconfigRootDir: process.cwd()
        }
      },
      rules: {
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            fixStyle: "inline-type-imports"
          }
        ],
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: {
              attributes: false
            }
          }
        ]
      }
    },
    prettier
  );
}
