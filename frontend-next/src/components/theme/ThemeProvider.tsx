"use client";

import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import { Global } from '@emotion/react';
import { theme, globalStyles } from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionThemeProvider theme={theme}>
      <Global styles={globalStyles} />
      {children}
    </EmotionThemeProvider>
  );
}