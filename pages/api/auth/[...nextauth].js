import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '../../../lib/mongodb';

/**
 * NextAuth.js configuration
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    // Add more providers here as needed
    // @see https://next-auth.js.org/providers/
  ],
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin', // Custom sign-in page (create this page in pages/auth/signin.js)
    // Add custom error, sign-out pages here if needed
  },
  callbacks: {
    async session({ session, token, user }) {
      // Add custom session handling here if needed
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Add custom JWT handling here if needed
      return token;
    },
  },
};

export default NextAuth(authOptions); 