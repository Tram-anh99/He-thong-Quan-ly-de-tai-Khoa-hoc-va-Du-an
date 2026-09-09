import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "EXPORT";

interface AuditUser {
     id: string;
}

interface CreateAuditLogParams {
     request: NextRequest;
     user: AuditUser;
     entity: string;
     entityId: string;
     action: AuditAction;
     payload?: unknown;
}

export async function createAuditLog({
     request,
     user,
     entity,
     entityId,
     action,
     payload,
}: CreateAuditLogParams, tx: Prisma.TransactionClient) {
     const forwardedFor = request.headers.get("x-forwarded-for");
     const ipAddress =
          forwardedFor?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          null;

     await tx.auditLog.create({
          data: {
               entity,
               entityId,
               action,
               payload: payload === undefined ? undefined : (payload as object),
               userId: user.id,
               ipAddress,
          },
     });
}

export function compactProjectForAudit(project: {
     id: string;
     code: string | null;
     title: string;
     summary?: string | null;
     fullText?: string | null;
     ownerId: string;
     totalBudget: unknown;
     fundingSource?: string | null;
     startDate?: Date | string | null;
     endDate?: Date | string | null;
     year: number;
     status: string;
}) {
     return {
          id: project.id,
          code: project.code,
          title: project.title,
          summary: project.summary || null,
          fullText: project.fullText || null,
          ownerId: project.ownerId,
          totalBudget: String(project.totalBudget),
          fundingSource: project.fundingSource || null,
          startDate: project.startDate,
          endDate: project.endDate,
          year: project.year,
          status: project.status,
     };
}
