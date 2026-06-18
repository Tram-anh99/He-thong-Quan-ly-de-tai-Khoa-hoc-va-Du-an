import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const TOKEN_NAME = 'auth-token';
const TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(TOKEN_NAME)?.value || null;
}

export async function getCurrentUser(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, fullName: true, role: true, position: true, department: true },
  });

  return user;
}

export function setTokenCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export function clearTokenCookie() {
  const cookieStore = cookies();
  cookieStore.delete(TOKEN_NAME);
}
