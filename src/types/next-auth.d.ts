import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    shopId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      shopId: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    shopId?: string | null;
  }
}
