import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) {
               return errorResponse("Chưa đăng nhập", 401);
          }
          return successResponse(user);
     } catch (error) {
          console.error("GET /api/auth/me error:", error);
          return errorResponse("Lỗi server", 500);
     }
}
