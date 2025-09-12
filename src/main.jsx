import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from '@/contexts/ThemeContext';

// Import navigation probe for debugging critical tab switch bug
if (import.meta.env.DEV) {
  import('./debug/navigationProbe.ts').then(({ navigationProbe }) => {
    navigationProbe.startProbe();
    console.log('🔍 Navigation probe started for debugging tab switch issues');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);