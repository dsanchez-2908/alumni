'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
        },
        className: 'toaster',
        duration: 4000,
      }}
    />
  );
}
