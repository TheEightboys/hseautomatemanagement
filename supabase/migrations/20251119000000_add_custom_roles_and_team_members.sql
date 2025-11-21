-- Migration: Add custom roles and team members tables
-- Created: 2025-11-19

-- ============================================
-- 1. CREATE CUSTOM ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{
    "dashboard": false,
    "employees": false,
    "healthCheckups": false,
    "documents": false,
    "reports": false,
    "audits": false,
    "settings": false
  }'::jsonb,
  is_predefined BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, role_name)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_roles_company_id ON public.custom_roles (company_id);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_roles
DROP POLICY IF EXISTS "custom_roles_select" ON public.custom_roles;

CREATE POLICY "custom_roles_select" ON public.custom_roles FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "custom_roles_insert" ON public.custom_roles;

CREATE POLICY "custom_roles_insert" ON public.custom_roles FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "custom_roles_update" ON public.custom_roles;

CREATE POLICY "custom_roles_update" ON public.custom_roles FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

DROP POLICY IF EXISTS "custom_roles_delete" ON public.custom_roles;

CREATE POLICY "custom_roles_delete" ON public.custom_roles FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
    AND is_predefined = false
);

-- ============================================
-- 2. CREATE TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'active',
            'inactive'
        )
    ),
    invited_at TIMESTAMPTZ DEFAULT now(),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (company_id, email)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON public.team_members (company_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members (user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members (email);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;

CREATE POLICY "team_members_select" ON public.team_members FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;

CREATE POLICY "team_members_insert" ON public.team_members FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "team_members_update" ON public.team_members;

CREATE POLICY "team_members_update" ON public.team_members FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

-- ============================================
-- 3. ADD UPDATED_AT TRIGGER FUNCTIONS
-- ============================================

-- Trigger function for custom_roles
CREATE OR REPLACE FUNCTION public.update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_roles_updated_at ON public.custom_roles;

CREATE TRIGGER custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_roles_updated_at();

-- Trigger function for team_members
CREATE OR REPLACE FUNCTION public.update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_members_updated_at();

-- ============================================
-- 4. INSERT PREDEFINED ROLES (OPTIONAL)
-- ============================================

-- This will insert predefined roles for existing companies
-- You can run this separately if needed

-- INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
-- SELECT
--   c.id as company_id,
--   'Admin' as role_name,
--   '{"dashboard": true, "employees": true, "healthCheckups": true, "documents": true, "reports": true, "audits": true, "settings": true}'::jsonb,
--   true
-- FROM public.companies c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.custom_roles cr
--   WHERE cr.company_id = c.id AND cr.role_name = 'Admin'
-- );

-- Grant necessary permissions
GRANT ALL ON public.custom_roles TO authenticated;

GRANT ALL ON public.team_members TO authenticated;