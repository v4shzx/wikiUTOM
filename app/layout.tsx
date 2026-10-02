import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wiki UTOM - Comunidad Estudiantil',
  description: 'Portal y foro colaborativo para la comunidad estudiantil de la Universidad Tecnológica del Oriente de Michoacán.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/media/logo.webp',
      },
    ],
    apple: '/media/logo.webp',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
