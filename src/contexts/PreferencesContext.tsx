import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type PreferenceKey = 'activityAlerts' | 'focusContrast';

export type AppPreferences = Record<PreferenceKey, boolean>;

export const defaultPreferences: AppPreferences = {
  activityAlerts: true,
  focusContrast: false,
};

interface PreferencesContextType {
  preferences: AppPreferences;
  updatePreference: (key: PreferenceKey) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const storedPreferences = localStorage.getItem('appPreferences');

    if (!storedPreferences) return;

    setPreferences({
      ...defaultPreferences,
      ...JSON.parse(storedPreferences),
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'focus-contrast',
      preferences.focusContrast,
    );
  }, [preferences.focusContrast]);

  const value = useMemo<PreferencesContextType>(
    () => ({
      preferences,
      updatePreference: (key) => {
        setPreferences((current) => {
          const next = { ...current, [key]: !current[key] };
          localStorage.setItem('appPreferences', JSON.stringify(next));
          return next;
        });
      },
      resetPreferences: () => {
        localStorage.setItem(
          'appPreferences',
          JSON.stringify(defaultPreferences),
        );
        setPreferences(defaultPreferences);
      },
    }),
    [preferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }

  return context;
}
