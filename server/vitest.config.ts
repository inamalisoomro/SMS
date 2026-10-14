import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    // Ensure env vars are set before modules are loaded
    setupFiles: [],
    pool: 'forks', // Use forks to avoid module caching issues
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    // Handle .js extensions in TypeScript source imports
    conditions: ['node'],
  },
});
