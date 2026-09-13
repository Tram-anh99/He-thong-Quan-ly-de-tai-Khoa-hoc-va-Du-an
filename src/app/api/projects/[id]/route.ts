import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, failureResponse } from "@/lib/api-helpers";
import { compactProjectForAudit, createAuditLog } from "@/lib/audit";
import { canArchiveProject, canEditProject, projectListView, projectScope } from "@/lib/access";
import { jsonObject, projectInput } from "@/lib/validation";
import { cleanHtml } from "@/lib/html";

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);
          const member = user.role === "RESEARCHER";
          const project = await prisma.project.findFirst({
               where: { AND: [{ id: params.id }, projectScope(user)] },
               include: {
                    owner: { select: { id: true, fullName: true, position: true, department: true } },
                    members: { where: member ? { userId: user.id } : {}, include: {
                         user: { select: { id: true, fullName: true, position: true, department: true } } } },
                    budgetItems: { where: member ? { assignedToId: user.id } : {},
                         include: { assignedTo: { select: { id: true, fullName: true } } }, orderBy: { sortOrder: "asc" } },
                    contracts: { where: member ? { userId: user.id } : {},
                         include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "desc" } },
                    // Legacy records do not identify a payee reliably. Withhold them from member responses until migrated.
                    paymentRecords: !member, documents: !member, products: !member,
               },
          });
          if (!project) return errorResponse("Không tìm thấy dự án", 404);
          return successResponse(projectListView({ ...project, fullText: cleanHtml(project.fullText) }, user));
     } catch (error) { return failureResponse(error, "Không thể tải thông tin dự án"); }
}

export async function PUT(request: NextRequest, { params }: Params) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);
          const body = await jsonObject(request);
          return await prisma.$transaction(async tx => {
               const existing = await tx.project.findFirst({ where: { AND: [{ id: params.id }, projectScope(user)] } });
               if (!existing) return errorResponse("Không tìm thấy dự án", 404);
               if (!canEditProject(user, existing.ownerId)) return errorResponse("Bạn không có quyền sửa dự án này", 403);
               const input = projectInput(body, existing);
               const project = await tx.project.update({ where: { id: params.id }, data: {
                    ...input, ...(input.fullText !== undefined && { fullText: cleanHtml(input.fullText) }),
               }, include: { owner: { select: { id: true, fullName: true, position: true, department: true } } } });
               await createAuditLog({ request, user, entity: "Project", entityId: project.id, action: "UPDATE",
                    payload: { before: compactProjectForAudit(existing), after: compactProjectForAudit(project) } }, tx);
               return successResponse(project);
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
     } catch (error) { return failureResponse(error, "Không thể cập nhật dự án"); }
}

// Legacy DELETE is now a reversible archive; no child financial records are removed.
export async function DELETE(request: NextRequest, { params }: Params) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);
          if (!canArchiveProject(user)) return errorResponse("Bạn không có quyền lưu trữ dự án", 403);
          return await prisma.$transaction(async tx => {
               const existing = await tx.project.findUnique({ where: { id: params.id } });
               if (!existing) return errorResponse("Không tìm thấy dự án", 404);
               if (existing.status !== "ARCHIVED") {
                    const archived = await tx.project.update({ where: { id: params.id }, data: { status: "ARCHIVED" } });
                    await createAuditLog({ request, user, entity: "Project", entityId: params.id, action: "UPDATE",
                         payload: { reason: "Lưu trữ đề tài thay cho xóa dữ liệu", before: compactProjectForAudit(existing),
                              after: compactProjectForAudit(archived) } }, tx);
               }
               return successResponse({ message: "Đã lưu trữ dự án, giữ nguyên hồ sơ và thanh toán" });
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
     } catch (error) { return failureResponse(error, "Không thể lưu trữ dự án"); }
}
