import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      cdUsuario: number;
      dsUsuario: string;
      name: string;
      email: string;
      roles: string[];
      cdPersonal: number | null;
    };
  }

  interface User {
    cdUsuario: number;
    dsUsuario: string;
    roles: string[];
    cdPersonal: number | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    cdUsuario: number;
    dsUsuario: string;
    roles: string[];
    cdPersonal: number | null;
  }
}
