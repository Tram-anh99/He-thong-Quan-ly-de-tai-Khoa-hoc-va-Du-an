import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function successResponse(data: any, status = 200) {
     return NextResponse.json({ success: true, data }, { status });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorResponse(message: string, status = 400, details?: any) {
     return NextResponse.json(
          { success: false, error: message, details },
          { status },
     );
}

export function paginatedResponse(
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     data: any[],
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
