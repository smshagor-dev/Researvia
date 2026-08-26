import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/email/SystemMailboxClient.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  },
  globalIgnores([".next/**", "coverage/**", "playwright-report/**", "test-results/**"])
]);
