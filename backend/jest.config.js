export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 120000,
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/services/{patrols,tracking}.js',
    'src/middleware/**/*.js',
    'src/utils/**/*.js',
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
