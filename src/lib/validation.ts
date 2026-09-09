import { Prisma, ProjectStatus } from "@prisma/client";

export class ValidationError extends Error {}

export function integer(value: unknown, name: string, min: number, max: number): number {
     if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value))) {
          throw new ValidationError(`${name} phải là số nguyên`);
     }
     const parsed = Number(value);
     if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
          throw new ValidationError(`${name} phải từ ${min} đến ${max}`);
     }
     return parsed;
}

export function pagination(params: URLSearchParams, defaultSize = 10) {
     return {
          page: integer(params.get("page") ?? "1", "Trang", 1, 1_000_000),
          pageSize: integer(params.get("pageSize") ?? String(defaultSize), "Số dòng", 1, 100),
     };
}

export function projectStatus(value: unknown): ProjectStatus {
     if (typeof value !== "string" || !Object.values(ProjectStatus).includes(value as ProjectStatus)) {
          throw new ValidationError("Trạng thái đề tài không hợp lệ");
     }
     return value as ProjectStatus;
}

export function money(value: unknown): Prisma.Decimal {
     // Large amounts must arrive as strings: JS numbers may already have lost precision.
     if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) {
          throw new ValidationError("Số tiền thập phân hoặc lớn phải truyền bằng chuỗi");
     }
     if ((typeof value !== "string" && typeof value !== "number") ||
          !/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/.test(String(value))) {
          throw new ValidationError("Số tiền phải không âm, tối đa 18 chữ số và 2 số thập phân");
     }
     return new Prisma.Decimal(value);
}

function date(value: unknown, name: string): Date | null {
     if (value === null || value === "") return null;
     if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(T00:00:00\.000Z)?$/.test(value)) {
          throw new ValidationError(`${name} phải có dạng YYYY-MM-DD`);
     }
     const parsed = new Date(value.slice(0, 10) + "T00:00:00.000Z");
     if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.slice(0, 10)) {
          throw new ValidationError(`${name} không hợp lệ`);
     }
     return parsed;
}

export async function jsonObject(request: Request): Promise<Record<string, unknown>> {
     let body: unknown;
     try { body = await request.json(); } catch { throw new ValidationError("JSON không hợp lệ"); }
     if (!body || typeof body !== "object" || Array.isArray(body)) throw new ValidationError("Dữ liệu phải là một object");
     return body as Record<string, unknown>;
}

type ProjectDates = { startDate: Date | null; endDate: Date | null };
export function projectInput(body: Record<string, unknown>, existing?: ProjectDates) {
     const allowed = ["code", "title", "summary", "fullText", "totalBudget", "fundingSource", "startDate", "endDate", "year", "status"];
     if (Object.keys(body).some(key => !allowed.includes(key))) throw new ValidationError("Trường dữ liệu không được hỗ trợ");
     const data: {
          code?: string | null; title?: string; summary?: string | null; fullText?: string | null;
          fundingSource?: string | null; totalBudget?: Prisma.Decimal; startDate?: Date | null;
          endDate?: Date | null; year?: number; status?: ProjectStatus;
     } = {};
     for (const key of ["code", "title", "summary", "fullText", "fundingSource"] as const) {
          if (body[key] === undefined) continue;
          const value = body[key];
          if (value === null && key !== "title") { data[key] = null; continue; }
          if (typeof value !== "string") throw new ValidationError(`${key} phải là chuỗi`);
          const trimmed = value.trim();
          const limit = key === "fullText" ? 200_000 : key === "summary" ? 10_000 : 500;
          if (trimmed.length > limit) throw new ValidationError(`${key} quá dài`);
          if (key === "title") {
               if (!trimmed) throw new ValidationError("Tên đề tài là bắt buộc");
               data.title = trimmed;
          } else { data[key] = trimmed || null; }
     }
     if (body.totalBudget !== undefined) data.totalBudget = money(body.totalBudget);
     if (body.year !== undefined) data.year = integer(body.year, "Năm", 1900, 2200);
     if (body.status !== undefined) data.status = projectStatus(body.status);
     if (body.startDate !== undefined) data.startDate = date(body.startDate, "Ngày bắt đầu");
     if (body.endDate !== undefined) data.endDate = date(body.endDate, "Ngày kết thúc");
     if (!existing && (!data.title || !data.year)) throw new ValidationError("Tên đề tài và năm là bắt buộc");
     const start = data.startDate === undefined ? existing?.startDate : data.startDate;
     const end = data.endDate === undefined ? existing?.endDate : data.endDate;
     if (start && end && start > end) throw new ValidationError("Ngày kết thúc phải từ ngày bắt đầu trở đi");
     return data;
}
