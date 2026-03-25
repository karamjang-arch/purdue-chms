import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { readSheet, rowsToObjects } from "./sheets";
import { AppUser } from "@/types";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = token.accessToken as string;

      // Check user role from users sheet
      try {
        const rows = await readSheet(
          token.accessToken as string,
          "users"
        );
        const users = rowsToObjects<AppUser>(rows);
        const appUser = users.find(
          (u) => u.email === session.user?.email
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).role = appUser?.role || "unauthorized";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).userName = appUser?.name || session.user?.name || "";
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).role = "unauthorized";
      }

      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

declare module "next-auth" {
  interface Session {
    accessToken: string;
    role: string;
    userName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
