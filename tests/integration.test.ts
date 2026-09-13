import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PrismaClient, Role } from "@prisma/client";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !/^research_m01_test(?:_|$)/.test(new URL(testUrl).pathname.slice(1))) {
     throw new Error("TEST_DATABASE_URL must explicitly select a research_m01_test database");
}
process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = "integration-test-secret-at-least-32-bytes";

test("PostgreSQL API authorization, transactions, validation and archive", async t => {
     const { GET: list, POST: create } = await import("../src/app/api/projects/route");
     const { GET: detail, PUT: update, DELETE: archive } = await import("../src/app/api/projects/[id]/route");
     const { GET: dashboard } = await import("../src/app/api/dashboard/route");
     const { GET: audit } = await import("../src/app/api/audit-logs/route");
     const { signToken } = await import("../src/lib/tokens");
     const { default: appPrisma } = await import("../src/lib/prisma");
     const db = new PrismaClient({ datasourceUrl: testUrl });
     const suffix = Date.now().toString();
     const users = {} as Record<Role, { id: string; email: string; role: Role }>;
     function req(role: Role | null, path = "/api/projects", method = "GET", body?: unknown) {
          return new NextRequest(`http://localhost${path}`, { method,
               headers: { ...(role ? { cookie: `auth-token=${signToken({ userId: users[role].id, email: users[role].email, role })}` } : {}),
                    "content-type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
     }
     try {
          for (const role of Object.values(Role)) users[role] = await db.user.create({ data: {
               email: `${role}-${suffix}@example.test`, fullName: `${role} test`, password: "not-a-login-hash", role,
          } });
          let projectId = "";
          let otherId = "";
          await t.test("owner membership and audit are created with the project", async () => {
               const response = await create(req("PI", undefined, "POST", { title: "Owned", code: `own-${suffix}`, year: 2026,
                    totalBudget: "999999999999999999.99", startDate: "2026-01-01", fullText: '<p onclick="bad()">Safe</p><script>bad()</script>' }));
               assert.equal(response.status, 201);
               projectId = (await response.json()).data.id;
               assert.equal(await db.projectMember.count({ where: { projectId, userId: users.PI.id } }), 1);
               assert.equal(await db.auditLog.count({ where: { entityId: projectId, action: "CREATE" } }), 1);
               assert.equal((await db.project.findUniqueOrThrow({ where: { id: projectId } })).fullText, "<p>Safe</p>");
               const other = await create(req("ADMIN", undefined, "POST", { title: "Other", year: 2026 }));
               otherId = (await other.json()).data.id;
          });
          await db.projectMember.create({ data: { projectId, userId: users.RESEARCHER.id } });
          const contract = await db.contract.create({ data: { projectId, userId: users.PI.id, title: "Private contract", amount: "123.45" } });
          await db.paymentRecord.create({ data: { projectId, contractId: contract.id, amount: "12.34", status: "COMPLETED" } });
          await db.budgetItem.create({ data: { projectId, title: "Synthetic budget", assignedToId: users.PI.id, amount: "50.01" } });
          await db.projectDocument.create({ data: { projectId, name: "Synthetic document", fileUrl: "/private/test.pdf", fileType: "application/pdf" } });
          await db.product.create({ data: { projectId, title: "Synthetic deliverable" } });
          await db.documentTemplate.create({ data: { name: "Synthetic template", fileUrl: "/private/test.docx" } });
          await t.test("unauthenticated, cross-project and member finances stay protected", async () => {
               assert.equal((await list(req(null))).status, 401);
               assert.equal((await detail(req("PI"), { params: { id: otherId } })).status, 404);
               assert.equal((await detail(req("RESEARCHER"), { params: { id: otherId } })).status, 404);
               assert.equal((await create(req("RESEARCHER", undefined, "POST", { title: "Denied", year: 2026 }))).status, 403);
               assert.equal((await archive(req("PI", undefined, "DELETE"), { params: { id: projectId } })).status, 403);
               const ownList = await (await list(req("PI", "/api/projects?search=Other"))).json();
               assert.equal(ownList.data.length, 0, "search must not replace authorization scope");
               const memberDetail = await (await detail(req("RESEARCHER"), { params: { id: projectId } })).json();
               assert.equal(memberDetail.data.totalBudget, undefined);
               assert.equal(memberDetail.data.contracts.length, 0);
               assert.equal(memberDetail.data.paymentRecords, undefined);
               assert.equal(memberDetail.data.budgetItems.length, 0);
               assert.equal(memberDetail.data.documents, undefined);
               assert.equal(memberDetail.data.members.length, 1);
               const summary = await (await dashboard(req("RESEARCHER"))).json();
               assert.equal(summary.data.stats.totalBudget, null);
               assert.equal(summary.data.lists.allProjects.length, 1);
               assert.equal(summary.data.lists.users.length, 1);
               assert.equal((await audit(req("RESEARCHER"))).status, 403);
               for (const role of ["ADMIN", "MANAGER", "ACCOUNTANT"] as const) {
                    assert.equal((await detail(req(role), { params: { id: otherId } })).status, 200);
               }
               assert.equal((await update(req("ACCOUNTANT", undefined, "PUT", { title: "Forbidden" }), { params: { id: projectId } })).status, 403);
          });
          await t.test("disabled users cannot keep using old signed sessions", async () => {
               await db.user.update({ where: { id: users.PI.id }, data: { isActive: false } });
               assert.equal((await list(req("PI"))).status, 401);
               await db.user.update({ where: { id: users.PI.id }, data: { isActive: true } });
          });
          await t.test("bad pagination, payload and duplicate code return 4xx", async () => {
               assert.equal((await list(req("ADMIN", "/api/projects?pageSize=1000"))).status, 400);
               assert.equal((await create(req("ADMIN", undefined, "POST", { title: "x", year: 2026, totalBudget: -1 }))).status, 400);
               assert.equal((await create(req("ADMIN", undefined, "POST", { title: "x", year: 2026, code: `own-${suffix}` }))).status, 409);
               assert.equal((await update(req("PI", undefined, "PUT", { endDate: "2025-12-01" }), { params: { id: projectId } })).status, 400);
               const malformed = req("ADMIN", undefined, "POST");
               assert.equal((await create(malformed)).status, 400);
          });
          await t.test("audit insertion failure rolls back create, update and archive", async () => {
               await db.$executeRawUnsafe("CREATE OR REPLACE FUNCTION m01_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected audit failure'; END $$");
               await db.$executeRawUnsafe("CREATE TRIGGER m01_reject_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION m01_reject_audit()");
               try {
                    const count = await db.project.count();
                    const members = await db.projectMember.count();
                    assert.equal((await create(req("ADMIN", undefined, "POST", { title: "Rollback", year: 2026 }))).status, 500);
                    assert.equal(await db.project.count(), count);
                    assert.equal(await db.projectMember.count(), members);
                    assert.equal((await update(req("PI", undefined, "PUT", { title: "Changed" }), { params: { id: projectId } })).status, 500);
                    assert.equal((await db.project.findUniqueOrThrow({ where: { id: projectId } })).title, "Owned");
                    assert.equal((await archive(req("ADMIN", undefined, "DELETE"), { params: { id: projectId } })).status, 500);
                    assert.equal((await db.project.findUniqueOrThrow({ where: { id: projectId } })).status, "DRAFT");
               } finally { await db.$executeRawUnsafe("DROP TRIGGER m01_reject_audit ON audit_logs"); }
          });
          await t.test("archive preserves financial records and is idempotent", async () => {
               const before = await db.paymentRecord.aggregate({ where: { projectId }, _sum: { amount: true } });
               assert.equal((await archive(req("ADMIN", undefined, "DELETE"), { params: { id: projectId } })).status, 200);
               const logs = await db.auditLog.count({ where: { entityId: projectId } });
               assert.equal((await archive(req("ADMIN", undefined, "DELETE"), { params: { id: projectId } })).status, 200);
               assert.equal(await db.auditLog.count({ where: { entityId: projectId } }), logs);
               assert.equal((await db.project.findUniqueOrThrow({ where: { id: projectId } })).status, "ARCHIVED");
               assert.equal(await db.contract.count({ where: { projectId } }), 1);
               const after = await db.paymentRecord.aggregate({ where: { projectId }, _sum: { amount: true } });
               assert.equal(after._sum.amount?.toString(), before._sum.amount?.toString());
          });
     } finally {
          // Keep synthetic fixtures for the separate dump/restore reconciliation test.
          await db.$disconnect();
          await appPrisma.$disconnect();
     }
});
