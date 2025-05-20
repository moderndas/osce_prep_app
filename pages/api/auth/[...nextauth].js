import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';

/**
 * NextAuth.js configuration
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          await dbConnect();
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            throw new Error('No user found with this email');
          }

          console.log("FOUND USER IN DATABASE:", {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            roleType: typeof user.role
          });

          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error('Invalid password');
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role || 'user'
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin', // Custom sign-in page (create this page in pages/auth/signin.js)
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        console.log("JWT callback - adding role to token:", user.role);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role || 'user';
        console.log("Session callback - user role:", session.user.role);
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions); 