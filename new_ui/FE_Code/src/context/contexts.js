import { createContext, useContext } from 'react';

export const SessionContext = createContext(null);
export const UiContext = createContext(null);
export const ThemeContext = createContext({ mode: 'dark', resolved: 'dark', setMode: () => {} });

export const useSession = () => useContext(SessionContext);
export const useUi = () => useContext(UiContext);
export const useTheme = () => useContext(ThemeContext);
