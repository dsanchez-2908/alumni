import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateUser } from '@/lib/auth';
import { registrarTraza } from '@/lib/db-utils';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const result = await authenticateUser(
            credentials.username,
            credentials.password
          );

          if (!result) {
            return null;
          }

          const { user, roles } = result;

          // Registrar login en traza
          await registrarTraza({
            dsProceso: 'Usuario',
            dsAccion: 'Login',
            cdUsuario: user.cdUsuario,
            dsDetalle: `Login exitoso - Usuario: ${user.dsUsuario}`,
          });

          return {
            id: user.cdUsuario.toString(),
            name: user.dsNombreCompleto,
            email: user.dsUsuario,
            cdUsuario: user.cdUsuario,
            dsUsuario: user.dsUsuario,
            roles: roles.map((r) => r.dsRol),
            cdPersonal: user.cdPersonal,
          };
        } catch (error) {
          console.error('Error en authorize:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.cdUsuario = user.cdUsuario;
        token.dsUsuario = user.dsUsuario;
        token.roles = user.roles;
        token.cdPersonal = user.cdPersonal;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.cdUsuario = token.cdUsuario as number;
        session.user.dsUsuario = token.dsUsuario as string;
        session.user.roles = token.roles as string[];
        session.user.cdPersonal = token.cdPersonal as number | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
};
