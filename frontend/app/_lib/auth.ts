import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email ID', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Allow any valid email and password for seamless login/demo
        const email = credentials.email.trim().toLowerCase();
        const username = email.split('@')[0] || 'User';

        return {
          id: email,
          email,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          image: null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = (token.picture as string | null | undefined) ?? session.user.image;
      }
      return session;
    },
    async jwt({ token, user, profile }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      if (profile && 'picture' in profile) {
        token.picture = (profile as { picture?: string }).picture;
      }
      return token;
    },
  },
};
