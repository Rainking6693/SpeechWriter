// Client-only exports to avoid server-side imports in browser code
export * from './src/config';
export * from './src/client';
export { analytics as clientAnalytics } from './src/client';
export { initAnalytics } from './src/client';