import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function normalizeProject(project: any) {
     return {
          ...project,
          totalBudget: String(project.totalBudget || 0),
     };
}

export async function GET(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);

          const [
               totalProjects,
               ongoingProjectsCount,
               completedProjectsCount,
               totalMembers,
               budgetAggregate,
               recentProjects,
               allProjects,
               ongoingProjects,
               completedProjects,
               users,
          ] = await Promise.all([
               prisma.project.count(),
               prisma.project.count({ where: { status: "ONGOING" } }),
               prisma.project.count({ where: { status: "COMPLETED" } }),
               prisma.user.count({ where: { isActive: true } }),
               prisma.project.aggregate({ _sum: { totalBudget: true } }),
               prisma.project.findMany({
                    include: {
                         owner: {
                              select: {
                                   id: true,
                                   fullName: true,
                                   email: true,
                                   position: true,
                                   department: true,
                              },
                         },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5,
               }),
               prisma.project.findMany({
                    include: {
                         owner: {
                              select: {
                                   id: true,
                                   fullName: true,
                                   email: true,
                                   position: true,
                                   department: true,
                              },
                         },
                    },
                    orderBy: { createdAt: "desc" },
               }),
               prisma.project.findMany({
                    where: { status: "ONGOING" },
                    include: {
                         owner: {
                              select: {
                                   id: true,
                                   fullName: true,
                                   email: true,
                                   position: true,
                                   department: true,
                              },
                         },
                    },
                    orderBy: { createdAt: "desc" },
               }),
               prisma.project.findMany({
                    where: { status: "COMPLETED" },
                    include: {
                         owner: {
                              select: {
                                   id: true,
                                   fullName: true,
                                   email: true,
                                   position: true,
                                   department: true,
                              },
                         },
                    },
                    orderBy: { createdAt: "desc" },
               }),
               prisma.user.findMany({
                    where: { isActive: true },
                    select: {
                         id: true,
                         email: true,
                         fullName: true,
                         role: true,
                         position: true,
                         department: true,
                         createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
               }),
          ]);

          return successResponse({
               stats: {
                    totalProjects,
                    ongoingProjects: ongoingProjectsCount,
                    completedProjects: completedProjectsCount,
                    totalBudget: String(budgetAggregate._sum.totalBudget || 0),
                    totalMembers,
               },
               recentProjects: recentProjects.map(normalizeProject),
               lists: {
                    allProjects: allProjects.map(normalizeProject),
                    ongoingProjects: ongoingProjects.map(normalizeProject),
                    completedProjects: completedProjects.map(normalizeProject),
                    users,
               },
          });
     } catch (error) {
          console.error("GET /api/dashboard error:", error);
          return errorResponse("Không thể tải dữ liệu tổng quan", 500);
     }
}
