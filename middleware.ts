export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/usuarios/:path*', '/talleres/:path*', '/alumnos/:path*', '/personal/:path*', '/faltas/:path*', '/pagos/:path*', '/reportes/:path*'],
};
