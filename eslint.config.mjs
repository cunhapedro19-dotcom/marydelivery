import eslint from "eslint";
import eslintConfigNext from "eslint-config-next";

export default [
  ...eslintConfigNext,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];