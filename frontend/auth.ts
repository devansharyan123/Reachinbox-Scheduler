import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      if (
        account?.provider === "google" &&
        account.providerAccountId
      ) {
        try {
          const response = await fetch(
            `${process.env.BACKEND_URL}/api/users/sync`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-secret":
                  process.env.INTERNAL_API_SECRET ?? "",
              },
              body: JSON.stringify({
                googleId: account.providerAccountId,
                name: user.name ?? "User",
                email: user.email,
                avatar: user.image ?? null,
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();

            console.error(
              "Backend user synchronization failed:",
              errorText
            );

            return false;
          }
        } catch (error) {
          console.error(
            "Failed to synchronize Google user:",
            error
          );

          return false;
        }
      }

      return true;
    },

    async session({ session }) {
      if (session.user?.email) {
        session.user.email =
          session.user.email.toLowerCase();
      }

      return session;
    },
  },
});