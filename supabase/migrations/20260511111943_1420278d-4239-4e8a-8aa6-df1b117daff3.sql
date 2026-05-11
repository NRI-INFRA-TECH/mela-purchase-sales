
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.team_kind AS ENUM ('sales', 'purchase');
CREATE TYPE public.record_status AS ENUM ('accepted', 'follow_up', 'rejected');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User teams
CREATE TABLE public.user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team public.team_kind NOT NULL,
  UNIQUE(user_id, team)
);
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

-- Has-role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

-- Sales records
CREATE TABLE public.sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  location TEXT NOT NULL,
  status public.record_status NOT NULL DEFAULT 'follow_up',
  follow_up_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sales_created_by ON public.sales_records(created_by);
CREATE INDEX idx_sales_created_at ON public.sales_records(created_at);

-- Vendor records
CREATE TABLE public.vendor_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  vendor_name TEXT NOT NULL,
  product_categories TEXT[] NOT NULL DEFAULT '{}',
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  location TEXT NOT NULL,
  moq TEXT,
  price_range TEXT,
  supply_capacity TEXT,
  delivery_capacity TEXT,
  status public.record_status NOT NULL DEFAULT 'follow_up',
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_vendor_created_by ON public.vendor_records(created_by);
CREATE INDEX idx_vendor_created_at ON public.vendor_records(created_at);

-- Validation: follow_up_date required when status = follow_up
CREATE OR REPLACE FUNCTION public.validate_follow_up_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'follow_up' AND NEW.follow_up_date IS NULL THEN
    RAISE EXCEPTION 'follow_up_date is required when status is follow_up';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_validate BEFORE INSERT OR UPDATE ON public.sales_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_follow_up_date();
CREATE TRIGGER vendor_validate BEFORE INSERT OR UPDATE ON public.vendor_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_follow_up_date();

-- Auto-create profile + bootstrap first user as admin on both teams
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.user_teams (user_id, team) VALUES (NEW.id, 'sales'), (NEW.id, 'purchase');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
    INSERT INTO public.user_teams (user_id, team) VALUES (NEW.id, 'sales');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================== RLS POLICIES ==================

-- profiles: user reads own; admin reads all; everyone reads minimal team display info
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "admin profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- user_roles: user sees own; admin manages all
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin roles all" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_teams: user sees own; admin manages all
CREATE POLICY "own teams select" ON public.user_teams FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin teams all" ON public.user_teams FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- sales_records
CREATE POLICY "sales own select" ON public.sales_records FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "sales own insert" ON public.sales_records FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "sales own update" ON public.sales_records FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- vendor_records
CREATE POLICY "vendor own select" ON public.vendor_records FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "vendor own insert" ON public.vendor_records FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "vendor own update" ON public.vendor_records FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
