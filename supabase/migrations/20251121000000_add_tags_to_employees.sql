-- Add tags and notes columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS tags text [] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes text;

-- Add comments
COMMENT ON COLUMN employees.tags IS 'Array of tags/keywords for employee categorization';

COMMENT ON COLUMN employees.notes IS 'Additional notes and remarks about the employee';