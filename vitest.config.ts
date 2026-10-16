import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'markdown-as-text',
      transform: (code, id) =>
        id.endsWith('.md') ? { code: `export default ${JSON.stringify(code)};`, map: null } : null,
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'content/**/*.test.ts',
      'lib/**/*.test.ts',
      'worker/src/**/*.test.ts',
    ],
  },
});
