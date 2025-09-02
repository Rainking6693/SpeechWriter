/** @type {import('prettier').Config} */
module.exports = {
  // Core formatting
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // Line endings
  endOfLine: 'lf',
  
  // JSX specific
  jsxSingleQuote: true,
  
  // Plugin configurations
  plugins: [],
  
  // File-specific overrides
  overrides: [
    {
      files: ['*.md', '*.mdx'],
      options: {
        printWidth: 70,
        proseWrap: 'always',
      },
    },
    {
      files: ['*.json'],
      options: {
        printWidth: 200,
      },
    },
  ],
};