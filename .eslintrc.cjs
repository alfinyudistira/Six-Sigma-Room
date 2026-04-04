// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true, // untuk script vite.config, dsb
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json', // type-aware linting
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    tailwindcss: {
      callees: ['classnames', 'clsx', 'tailwind-merge', 'cn'],
      config: 'tailwind.config.js',
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking', // tambahan type-aware
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:tailwindcss/recommended',
    'plugin:react-refresh/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'vite.config.ts', '*.config.js'],
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'import',
    'tailwindcss',
    'react-refresh',
  ],
  rules: {
    // ----- TypeScript -----
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      },
    ],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-inferrable-types': 'warn',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
    '@typescript-eslint/no-floating-promises': 'error', // wajib handle promise
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
    '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],

    // ----- React -----
    'react/react-in-jsx-scope': 'off', // React 17+ tidak butuh
    'react/prop-types': 'off', // pakai TypeScript
    'react/jsx-no-target-blank': 'error',
    'react/jsx-key': 'error',
    'react/self-closing-comp': 'warn',
    'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
    'react/jsx-boolean-value': 'warn',
    'react/no-array-index-key': 'warn',
    'react/display-name': 'off',

    // ----- React Hooks -----
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ----- React Refresh (Vite HMR) -----
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true, allowExportNames: ['meta', 'links', 'headers', 'scripts'] },
    ],

    // ----- Import / ES Modules -----
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-default-export': 'off', // Next.js butuh default export, di Vite boleh
    'import/prefer-default-export': 'off',

    // ----- JSX Accessibility -----
    'jsx-a11y/anchor-is-valid': [
      'warn',
      {
        components: ['Link'],
        specialLink: ['to', 'href'],
        aspects: ['noHref', 'invalidHref', 'preferButton'],
      },
    ],
    'jsx-a11y/aria-role': 'warn',
    'jsx-a11y/alt-text': 'warn',

    // ----- Tailwind CSS -----
    'tailwindcss/no-custom-classname': 'off', // karena bisa pakai class custom seperti `bg-bg`
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/enforces-negative-arbitrary': 'warn',
    'tailwindcss/enforces-shorthand': 'warn',
    'tailwindcss/no-arbitrary-value': 'off', // kadang perlu arbitrary value

    // ----- Best Practices / Possible Errors -----
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-alert': 'warn',
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-else-return': 'warn',
    'no-useless-return': 'warn',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'prefer-destructuring': ['warn', { array: false, object: true }],
  },
  overrides: [
    {
      // untuk file config seperti vite.config.ts, postcss.config.js, dsb
      files: ['*.config.js', '*.config.ts'],
      env: { node: true },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
    {
      // untuk file test
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: { jest: true, node: true },
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
