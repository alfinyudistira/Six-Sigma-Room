// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
    tailwindcss: {
      callees: ['classnames', 'clsx', 'tailwind-merge', 'cn'],
      config: 'tailwind.config.js',
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:tailwindcss/recommended',
    'plugin:perfectionist/recommended-natural', // 🔥 dari A
    'plugin:vitest/recommended',                 // 🔥 dari A
    'plugin:react-refresh/recommended',          // 🔥 dari B
    'plugin:sonarjs/recommended',                // 🔥 TOP TIER: code quality & security
    'plugin:security/recommended',               // 🔥 TOP TIER: security linting
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'vite.config.ts', '*.config.js', 'coverage'],
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'import',
    'tailwindcss',
    'react-refresh',
    'perfectionist',    // dari A
    'vitest',           // dari A
    'sonarjs',          // top tier
    'security',         // top tier
  ],
  rules: {
    // ===== TypeScript (gabungan A + B, diperkuat) =====
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
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-inferrable-types': 'warn',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
    '@typescript-eslint/restrict-template-expressions': [
      'error',
      { allowNumber: true, allowBoolean: true },
    ],
    '@typescript-eslint/no-unnecessary-condition': 'warn',    // 🔥 top tier
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',   // 🔥 top tier
    '@typescript-eslint/prefer-optional-chain': 'warn',       // 🔥 top tier

    // ===== React (dari B, disempurnakan) =====
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-key': 'error',
    'react/self-closing-comp': 'warn',
    'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
    'react/jsx-boolean-value': 'warn',
    'react/no-array-index-key': 'warn',
    'react/display-name': 'off',

    // ===== React Hooks =====
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ===== React Refresh (Vite HMR) =====
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true, allowExportNames: ['meta', 'links', 'headers', 'scripts'] },
    ],

    // ===== Import / ES Modules (gabungan A perfectionist + B import/order) =====
    // Perfectionist untuk sortir import (lebih advanced)
    'perfectionist/sort-imports': [
      'error',
      {
        type: 'natural',
        groups: [
          'type',
          ['builtin', 'external'],
          'internal-type',
          'internal',
          ['parent-type', 'sibling-type', 'index-type'],
          ['parent', 'sibling', 'index'],
          'object',
          'unknown',
        ],
        'newlines-between': 'always',
      },
    ],
    // Fallback import/order untuk aturan lain (non-conflict)
    'import/no-duplicates': 'error',
    'import/no-default-export': 'off',
    'import/prefer-default-export': 'off',
    'import/no-unresolved': 'off', // TypeScript handles

    // ===== JSX Accessibility (dari B) =====
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

    // ===== Tailwind CSS (dari A + B) =====
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/enforces-negative-arbitrary': 'warn',
    'tailwindcss/enforces-shorthand': 'warn',
    'tailwindcss/no-arbitrary-value': 'off',

    // ===== Best Practices & Possible Errors (dari B, diperkuat) =====
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

    // ===== SonarJS (code quality & security) — top tier =====
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/cognitive-complexity': ['warn', 15],
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-collapsible-if': 'warn',
    'sonarjs/no-collection-size-mischeck': 'error',
    'sonarjs/no-unused-collection': 'error',

    // ===== Security plugin — top tier =====
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-fs-filename': 'off', // tidak terlalu relevan di frontend
    'security/detect-unsafe-regex': 'warn',
    'security/detect-buffer-noassert': 'off',
    'security/detect-child-process': 'off',
    'security/detect-disable-mustache-escape': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'off',
    'security/detect-non-literal-require': 'warn',
    'security/detect-pseudoRandomBytes': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
  },
  overrides: [
    // Config files (vite, postcss, tailwind, etc)
    {
      files: ['*.config.js', '*.config.ts'],
      env: { node: true },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        'sonarjs/no-duplicate-string': 'off',
      },
    },
    // Test files (Vitest)
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: { vitest: true, node: true },
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'sonarjs/no-duplicate-string': 'off',
        'security/detect-object-injection': 'off',
      },
    },
    // Storybook files (jika ada)
    {
      files: ['**/*.stories.tsx'],
      rules: {
        'react-hooks/rules-of-hooks': 'off',
        'import/no-default-export': 'off',
      },
    },
  ],
};
