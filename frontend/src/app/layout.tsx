'use client';

import './globals.css';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#1B3A2D" />
        <title>MakiCore - Makiavelo Restaurant System</title>
        <meta name="description" content="Sistema de gestión para restaurante Makiavelo" />
        <link rel="icon" href="/images/logo.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen overflow-hidden">
        {children}
        <Toaster
          position="top-right"
          gutter={12}
          toastOptions={{
            duration: 3000,
            className: 'toast-custom',
            style: {
              background: '#1B3A2D',
              color: '#FFFFFF',
              borderRadius: '14px',
              padding: '16px 20px',
              fontSize: '1rem',
              fontWeight: 500,
              minHeight: '48px',
            },
            success: {
              style: {
                background: '#2D5A45',
              },
              iconTheme: {
                primary: '#F5E6C8',
                secondary: '#2D5A45',
              },
            },
            error: {
              style: {
                background: '#DC3545',
              },
              duration: 4000,
            },
          }}
        />
      </body>
    </html>
  );
}
