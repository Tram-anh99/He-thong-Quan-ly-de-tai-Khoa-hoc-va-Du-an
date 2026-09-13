-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "position" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_userId_key" ON "people"("userId");
CREATE UNIQUE INDEX "people_email_key" ON "people"("email");
CREATE INDEX "people_fullName_idx" ON "people"("fullName");
CREATE INDEX "people_isActive_idx" ON "people"("isActive");

-- Existing accounts retain their existing profile data as linked People records.
INSERT INTO "people" ("id", "userId", "fullName", "email", "phoneNumber", "position", "department", "isActive", "createdAt", "updatedAt")
SELECT 'person-' || "id", "id", "fullName", "email", "phoneNumber", "position", "department", "isActive", "createdAt", "updatedAt"
FROM "users";

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
