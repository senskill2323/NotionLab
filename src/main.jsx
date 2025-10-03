import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

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

const root = ReactDOM.createRoot(document.getElementById('root'));

const ConfigErrorScreen = () => (
  <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-6">
    <div className="max-w-xl w-full border border-border/60 rounded-lg bg-card/80 p-6 shadow-sm">
      <h1 className="text-lg font-semibold mb-2">Configuration Supabase manquante</h1>
      <p className="text-sm text-muted-foreground mb-3">
        Les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises.
        Définissez-les dans votre fichier .env/.env.local puis relancez l'application.
      </p>
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground/90 bg-muted/30 p-3 rounded">
        <code>VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY</code>
      </pre>
    </div>
  </div>
);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  root.render(<ConfigErrorScreen />);
} else {
  (async () => {
    const [{ ThemeProvider }, { default: App }, { GlobalErrorBoundary }] = await Promise.all([
      import('./contexts/ThemeContext.jsx'),
      import('./App.jsx'),
      import('./components/GlobalErrorBoundary.jsx'),
    ]);

    root.render(
      <ThemeProvider>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </ThemeProvider>
    );
  })();
}
