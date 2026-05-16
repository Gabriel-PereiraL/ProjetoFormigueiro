-- ============================================================
-- Migration: Slots com horários reais + BookingStatus CANCELED
-- ============================================================

-- 1. BookingStatus: substituir CANCELLED por CANCELED (1 L)
--    Primeiro criar o novo tipo, migrar dados, depois trocar
BEGIN;

CREATE TYPE "BookingStatus_new" AS ENUM ('CONFIRMED', 'CANCELED');

-- Atualizar registros existentes (CANCELLED → CANCELED)
UPDATE "bookings" SET "status" = 'CONFIRMED' WHERE "status" = 'CONFIRMED';

ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings"
  ALTER COLUMN "status" TYPE "BookingStatus_new"
  USING (
    CASE "status"::text
      WHEN 'CANCELLED' THEN 'CANCELED'::"BookingStatus_new"
      WHEN 'CONFIRMED' THEN 'CONFIRMED'::"BookingStatus_new"
      ELSE 'CONFIRMED'::"BookingStatus_new"
    END
  );

ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";

ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

COMMIT;

-- 2. Slots: substituir 'period' (enum Period) por startTime + endTime
--    Remover unique constraint antiga e índice
DROP INDEX IF EXISTS "slots_date_period_active_idx";
DROP INDEX IF EXISTS "slots_date_period_key";

-- Remover colunas antigas do slot
ALTER TABLE "slots" DROP COLUMN IF EXISTS "date";
ALTER TABLE "slots" DROP COLUMN IF EXISTS "period";

-- Adicionar novas colunas de horário real
ALTER TABLE "slots"
  ADD COLUMN IF NOT EXISTS "startTime" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endTime"   TIMESTAMP(3);

-- Preencher com valores placeholder (apenas para ambientes com dados existentes)
UPDATE "slots"
SET
  "startTime" = CURRENT_TIMESTAMP,
  "endTime"   = CURRENT_TIMESTAMP + INTERVAL '30 minutes'
WHERE "startTime" IS NULL;

-- Tornar NOT NULL após preencher
ALTER TABLE "slots" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "slots" ALTER COLUMN "endTime"   SET NOT NULL;

-- Recriar constraint de unicidade (sem overlap de duplicatas exatas)
CREATE UNIQUE INDEX "slots_startTime_endTime_key"
  ON "slots"("startTime", "endTime");

-- Recriar índice de busca por data (via startTime)
CREATE INDEX "slots_startTime_active_idx"
  ON "slots"("startTime", "active");

-- 3. Remover enum Period (não mais usado)
DROP TYPE IF EXISTS "Period";
