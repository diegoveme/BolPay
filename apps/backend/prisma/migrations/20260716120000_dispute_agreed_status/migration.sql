-- Add the 'agreed' dispute status. When a mutually accepted resolution pays the
-- freelancer a share, the split is locked in but NOT settled: the milestone
-- reopens for delivery and the company approves the work before the escrow
-- releases the agreed amounts. Appended last so this is a simple ADD VALUE.
ALTER TYPE "DisputeStatus" ADD VALUE 'agreed';
