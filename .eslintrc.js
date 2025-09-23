// eslint config - keeping it simple
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // catch unused vars (annoying but helpful)
    '@typescript-eslint/no-unused-vars': 'error',
    // warn about any types but don't fail the build
    '@typescript-eslint/no-explicit-any': 'warn', 
    // turn off some annoying rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
  },
  env: {
    node: true,
    es6: true,
    jest: true,  // for test files
  },
  // ignore some files
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    '*.d.ts'
  ]
};
