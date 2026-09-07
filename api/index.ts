import serverModule from './server.cjs';

const app =
  typeof serverModule === 'function'
    ? serverModule
    : (serverModule as { default?: unknown }).default;

if (typeof app !== 'function') {
  throw new Error('The bundled Express server did not export an application function.');
}

export default app;
