import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ValidationError } from "@/lib/validation";

export function failureResponse(error: unknown, fallback: string) {
     if (error instanceof ValidationError) return errorResponse(error.message, 400);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") return errorResponse("Mã dữ liệu đã tồn tại", 409);
          if (error.code === "P2025") return errorResponse("Không tìm thấy dữ liệu", 404);
          if (error.code === "P2034") return errorResponse("Dữ liệu vừa thay đổi, vui lòng tải lại và thử lại", 409);
     }
     // Do not emit Prisma's full error: it may contain request values or credentials.
     console.error(fallback, error instanceof Error ? error.name : "UnknownError");
     return errorResponse(fallback, 500);
}

export function successResponse(data: unknown, status = 200) {
     return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400, details?: unknown) {
     return NextResponse.json(
          { success: false, error: message, details },
          { status },
     );
}

export function paginatedResponse(
     data: unknown[],
     total: number,
     page: number,
     pageSize: number,
) {
     return NextResponse.json({
          success: true,
          data,
          pagination: {
               total,
               page,
               pageSize,
               totalPages: Math.ceil(total / pageSize),
          },
     });
}
