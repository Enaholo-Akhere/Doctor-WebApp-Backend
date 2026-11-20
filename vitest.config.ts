import { defineConfig } from 'vitest/config';
import path from 'path';

const src = path.resolve(__dirname, 'src');

export default defineConfig({
    resolve: {
        // Mirror tsconfig "paths" ("@utils/*" and the "*" -> "src/*" fallback).
        alias: [
            { find: /^@utils\/(.*)$/, replacement: `${src}/utils/$1` },
            {
                find: /^(ai-chat|config|models|Middleware|Services|Controllers|Routers|DTO_Validations|Starters|utils|types)(\/.*)?$/,
                replacement: `${src}/$1$2`,
            },
        ],
    },
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
    },
});
