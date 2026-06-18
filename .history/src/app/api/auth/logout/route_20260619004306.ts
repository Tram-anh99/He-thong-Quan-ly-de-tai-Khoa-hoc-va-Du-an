import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { clearTokenCookie } from '@/lib/auth';
import { successResponse } from '@/lib/api-helpers';

export async function POST() {
  clearTokenCookie();
  return successResponse({ message: 'Đã đăng xuất' });
}
