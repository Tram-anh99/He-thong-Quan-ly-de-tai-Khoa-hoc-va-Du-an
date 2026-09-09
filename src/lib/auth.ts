import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

import { verifyToken } from "@/lib/tokens";
export { signToken, verifyToken } from "@/lib/tokens";
const TOKEN_NAME = "auth-token";

export async function hashPassword(password: string): Promise<string> {
     return bcrypt.hash(password, 12);
}

export async function verifyPassword(
     password: string,
     hash: string,
): Promise<boolean> {
     return bcrypt.compare(password, hash);
}

export function getTokenFromRequest(request: NextRequest): string | null {
     return request.cookies.get(TOKEN_NAME)?.value || null;
}

export async function getCurrentUser(request: NextRequest) {
     const token = getTokenFromRequest(request);
     if (!token) return null;

     const payload = verifyToken(token);
     if (!payload) return null;

     const user = await prisma.user.findFirst({
          where: { id: payload.userId, isActive: true },
          select: {
               id: true,
               email: true,
               fullName: true,
               role: true,
               position: true,
               department: true,
          },
     });

     return user;
}

export function setTokenCookie(token: string) {
     const cookieStore = cookies();
     cookieStore.set(TOKEN_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
     });
}

export function clearTokenCookie() {
     const cookieStore = cookies();
     cookieStore.delete(TOKEN_NAME);
}
