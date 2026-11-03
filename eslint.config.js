import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "docs/archive/**",
      "product/prototype/**",
      "scripts/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "max-lines": [
        "error",
        { max: 500, skipBlankLines: false, skipComments: false },
      ],
      "max-lines-per-function": [
        "error",
        { max: 500, skipBlankLines: false, skipComments: false },
      ],
    },
  },
);
