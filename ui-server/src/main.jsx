import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';
import { SessionProvider, ThemeProvider, UiProvider } from './context/Providers.jsx';
import { notifyError } from './api/client';
import ErrorBoundary from './Component/ui/ErrorBoundary.jsx';
import { installSpotlight } from './Component/fx/spotlight';

installSpotlight();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 10_000, refetchOnWindowFocus: false } },
  mutationCache: new MutationCache({
    onError: (error, _v, _c, mutation) => {
      if (error?.handled || mutation.meta?.silent) return;
      notifyError(error?.message || 'Something went wrong.');
    },
  }),
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <SessionProvider>
        <UiProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </UiProvider>
      </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
