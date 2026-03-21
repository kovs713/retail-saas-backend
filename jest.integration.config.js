module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.integration.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/app/(.*)$': '<rootDir>/src/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/common/(.*)$': '<rootDir>/src/common/$1',
    '^@/modules/(.*)$': '<rootDir>/src/modules/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/**/*.d.ts',
    '!dist/**',
    '!node_modules/**',
  ],
};
