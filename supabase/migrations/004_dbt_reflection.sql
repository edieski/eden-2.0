-- Add DBT reflection column to food_logs for binge eating support prompts
ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS dbt_prompt text,
  ADD COLUMN IF NOT EXISTS dbt_reflection text;

COMMENT ON COLUMN food_logs.dbt_prompt IS 'The DBT writing prompt shown to the user during meal logging';
COMMENT ON COLUMN food_logs.dbt_reflection IS 'User''s written response to the DBT prompt';
