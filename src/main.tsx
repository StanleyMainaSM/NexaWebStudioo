import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import App from './App.tsx';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './lib/theme';
import './index.css';

registerSW({
  immediate: true,

  onRegisteredSW(
    swUrl,
    registration
  ) {
    console.log(
      'Avelixa service worker registered:',
      swUrl
    );

    if (registration) {
      console.log(
        'Avelixa PWA service worker is active.'
      );
    }
  },

  onRegisterError(error) {
    console.error(
      'Avelixa service worker registration error:',
      error
    );
  },
});

createRoot(
  document.getElementById('root')!
).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <ThemeToggle />
    </ThemeProvider>
  </StrictMode>
);
