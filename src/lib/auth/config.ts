import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/user.model";
import { Invite } from "@/lib/db/models/invite.model";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectToDatabase();

        // ── Demo account: find or create in DB ───────────────────────────
        if (
          (credentials.email as string).toLowerCase() === "demo@tokenatlas.com" &&
          credentials.password === "demo"
        ) {
          let demoUser = await User.findOne({ email: "demo@tokenatlas.com" });
          if (!demoUser) {
            const passwordHash = await bcrypt.hash("demo", 10);
            demoUser = await User.create({
              email: "demo@tokenatlas.com",
              name: "Demo User",
              passwordHash,
              role: "admin",
            });
          }
          return {
            id: demoUser._id.toString(),
            email: demoUser.email,
            name: demoUser.name ?? "Demo User",
            image: demoUser.avatarUrl ?? null,
            role: demoUser.role,
          };
        }
        // ────────────────────────────────────────────────────────────────

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase(),
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? user.email,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectToDatabase();
        const existing = await User.findOne({ email: user.email });
        if (!existing) {
          const userCount = await User.countDocuments();
          if (userCount > 0) {
            // Restricted workspace: require a valid invite for this email
            const invite = await Invite.findOne({
              email: user.email?.toLowerCase(),
              usedAt: null,
              expiresAt: { $gt: new Date() },
            });
            if (!invite) return false;
            await User.create({
              email: user.email,
              name: user.name,
              avatarUrl: user.image,
              googleId: account.providerAccountId,
              role: "user",
            });
            await Invite.updateOne({ _id: invite._id }, { usedAt: new Date() });
          } else {
            // First user — bootstrap admin via Google
            await User.create({
              email: user.email,
              name: user.name,
              avatarUrl: user.image,
              googleId: account.providerAccountId,
              role: "admin",
            });
          }
        } else if (!existing.googleId) {
          await User.updateOne(
            { email: user.email },
            { googleId: account.providerAccountId, avatarUrl: user.image }
          );
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.picture = (user as { image?: string | null }).image ?? null;
      }
      // Refresh token if role is missing, id is stale, or a session update was triggered
      const needsRefresh =
        trigger === "update" ||
        !token.role ||
        (typeof token.id === "string" && !/^[a-f\d]{24}$/i.test(token.id));
      if (needsRefresh && token.email && process.env.MONGODB_URI) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.picture = dbUser.avatarUrl ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        session.user.image = (token.picture as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
};
