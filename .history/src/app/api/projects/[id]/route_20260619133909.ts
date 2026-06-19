import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-helpers";

type Params = { params: { id: string } };

// GET /api/projects/[id] - Get project details
export async function GET(request: NextRequest, { params }: Params) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);

          const project = await prisma.project.findUnique({
               where: { id: params.id },
               include: {
                    owner: {
                         select: {
                              id: true,
                              fullName: true,
                              position: true,
                              department: true,
                              email: true,
                         },
                    },
                    members: {
                         include: {
                              user: {
                                   select: {
                                        id: true,
                                        fullName: true,
                                        position: true,
                                        department: true,
                                        email: true,
                                   },
                              },
                         },
                    },
                    budgetItems: {
                         include: {
                              assignedTo: {
                                   select: { id: true, fullName: true },
                              },
                         },
                         orderBy: { sortOrder: "asc" },
                    },
                    documents: { orderBy: { createdAt: "desc" } },
                    contracts: {
                         include: {
                              user: { select: { id: true, fullName: true } },
                         },
                         orderBy: { createdAt: "desc" },
                    },
                    products: { orderBy: { createdAt: "desc" } },
                    paymentRecords: {
                         include: {
                              budgetItem: { select: { id: true, title: true } },
                              contract: {
                                   select: {
                                        id: true,
                                        title: true,
                                        contractNo: true,
                                   },
                              },
                         },
                         orderBy: { createdAt: "desc" },
                    },
               },
          });

          if (!project) return errorResponse("Không tìm thấy dự án", 404);

          return successResponse(project);
     } catch (error) {
          console.error("GET /api/projects/[id] error:", error);
          return errorResponse("Không thể tải thông tin dự án", 500);
     }
}

// PUT /api/projects/[id] - Update project
export async function PUT(request: NextRequest, { params }: Params) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);

          const existing = await prisma.project.findUnique({
               where: { id: params.id },
          });
          if (!existing) return errorResponse("Không tìm thấy dự án", 404);

          // Only owner, ADMIN, MANAGER can edit
          const canEdit =
               ["ADMIN", "MANAGER"].includes(user.role) ||
               existing.ownerId === user.id;
          if (!canEdit)
               return errorResponse("Bạn không có quyền sửa dự án này", 403);

          const body = await request.json();
          const {
               code,
               title,
               summary,
               fullText,
               totalBudget,
               fundingSource,
               startDate,
               endDate,
               year,
               status,
          } = body;

          // Check code uniqueness if changed
          if (code && code !== existing.code) {
               const codeExists = await prisma.project.findUnique({
                    where: { code },
               });
               if (codeExists)
                    return errorResponse(`Mã đề tài "${code}" đã tồn tại`);
          }

          const project = await prisma.project.update({
               where: { id: params.id },
               data: {
                    ...(code !== undefined && { code: code || null }),
                    ...(title !== undefined && { title: title.trim() }),
                    ...(summary !== undefined && { summary }),
                    ...(fullText !== undefined && { fullText }),
                    ...(totalBudget !== undefined && { totalBudget }),
                    ...(fundingSource !== undefined && { fundingSource }),
                    ...(startDate !== undefined && {
                         startDate: startDate ? new Date(startDate) : null,
                    }),
                    ...(endDate !== undefined && {
                         endDate: endDate ? new Date(endDate) : null,
                    }),
                    ...(year !== undefined && { year: parseInt(year) }),
                    ...(status !== undefined && { status }),
               },
               include: {
                    owner: {
                         select: {
                              id: true,
                              fullName: true,
                              position: true,
                              department: true,
                         },
                    },
               },
          });

          return successResponse(project);
     } catch (error) {
          console.error("PUT /api/projects/[id] error:", error);
          return errorResponse("Không thể cập nhật dự án", 500);
     }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(request: NextRequest, { params }: Params) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);

          if (!["ADMIN", "MANAGER"].includes(user.role)) {
               return errorResponse("Bạn không có quyền xóa dự án", 403);
          }

          const existing = await prisma.project.findUnique({
               where: { id: params.id },
          });
          if (!existing) return errorResponse("Không tìm thấy dự án", 404);

          await prisma.project.delete({ where: { id: params.id } });

          return successResponse({ message: "Đã xóa dự án thành công" });
     } catch (error) {
          console.error("DELETE /api/projects/[id] error:", error);
          return errorResponse("Không thể xóa dự án", 500);
     }
}
