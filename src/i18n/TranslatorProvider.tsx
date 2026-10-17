import { useLocales } from 'expo-localization';
import { createContext, useContext, type ReactElement, type ReactNode } from 'react';

import { createTranslator, isLanguage, resolveLanguage, type Language, type Translator } from '@/i18n';

const TranslatorContext = createContext<Translator | null>(null);

/** The device language, or `null` when the phone speaks something we do not. */
export function useSystemLanguage(): Language | null {
  const [primary] = useLocales();
  const code = primary.languageCode;

  return code !== null && isLanguage(code) ? code : null;
}

/**
 * Resolves the language once for the whole tree from the device locale.
 * Reading the locale registers a native listener, so doing it per component
 * would mean one subscription per atom card; the provider also means a system
 * language change re-renders from the root, without a restart.
 */
export function TranslatorProvider({ children }: { children: ReactNode }): ReactElement {
  const systemLanguage = useSystemLanguage();
  const translator = createTranslator(resolveLanguage(systemLanguage));

  return <TranslatorContext.Provider value={translator}>{children}</TranslatorContext.Provider>;
}

/** The translator every component reads its copy from. */
export function useTranslator(): Translator {
  const translator = useContext(TranslatorContext);

  if (translator === null) {
    throw new Error('useTranslator was called outside of TranslatorProvider');
  }

  return translator;
}
