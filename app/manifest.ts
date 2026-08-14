import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Paperrrrrr — Autonomous Research & Document Studio',
    short_name: 'Paperrrrrr',
    description: 'Research, write, and assemble real editable Word docs, PowerPoint presentations, Excel spreadsheets, and PDFs with Gemini 2.5 Flash.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0C111D',
    theme_color: '#C3644B',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
