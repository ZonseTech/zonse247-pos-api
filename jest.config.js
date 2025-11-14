module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverageFrom: [
    "**/*.{ts,js}",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/*.d.ts",
    "!**/jest.config.js",
  ],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  haste: {
    throwOnModuleCollision: false,
  },
};
