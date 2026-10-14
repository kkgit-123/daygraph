import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionContext } from '../context/contexts';
import { UiProvider } from '../context/Providers';

/* Renders with the same providers as main.jsx, on an in-memory router. No network. */
export function renderWithProviders(ui, { route = '/', token = 'test-token', routes } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const session = { token, login: () => {}, logout: () => {} };
  return render(
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={session}>
        <UiProvider>
          <MemoryRouter initialEntries={[route]}>{routes ?? ui}</MemoryRouter>
        </UiProvider>
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}
