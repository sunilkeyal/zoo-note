import nextEslintConfig from "eslint-config-next"
import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import eslintPluginReact from "eslint-plugin-react"
import eslintPluginReactHooks from "eslint-plugin-react-hooks"

const eslintConfig = [
  ...nextEslintConfig,
  ...nextCoreWebVitals,
  {
    plugins: {
      react: eslintPluginReact,
      "react-hooks": eslintPluginReactHooks,
    },
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]

export default eslintConfig
