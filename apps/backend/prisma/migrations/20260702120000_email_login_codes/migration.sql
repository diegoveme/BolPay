-- Email login codes: short-lived numeric codes emailed to prove ownership of an
-- email address on the manual (self-declared wallet) sign-in path, before
-- /auth/login. Keyed by email (one active code per address), not by user.

-- CreateTable
CREATE TABLE "email_login_codes" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_login_codes_email_key" ON "email_login_codes"("email");
