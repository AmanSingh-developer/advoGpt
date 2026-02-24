module.exports = {
    root: true,
    env: {
      browser: true,
      es2021: true,
    },
    parser: "@typescript-eslint/parser",
    plugins: [
      "react",
      "react-hooks",
      "@typescript-eslint",
      "prettier",
      "simple-import-sort",
    ],
    extends: [
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:prettier/recommended",
    ],
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      /* -------------------- */
      "no-undef": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],
      /* IMPORT SORTING */
      /* -------------------- */
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
  
      /* -------------------- */
      /* NO CONSOLE IN PROD */
      /* -------------------- */
      "no-console":
        process.env.NODE_ENV === "production"
          ? "error"
          : "warn",
  
      /* -------------------- */
      /* TYPESCRIPT RULES */
      /* -------------------- */
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "no-undef": "error",
  
      /* PRETTIER */
      /* -------------------- */
      "prettier/prettier": "error",
    },
  };