import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      'supabase/functions/**/*.test.ts',
      'supabase/tests/**/*.test.ts',
      'agent/src/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Deno npm: specifiers used by Edge Function modules under test map to
      // the plain packages so vitest runs the exact deployed code path.
      'npm:livekit-server-sdk@2': 'livekit-server-sdk',
      'npm:@google/genai@2': '@google/genai',
    },
  },
});
