import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { failureResponse, errorResponse, paginatedResponse, successResponse } from "@/lib/api-helpers";
import { canCreateProject, projectScope, projectListView } from "@/lib/access";
import { integer, jsonObject, pagination, projectInput, projectStatus } from "@/lib/validation";
import { compactProjectForAudit, createAuditLog } from "@/lib/audit";
import { cleanHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);
          const params = request.nextUrl.searchParams;
          const { page, pageSize } = pagination(params);
          const filters: Prisma.ProjectWhereInput = {};
          if (params.has("year")) filters.year = integer(params.get("year"), "Năm", 1900, 2200);
          if (params.has("status")) filters.status = projectStatus(params.get("status"));
          const search = params.get("search")?.trim();
          if (search) filters.OR = ["title", "code", "summary"].map(key => ({ [key]: { contains: search.slice(0, 500), mode: "insensitive" } }));
          const where: Prisma.ProjectWhereInput = { AND: [projectScope(user), filters] };
          const [projects, total] = await prisma.$transaction([
               prisma.project.findMany({
                    where, include: { owner: { select: { id: true, fullName: true, position: true, department: true } },
                         _count: { select: { members: true, budgetItems: true, contracts: true, products: true } } },
                    orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize,
               }),
               prisma.project.count({ where }),
          ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
          return paginatedResponse(projects.map(p => projectListView({ ...p, fullText: cleanHtml(p.fullText) }, user)), total, page, pageSize);
     } catch (error) { return failureResponse(error, "Không thể tải danh sách dự án"); }
}

export async function POST(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);
          if (!canCreateProject(user)) return errorResponse("Bạn không có quyền tạo dự án", 403);
          const input = projectInput(await jsonObject(request));
          const project = await prisma.$transaction(async tx => {
               const created = await tx.project.create({ data: {
                    ...input, fullText: cleanHtml(input.fullText), title: input.title!, year: input.year!, ownerId: user.id,
                    members: { create: { userId: user.id, roleInProject: "Chủ nhiệm", allocation: 100 } },
               }, include: { owner: { select: { id: true, fullName: true, position: true, department: true } } } });
               await createAuditLog({ request, user, entity: "Project", entityId: created.id, action: "CREATE",
                    payload: { after: compactProjectForAudit(created) } }, tx);
               return created;
          });
          return successResponse(project, 201);
     } catch (error) { return failureResponse(error, "Không thể tạo dự án"); }
}
