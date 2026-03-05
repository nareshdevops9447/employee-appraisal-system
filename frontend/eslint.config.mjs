import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";

export default tseslint.config(
    // Global ignores — dead code and build artifacts
    {
        ignores: [
            ".next/**",
            "node_modules/**",
            "out/**",
            "src/pages_backup/**",   // legacy backup files — not part of the app
            "src/services/api.js",   // legacy Axios wrapper replaced by api-client.ts
        ],
    },
    // Base JS rules with browser + Node globals
    {
        ...js.configs.recommended,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    // TypeScript rules
    ...tseslint.configs.recommended,
    // Next.js plugin rules
    {
        plugins: {
            "@next/next": nextPlugin,
        },
        rules: {
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs["core-web-vitals"].rules,
            // Downgrade to warnings for incremental TS migration
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            // Shadcn/ui generates empty interface extensions — acceptable pattern
            "@typescript-eslint/no-empty-object-type": "warn",
        },
    },
);
