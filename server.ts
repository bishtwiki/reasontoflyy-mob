import { createApp } from './server/app';

// Vercel detects this Express export and serves it as a Node.js Function.
const { app } = createApp();
export default app;
