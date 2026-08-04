import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "storage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Prisma's dynamic `where` clause builders (saved views, duplicate
      // detection) are genuinely hard to type without excessive generic
      // gymnastics relative to the value gained — downgraded to a warning
      // rather than disabled outright so it still surfaces in review.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
