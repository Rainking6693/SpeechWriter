import NextAuth, { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { prisma } from './prisma'
import { env } from '../../../../lib/env'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Email magic link provider
    EmailProvider({
      server: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      },
      from: env.EMAIL_FROM,
      maxAge: 24 * 60 * 60, // 24 hours
    }),
    
    // Google OAuth provider (optional)
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      
      if (user) {
        token.userId = user.id
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Send properties to the client
      session.user.id = token.userId as string
      session.user.provider = token.provider as string
      session.accessToken = token.accessToken as string
      
      return session
    },
    
    async signIn({ user, account, profile, email }) {
      // Allow all sign ins for now
      return true
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  
  events: {
    async signIn(message) {
      console.log(`User signed in: ${message.user.email}`)
    },
    async signOut(message) {
      console.log(`User signed out: ${message.token?.email}`)
    },
  },
  
  debug: env.NODE_ENV === 'development',
}

// Export types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      image?: string
      provider: string
    }
    accessToken?: string
  }
  
  interface User {
    id: string
    email: string
    name?: string
    image?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    provider?: string
    accessToken?: string
  }
}

// Export the configured NextAuth instance
export const auth = NextAuth(authOptions)