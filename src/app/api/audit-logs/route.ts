import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse, paginatedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);
          if (user.role !== "ADMIN") {
               return errorResponse("Chỉ admin được xem lịch sử thao tác", 403);
          }

          const { searchParams } = new URL(request.url);
          const page = parseInt(searchParams.get("page") || "1");
          const pageSize = parseInt(searchParams.get("pageSize") || "20");
          const entity = searchParams.get("entity");
          const action = searchParams.get("action");

          const where = {
               ...(entity && { entity }),
               ...(action && { action }),
          };

          const [logs, total] = await Promise.all([
               prisma.auditLog.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
               }),
               prisma.auditLog.count({ where }),
          ]);

          const userIds = Array.from(
               new Set(logs.map((log) => log.userId).filter(Boolean)),
          ) as string[];
          const actors = await prisma.user.findMany({
               where: { id: { in: userIds } },
               select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    position: true,
                    department: true,
               },
          });
          const actorById = new Map(actors.map((actor) => [actor.id, actor]));

          return paginatedResponse(
               logs.map((log) => ({
                    ...log,
                    actor: log.userId ? actorById.get(log.userId) || null : null,
               })),
               total,
               page,
               pageSize,
          );
     } catch (error) {
          console.error("GET /api/audit-logs error:", error);
          return errorResponse("Không thể tải lịch sử thao tác", 500);
     }
}
