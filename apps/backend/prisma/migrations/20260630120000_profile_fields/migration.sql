-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "values" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "freelancer_profiles" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "github" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "website" TEXT;
