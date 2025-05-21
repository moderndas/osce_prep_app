import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';

// Simple in-memory cache for users
// Cache structure: { email: { user: {...}, timestamp: Date.now() } }
const userCache = {};
const CACHE_TTL = 60 * 1000; // 60 seconds cache TTL

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
          let user;
          
          // Check cache first
          const cachedUser = userCache[credentials.email];
          const now = Date.now();
          
          if (cachedUser && (now - cachedUser.timestamp < CACHE_TTL)) {
            // Use cached user if within TTL
            user = cachedUser.user;
          } else {
            // Otherwise fetch from DB
            await dbConnect();
            // Only select the fields we need to minimize data transfer
            user = await User.findOne(
              { email: credentials.email },
              'email password name role'
            ).lean();
            
            // Cache the user
            if (user) {
              userCache[credentials.email] = {
                user,
                timestamp: now
              };
            }
          }
          
          if (!user) {
            throw new Error('No user found with this email');
          }

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role || 'user';
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions); 