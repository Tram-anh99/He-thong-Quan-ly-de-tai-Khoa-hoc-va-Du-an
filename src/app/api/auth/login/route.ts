import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken, setTokenCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
     try {
          const body = await request.json();
          const { email, password } = body;

          if (!email || !password) {
               return errorResponse("Tài khoản và mật khẩu là bắt buộc");
          }

          const loginId = String(email).trim().toLowerCase();
          const normalizedEmail = loginId.includes("@")
               ? loginId
               : `${loginId}@khoahoc.vn`;

          const user = await prisma.user.findUnique({
               where: { email: normalizedEmail },
          });

          if (!user || !user.isActive) {
               return errorResponse("Email hoặc mật khẩu không đúng", 401);
          }

          const isValid = await verifyPassword(password, user.password);
          if (!isValid) {
               return errorResponse("Email hoặc mật khẩu không đúng", 401);
          }

          const token = signToken({
               userId: user.id,
               email: user.email,
               role: user.role,
          });

          setTokenCookie(token);

          return successResponse({
               user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    position: user.position,
                    department: user.department,
               },
               token,
          });
     } catch (error) {
          console.error("Login error:", error);
          return errorResponse("Đã có lỗi xảy ra, vui lòng thử lại", 500);
     }
}
