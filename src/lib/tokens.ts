import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface JWTPayload { userId: string; email: string; role: Role }
function secret(): string {
     const value = process.env.JWT_SECRET;
     if (!value || Buffer.byteLength(value) < 32 || value === "fallback-secret-change-me") {
          throw new Error("JWT_SECRET must contain at least 32 bytes; no default secret is allowed");
     }
     return value;
}
export function signToken(payload: JWTPayload): string {
     return jwt.sign(payload, secret(), { algorithm: "HS256", expiresIn: "7d" });
}
export function verifyToken(token: string): JWTPayload | null {
     const key = secret();
     try {
          const data = jwt.verify(token, key, { algorithms: ["HS256"] });
          if (typeof data === "string" || typeof data.userId !== "string" || !data.userId ||
               typeof data.email !== "string" || !Object.values(Role).includes(data.role) ||
               typeof data.exp !== "number") return null;
          return { userId: data.userId, email: data.email, role: data.role };
     } catch { return null; }
}
