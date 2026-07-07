'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BlinkUIProvider, Toaster } from '@blinkdotnew/ui'

/**
 * Client providers for the App Router. BlinkUIProvider adds the
 * theme + .dark / .light classes to <html> that activate the theme CSS
 * imported in globals.css (`@import '@blinkdotnew/ui/styles'`).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <BlinkUIProvider theme="linear" darkMode="system">
        <Toaster />
        <div className="flex w-full flex-1 flex-col min-h-0">{children}</div>
      </BlinkUIProvider>
    </QueryClientProvider>
  )
}
