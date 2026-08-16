import js from '@eslint/js';

export default [
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']",
          message: 'Use toLocalDate() from src/lib/date.ts — toISOString() returns UTC.',
        },
        {
          selector: "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
          message: 'Use toLocalDate() from src/lib/date.ts — toISOString() returns UTC.',
        },
      ],
    },
  },
];
