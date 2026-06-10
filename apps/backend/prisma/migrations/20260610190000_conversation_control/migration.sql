ALTER TYPE "Intent" ADD VALUE IF NOT EXISTS 'opening_hours';

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "qualifying_question_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "booking_attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sales_pitch_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "handoff_reason" TEXT;

UPDATE "system_settings"
SET "value" = '0.3'::jsonb, "updated_at" = now()
WHERE "key" = 'temperature' AND "value" = '0.6'::jsonb;

INSERT INTO "system_settings" ("key", "value", "updated_at") VALUES
  ('max_qualifying_questions', '3'::jsonb, now()),
  ('max_booking_attempts', '2'::jsonb, now()),
  ('max_sales_pitches', '1'::jsonb, now()),
  ('response_delay_min_ms', '3000'::jsonb, now()),
  ('response_delay_max_ms', '7000'::jsonb, now()),
  (
    'business_hours',
    '{
      "timezone": "America/Sao_Paulo",
      "weekly": {
        "monday": [{"start": "09:00", "end": "18:00"}],
        "tuesday": [{"start": "09:00", "end": "18:00"}],
        "wednesday": [{"start": "09:00", "end": "18:00"}],
        "thursday": [{"start": "09:00", "end": "18:00"}],
        "friday": [{"start": "09:00", "end": "18:00"}],
        "saturday": [{"start": "09:00", "end": "16:00"}],
        "sunday": []
      },
      "exceptionNote": "Atendemos fora destes horarios mediante previa combinacao entre o profissional e o cliente."
    }'::jsonb,
    now()
  )
ON CONFLICT ("key") DO NOTHING;
