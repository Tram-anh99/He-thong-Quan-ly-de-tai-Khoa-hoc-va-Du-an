import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
};

export const prisma =
     globalForPrisma.prisma ??
     new PrismaClient({
          log: [], // Route-level logging excludes payloads and database credentials.
     });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
