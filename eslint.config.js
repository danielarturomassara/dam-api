import stylistic from '@stylistic/eslint-plugin';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jsonc from 'eslint-plugin-jsonc';
import perfectionist from 'eslint-plugin-perfectionist';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    ...jsonc.configs['flat/recommended-with-json'][0],
    ...jsonc.configs['flat/recommended-with-json'][1],
    files: [
      '*.json'
    ],
    ignores: [
      'package-lock.json'
    ],
    rules: {
      ...jsonc.configs['flat/recommended-with-json'][2].rules,
      'comma-spacing': [
        'error',
        {
          after: true,
          before: false
        }
      ],
      'jsonc/array-bracket-spacing': ['error', 'never'],
      'jsonc/comma-style': 'error',
      'jsonc/indent': ['error', 2],
      'jsonc/key-spacing': ['error', {
        afterColon: true,
        beforeColon: false
      }],
      'jsonc/object-curly-spacing': ['error', 'always'],
      'jsonc/sort-array-values': ['error', { order: { type: 'asc' }, pathPattern: '.*' }],
      'jsonc/sort-keys': ['error', { order: { type: 'asc' }, pathPattern: '.*' }],
      'jsonc/space-unary-ops': 'error',
      'no-multi-spaces': 'error',
      'no-multiple-empty-lines': [
        'error',
        {
          max: 0
        }
      ]
    }
  },
  {
    files: [
      'src/**/*.ts',
      'eslint.config.js'
    ],
    plugins: {
      '@stylistic/eslint-plugin': stylistic,
      '@typescript-eslint': ts,
      perfectionist,
      'unused-imports': unusedImports
    },
    rules: {
      ...ts.configs['eslint-recommended'].rules,
      ...ts.configs['recommended'].rules,
      ...perfectionist.configs['recommended-natural'].rules,
      '@stylistic/eslint-plugin/comma-dangle': ['error', 'never'],
      '@stylistic/eslint-plugin/eol-last': [
        'error',
        'always'
      ],
      '@stylistic/eslint-plugin/indent': [
        2,
        2,
        {
          SwitchCase: 1
        }
      ],
      '@stylistic/eslint-plugin/linebreak-style': [
        'error',
        'unix'
      ],
      '@stylistic/eslint-plugin/no-trailing-spaces': 'error',
      '@stylistic/eslint-plugin/space-before-blocks': 'error',
      '@stylistic/eslint-plugin/space-before-function-paren': ['error', 'always'],
      '@stylistic/eslint-plugin/type-annotation-spacing': 'error',
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'generic',
          readonly: 'generic'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      'array-bracket-spacing': [
        'error',
        'never'
      ],
      'brace-style': [
        'error',
        '1tbs',
        {
          allowSingleLine: false
        }
      ],
      'comma-spacing': [
        'error',
        {
          after: true,
          before: false
        }
      ],
      curly: [
        'error',
        'all'
      ],
      eqeqeq: [
        'error',
        'always'
      ],
      'key-spacing': [
        'error',
        {
          afterColon: true,
          beforeColon: false
        }
      ],
      'keyword-spacing': [
        'error',
        {
          after: true,
          before: true
        }
      ],
      'lines-between-class-members': [
        'error',
        'always',
        {
          exceptAfterSingleLine: true
        }
      ],
      'newline-before-return': ['error'],
      'no-console': 2,
      'no-else-return': [
        'error',
        {
          allowElseIf: false
        }
      ],
      'no-multi-spaces': ['error'],
      'no-multiple-empty-lines': [
        'error',
        {
          max: 1
        }
      ],
      'no-underscore-dangle': ['error'],
      'no-var': ['error'],
      'object-curly-spacing': [
        'error',
        'always'
      ],
      'padded-blocks': [
        'error',
        {
          blocks: 'never',
          classes: 'never',
          switches: 'never'
        }
      ],
      'perfectionist/sort-array-includes': [
        'error',
        {
          order: 'asc',
          type: 'natural'
        }
      ],
      'perfectionist/sort-classes': [
        'error',
        {
          customGroups: [
            {
              groupName: 'unsorted-static-method',
              modifiers: ['static'],
              selector: 'method',
              type: 'unsorted'
            },
            {
              groupName: 'unsorted-public-method',
              modifiers: ['public'],
              selector: 'method',
              type: 'unsorted'
            },
            {
              groupName: 'unsorted-protected-method',
              modifiers: ['protected'],
              selector: 'method',
              type: 'unsorted'
            },
            {
              groupName: 'unsorted-private-method',
              modifiers: ['private'],
              selector: 'method',
              type: 'unsorted'
            }
          ],
          groups: [
            'index-signature',
            'static-decorated-property',
            'public-decorated-property',
            'protected-decorated-property',
            'private-decorated-property',
            'static-property',
            'public-property',
            'protected-property',
            'private-property',
            'constructor',
            'unsorted-static-method',
            'unsorted-public-method',
            'unsorted-protected-method',
            'unsorted-private-method'
          ]
        }
      ],
      quotes: [
        'error',
        'single'
      ],
      semi: [
        'error',
        'always'
      ],
      'space-before-blocks': ['error', 'always'],
      'space-in-parens': [
        'error',
        'never'
      ],
      'space-infix-ops': ['error'],
      'unused-imports/no-unused-imports': 'error'
    }
  },
  {
    files: [
      'src/**/*.ts'
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      '@typescript-eslint': ts
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error'
    }
  }
];
