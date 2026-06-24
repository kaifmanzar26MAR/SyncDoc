import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@shared/lib/db/mongoose';
import User from '@shared/data/models/User';
import { verifyPassword, hashPassword } from '@shared/lib/auth/password';
import { loginSchema } from '@shared/lib/validations/schemas';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        newPassword: { label: 'New Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email });
        if (!user || !user.emailVerified) return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        if (credentials.newPassword && user.mustResetPassword) {
          if (credentials.newPassword.length < 8) return null;
          user.passwordHash = await hashPassword(credentials.newPassword);
          user.mustResetPassword = false;
          await user.save();
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          mustResetPassword: user.mustResetPassword,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.mustResetPassword = user.mustResetPassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.mustResetPassword = token.mustResetPassword;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};
