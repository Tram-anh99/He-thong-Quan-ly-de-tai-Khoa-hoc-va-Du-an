import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
     successResponse,
     errorResponse,
     paginatedResponse,
} from "@/lib/api-helpers";

// GET /api/projects - List all projects with filtering & pagination
export async function GET(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) {
               return errorResponse("Unauthorized", 401);
          }

          const { searchParams } = new URL(request.url);
          const page = parseInt(searchParams.get("page") || "1");
          const pageSize = parseInt(searchParams.get("pageSize") || "10");
          const year = searchParams.get("year");
          const status = searchParams.get("status");
          const search = searchParams.get("search");

          // Build where clause
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const where: any = {};

          if (year) {
               where.year = parseInt(year);
          }
          if (status) {
               where.status = status;
          }
          if (search) {
               where.OR = [
                    { title: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                    { summary: { contains: search, mode: "insensitive" } },
               ];
          }

          const [projects, total] = await Promise.all([
               prisma.project.findMany({
                    where,
                    include: {
                         owner: {
                              select: {
                                   id: true,
                                   fullName: true,
                                   position: true,
                                   department: true,
                              },
                         },
                         _count: {
                              select: {
                                   members: true,
                                   budgetItems: true,
                                   contracts: true,
                                   products: true,
                              },
                         },
                    },
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
               }),
               prisma.project.count({ where }),
          ]);

          return paginatedResponse(projects, total, page, pageSize);
     } catch (error) {
          console.error("GET /api/projects error:", error);
          return errorResponse("Không thể tải danh sách dự án", 500);
     }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) {
               return errorResponse("Unauthorized", 401);
          }

          // Only ADMIN, MANAGER, PI can create projects
          if (!["ADMIN", "MANAGER", "PI"].includes(user.role)) {
               return errorResponse("Bạn không có quyền tạo dự án", 403);
          }

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

          // Validation
          if (!title || title.trim().length === 0) {
               return errorResponse("Tên đề tài là bắt buộc");
          }
          if (!year) {
               return errorResponse("Năm thực hiện là bắt buộc");
          }

          // Check code uniqueness if provided
          if (code) {
               const existing = await prisma.project.findUnique({
                    where: { code },
               });
               if (existing) {
                    return errorResponse(`Mã đề tài "${code}" đã tồn tại`);
               }
          }

          const project = await prisma.project.create({
               data: {
                    code: code || null,
                    title: title.trim(),
                    summary: summary || null,
                    fullText: fullText || null,
                    ownerId: user.id,
                    totalBudget: totalBudget || 0,
                    fundingSource: fundingSource || null,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    year: parseInt(year),
                    status: status || "DRAFT",
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

          // Auto-add owner as member with "Chủ nhiệm" role
          await prisma.projectMember.create({
               data: {
                    projectId: project.id,
                    userId: user.id,
                    roleInProject: "Chủ nhiệm",
                    allocation: 100,
               },
          });

          return successResponse(project, 201);
     } catch (error) {
          console.error("POST /api/projects error:", error);
          return errorResponse("Không thể tạo dự án", 500);
     }
}
