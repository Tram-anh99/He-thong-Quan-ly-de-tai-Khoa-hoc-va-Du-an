import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken, setTokenCookie } from "@/lib/auth";
import { successResponse, errorResponse, failureResponse } from "@/lib/api-helpers";

import { jsonObject } from "@/lib/validation";

export async function POST(request: NextRequest) {
     try {
          const body = await jsonObject(request);
          const { email, password } = body;

          if (typeof email !== "string" || typeof password !== "string" || !email || !password || email.length > 320 || password.length > 1024) {
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
          });
     } catch (error) {
          return failureResponse(error, "Đã có lỗi xảy ra, vui lòng thử lại");
     }
}
