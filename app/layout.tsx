import { Analytics } from '@vercel/analytics/next'
import { Roboto } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title: 'Wiki UTOM',
  description: 'Portal y foro colaborativo para la comunidad estudiantil de la Universidad Tecnológica del Oriente de Michoacán.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/media/fontico.webp',
      },
    ],
    apple: '/media/fontico.webp',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
    <html lang="es" className={roboto.variable}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
