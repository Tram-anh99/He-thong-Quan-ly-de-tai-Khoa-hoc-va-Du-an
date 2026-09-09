import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { money, projectInput, pagination, jsonObject } from "../src/lib/validation";
import { signToken, verifyToken } from "../src/lib/tokens";
import { cleanHtml } from "../src/lib/html";

test("money preserves the Decimal boundary without floating point rounding", () => {
     assert.equal(money("999999999999999999.99").toFixed(2), "999999999999999999.99");
     for (const invalid of [-1, NaN, Infinity, 0.1, 9007199254740992, "1e4", "1.001", "1000000000000000000", null, {}, "-0"]) {
          assert.throws(() => money(invalid));
     }
     assert.equal(money("0.01").toFixed(2), "0.01");
});
test("project validation rejects impossible dates, reverse ranges and invalid updates", () => {
     const base = { title: "Đề tài", year: 2026 };
     for (const changes of [{ startDate: "2026-02-30" }, { startDate: "2026-09-20", endDate: "2026-09-01" },
          { year: "2026bad" }, { title: "  " }, { status: "INVALID" }, { ownerId: "injected" }]) {
          assert.throws(() => projectInput({ ...base, ...changes }));
     }
     assert.throws(() => projectInput({ endDate: "2026-01-01" }, { startDate: new Date("2026-02-01"), endDate: null }));
     assert.equal(projectInput({ ...base, startDate: "2024-02-29" }).startDate?.toISOString(), "2024-02-29T00:00:00.000Z");
});
test("pagination and malformed JSON produce validation errors", async () => {
     for (const query of ["page=-1", "page=2abc", "pageSize=0", "pageSize=101", "page=1.2"]) {
          assert.throws(() => pagination(new URLSearchParams(query)));
     }
     for (const body of ["{", "null", "[]", "true"]) {
          await assert.rejects(jsonObject(new Request("http://local", { method: "POST", body })));
     }
});
test("JWT requires a secret, rejects expired/wrong algorithm/malformed identity", () => {
     const original = process.env.JWT_SECRET;
     try {
          delete process.env.JWT_SECRET;
          assert.throws(() => signToken({ userId: "u", email: "u@test.local", role: "ADMIN" }));
          process.env.JWT_SECRET = "m01-unit-test-secret-with-at-least-32-bytes";
          const payload = { userId: "u", email: "u@test.local", role: "ADMIN" as const };
          assert.equal(verifyToken(signToken(payload))?.userId, "u");
          for (const token of [jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 }),
               jwt.sign(payload, process.env.JWT_SECRET, { algorithm: "HS384", expiresIn: "1h" }),
               jwt.sign({ userId: 12 }, process.env.JWT_SECRET, { expiresIn: "1h" }),
               jwt.sign(payload, process.env.JWT_SECRET), "broken"]) assert.equal(verifyToken(token), null);
     } finally {
          if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original;
     }
});
test("HTML sanitizer preserves formatting but removes executable content", () => {
     const dirty = '<p onclick="attack()">Nội dung <strong>hợp lệ</strong></p><script>attack()</script><img src=x onerror=attack()><a href="javascript:attack()">Link</a><svg onload="attack()"></svg>';
     const clean = cleanHtml(dirty)!;
     assert.match(clean, /<strong>hợp lệ<\/strong>/);
     assert.doesNotMatch(clean, /script|onclick|onerror|javascript:|onload|<svg|<img/);
});
