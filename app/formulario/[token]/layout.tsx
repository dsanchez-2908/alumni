import type { Metadata } from 'next';

// El link es privado: no se indexa y no envía el origen (con el token) a otros sitios
export const metadata: Metadata = {
  title: 'Formulario de inscripción - Índigo Teatro',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function FormularioLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
