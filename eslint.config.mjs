import eslintNxPlugin from '@nx/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';
import eslintFunctionalPlugin from 'eslint-plugin-functional';
import importPlugin from 'eslint-plugin-import';
import eslintLodashPlugin from 'eslint-plugin-lodash';
import packageJsonPlugin from 'eslint-plugin-package-json';
import preferArrowFunctions from 'eslint-plugin-prefer-arrow-functions';
import eslintUnicornPlugin from 'eslint-plugin-unicorn';
import jsoncParser from 'jsonc-eslint-parser';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.eslint.json', './packages/*/tsconfig.json'],
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
    plugins: {
      'prefer-arrow-functions': preferArrowFunctions,
      import: importPlugin,
      '@nx': eslintNxPlugin,
      'check-file': checkFile,
      functional: eslintFunctionalPlugin,
      lodash: eslintLodashPlugin,
      unicorn: eslintUnicornPlugin,
    },
    rules: {
      'check-file/folder-match-with-fex': [
        'error',
        {
          '*.test.{js,jsx,ts,tsx}': 'test/**',
          '*.stories.{jsx,tsx}':
            'not-allowed-in-packages.see-override-in-storybook-app-eslint-config/*',
        },
      ],
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'always' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'should', 'has', 'can', 'did', 'will', 'are'],
        },
      ],
      'max-params': ['warn', 3],
      'no-void': 'off',
      'no-console': 'error',
      'prefer-arrow-functions/prefer-arrow-functions': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
            },
            {
              pattern: 'react-native',
              group: 'builtin',
            },
            {
              pattern: '@storybook/**',
              group: 'external',
            },
          ],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],
      'lodash/import-scope': ['error', 'method'],
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:sdk',
              onlyDependOnLibsWithTags: ['scope:sdk'],
            },
            {
              sourceTag: 'scope:lib',
              onlyDependOnLibsWithTags: [
                'scope:sdk',
                'scope:lib',
                'scope:contract',
              ],
            },
            {
              sourceTag: 'scope:contract',
              onlyDependOnLibsWithTags: [
                'scope:sdk',
                'scope:lib',
                'scope:contract',
              ],
            },
            {
              sourceTag: 'scope:module',
              onlyDependOnLibsWithTags: [
                'scope:lib',
                'scope:sdk',
                'scope:contract',
              ],
            },
            {
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: [
                'scope:lib',
                'scope:sdk',
                'scope:contract',
                'scope:module',
              ],
            },
          ],
        },
      ],
      'unicorn/filename-case': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            Db: true,
            db: true,
            Doc: true,
            doc: true,
            Docs: true,
            docs: true,
            Props: true,
            props: true,
            args: true,
            Args: true,
            Ref: true,
            ref: true,
            Params: true,
            params: true,
            src: true,
            Src: true,
          },
        },
      ],
      '@typescript-eslint/require-await': ['off'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit',
          overrides: {
            parameterProperties: 'no-public',
          },
        },
      ],
      '@typescript-eslint/member-ordering': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-type-alias': [
        'off',
        {
          allowGenerics: 'always',
          allowAliases: 'always',
          allowMappedTypes: 'in-unions-and-intersections',
        },
      ],
      '@typescript-eslint/prefer-enum-initializers': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/sort-type-constituents': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'functional/readonly-type': 'off',
      'functional/prefer-immutable-types': 'off',
      'functional/immutable-data': 'off',
      'functional/functional-parameters': 'off',
      'functional/no-throw-statements': 'off',
      'functional/no-mixed-types': 'off',
      'functional/no-return-void': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-loop-statements': 'off',
      'functional/no-let': ['error', { allowInFunctions: true }],
      'functional/prefer-tacit': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/expiring-todo-comments': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...(() => {
      // `plugins` is already imported, so exclude it from the return value of `importPlugin.flatConfigs.typescript`
      const { plugins: _, ...rest } = importPlugin.flatConfigs.typescript;
      return rest;
    })(),
  },
  // File-specific overrides
  {
    files: ['side-effects.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['*.stories.tsx'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    files: ['**/eslint.config.mjs'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    files: ['index.js', 'eslint.config.mjs', '**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      'unicorn/prefer-module': ['off'],
      '@typescript-eslint/no-unsafe-assignment': ['off'],
      '@typescript-eslint/no-var-requires': ['off'],
      '@typescript-eslint/no-unsafe-call': ['off'],
      '@typescript-eslint/no-require-imports': ['off'],
      'functional/no-expression-statements': ['off'],
      'functional/immutable-data': ['off'],
      '@typescript-eslint/strict-boolean-expressions': ['off'],
      '@typescript-eslint/explicit-function-return-type': ['off'],
      '@typescript-eslint/no-unsafe-return': ['off'],
      '@typescript-eslint/no-unsafe-member-access': ['off'],
      '@typescript-eslint/no-unsafe-argument': ['off'],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'import/no-default-export': ['off'],
    },
  },
  {
    files: ['*.spec.tsx', '*.spec.ts', '*.test.ts'],
    rules: {
      'functional/no-expression-statements': ['off'],
      'functional/no-return-void': ['off'],
      'unicorn/no-useless-promise-resolve-reject': ['off'],
      'functional/no-classes': ['off'],
      '@typescript-eslint/no-empty-function': ['off'],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      'functional/prefer-immutable-types': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      'sonarjs/no-duplicate-string': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'promise/no-callback-in-promise': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.config.{js,ts}'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },

  // Package.json specific rules
  {
    files: ['**/package.json'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      'package-json': packageJsonPlugin,
    },
    rules: {
      // Validation Rules
      'package-json/valid-package-definition': 'error',
      'package-json/valid-name': 'error',
      'package-json/valid-version': 'error',
      'package-json/valid-bin': 'error',
      'package-json/valid-local-dependency': 'error',
      'package-json/valid-repository-directory': 'error',

      // Ordering Rules
      'package-json/order-properties': 'error',
      'package-json/sort-collections': [
        'error',
        ['scripts', 'dependencies', 'devDependencies'],
      ],

      // Dependency Rules
      'package-json/unique-dependencies': 'error',
      'package-json/restrict-dependency-ranges': [
        'error',
        {
          forPackages: ['@midnight-ntwrk/*'],
          rangeType: 'pin',
        },
      ],

      // Quality Rules
      'package-json/no-empty-fields': 'warn',
      'package-json/no-redundant-files': 'warn',
      'package-json/repository-shorthand': 'warn',
    },
  },

  // Ignore patterns
  {
    ignores: [
      '**/dist/**/',
      '**/.eas-local-debug/**/',
      'coverage/**/',
      'configs/nx-plugin/src/generators/**/files/**/*',
      '.nx/**/',
      '**/node_modules/**/',
    ],
  },
);
