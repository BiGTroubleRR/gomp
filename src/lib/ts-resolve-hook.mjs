// Test-only: registers ts-resolve-loader.mjs (import this first in a *.test.mjs).
import { register } from 'node:module';
register('./ts-resolve-loader.mjs', import.meta.url);
