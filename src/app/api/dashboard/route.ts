import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, failureResponse } from "@/lib/api-helpers";
import { projectScope, projectListView } from "@/lib/access";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
     try {
          const user = await getCurrentUser(request);
          if (!user) return errorResponse("Unauthorized", 401);
          const where = projectScope(user);
          const globalUsers = ["ADMIN", "MANAGER", "ACCOUNTANT"].includes(user.role);
          const [projects, users] = await prisma.$transaction([
               prisma.project.findMany({ where, select: { id: true, code: true, title: true, year: true, status: true,
                    ownerId: true, totalBudget: true, createdAt: true,
                    owner: { select: { id: true, fullName: true, position: true, department: true } } },
                    orderBy: [{ createdAt: "desc" }, { id: "asc" }] }),
               prisma.user.findMany({ where: { isActive: true, ...(globalUsers ? {} : user.role === "PI" ? {
                    OR: [{ id: user.id }, { memberships: { some: { project: { ownerId: user.id } } } }],
               } : { id: user.id }) }, select: { id: true, fullName: true, role: true, position: true, department: true, createdAt: true },
                    orderBy: { createdAt: "desc" } }),
          ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
          const allProjects = projects.map(p => projectListView({ ...p, totalBudget: p.totalBudget.toString() }, user));
          const ongoingProjects = allProjects.filter(p => p.status === "ONGOING");
          const completedProjects = allProjects.filter(p => p.status === "COMPLETED");
          return successResponse({ stats: {
               totalProjects: projects.length, ongoingProjects: ongoingProjects.length, completedProjects: completedProjects.length,
               totalMembers: users.length, totalBudget: user.role === "RESEARCHER" ? null :
                    projects.reduce((sum, p) => sum.add(p.totalBudget), new Prisma.Decimal(0)).toString(),
          }, recentProjects: allProjects.slice(0, 5), lists: { allProjects, ongoingProjects, completedProjects, users } });
     } catch (error) { return failureResponse(error, "Không thể tải dữ liệu tổng quan"); }
}
