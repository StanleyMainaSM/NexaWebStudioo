-- AVELIXA ENTERPRISE PLATFORM - PHASE C MIGRATION
-- Safely extends the Phase B database to Phase C requirements.
-- Does not drop existing tables or delete existing rows.

-- ==========================================
-- 1. PRESERVE & EXTEND EXISTING TABLES
-- ==========================================

-- Extend user_roles constraint
DO $$ 
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'user_roles'
    AND n.nspname = 'public'
    AND c.contype = 'c'
    AND a.attname = 'role'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_roles DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;

  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('owner', 'admin', 'connector', 'developer', 'operator', 'client'));
END $$;

-- Add missing columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS package_id UUID;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Extend projects status
DO $$ 
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'projects'
    AND n.nspname = 'public'
    AND c.contype = 'c'
    AND a.attname = 'status'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.projects DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;

  ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled', 'on_hold', 'maintenance'));
END $$;

-- ==========================================
-- 2. CRM SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign Key to Projects
DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT fk_projects_business FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  requirements TEXT,
  estimated_budget DECIMAL(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. CONVERSATIONS & EXTENDED MESSAGES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend existing messages table safely
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ==========================================
-- 4. CONNECTOR SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS public.connector_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  national_id_secure TEXT, -- Requires server-side encryption before insertion
  county TEXT,
  town TEXT,
  referring_connector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS public.connector_avl_id_seq START 1;

CREATE TABLE IF NOT EXISTS public.connector_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  avl_id TEXT UNIQUE DEFAULT 'AVL-' || lpad(nextval('public.connector_avl_id_seq')::text, 4, '0'),
  is_active BOOLEAN DEFAULT true,
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. PACKAGES & PROJECT OPERATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  features JSONB,
  base_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign Key to Packages
DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT fk_projects_package FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. FINANCIAL SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connector_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  eligible_amount DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_connector_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. MAINTENANCE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.maintenance_plans(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial')),
  trial_ends_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. PUBLIC CONTENT & NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  live_url TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. AUDIT LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, TEXT) TO service_role;

-- ==========================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Base RLS implementations (Require further expansion for fully-grained access based on exact requirements)
DO $$ 
BEGIN
  -- We use DO block to gracefully handle existing policies in case of re-runs
  DROP POLICY IF EXISTS "Connectors can see their leads businesses" ON public.businesses;
  CREATE POLICY "Connectors can see their leads businesses" ON public.businesses
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.leads WHERE leads.business_id = businesses.id AND leads.connector_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('owner', 'admin'))
    );
EXCEPTION WHEN others THEN null; END $$;

-- Audit logs (append only)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
  CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('owner', 'admin')));

  DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
EXCEPTION WHEN others THEN null; END $$;

-- ==========================================
-- 11. STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('public-assets', 'public-assets', true),
  ('business-media', 'business-media', false),
  ('project-documents', 'project-documents', false),
  ('financial-receipts', 'financial-receipts', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public assets are viewable by everyone" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can manage public assets" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own private media" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own private media" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can manage private media" ON storage.objects;
EXCEPTION WHEN others THEN null; END $$;

CREATE POLICY "Public assets are viewable by everyone" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'public-assets');

CREATE POLICY "Admins can manage public assets" 
  ON storage.objects FOR ALL 
  USING (
    bucket_id = 'public-assets' 
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('owner', 'admin'))
  );

CREATE POLICY "Users can view their own private media" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id IN ('business-media', 'project-documents', 'financial-receipts') 
    AND auth.uid() = owner
  );

CREATE POLICY "Users can upload their own private media" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id IN ('business-media', 'project-documents', 'financial-receipts') 
    AND auth.uid() = owner
  );

CREATE POLICY "Admins can manage private media" 
  ON storage.objects FOR ALL 
  USING (
    bucket_id IN ('business-media', 'project-documents', 'financial-receipts') 
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('owner', 'admin'))
  );
