import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from '@/contexts/ThemeContext';

if (import.meta.env.DEV) {
  // Load focus/visibility stress test helper when developing to reproduce tab issues
  import('./debug/focusStressTest.ts').then(({ focusStressTest }) => {
    if (focusStressTest) {
      // eslint-disable-next-line no-undef
      window.focusStressTest = focusStressTest;
    }
    console.log('🧪 Focus stress helper loaded. Try in console: focusStressTest.run({ cycles: 10, intervalMs: 800, includePageHide: true })');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);