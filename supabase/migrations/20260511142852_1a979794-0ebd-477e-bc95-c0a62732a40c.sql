
-- Updated handle_new_user: never auto-grant role/team; record an access request instead
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_team public.team_kind;
  req_exec BOOLEAN;
  meta JSONB;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  INSERT INTO public.profiles (id, full_name, email, is_active)
  VALUES (NEW.id, COALESCE(meta->>'full_name', ''), NEW.email, false)
  ON CONFLICT (id) DO NOTHING;

  -- Only create an access request if signup metadata included a team
  IF meta ? 'requested_team' THEN
    BEGIN
      req_team := (meta->>'requested_team')::public.team_kind;
    EXCEPTION WHEN others THEN
      req_team := 'sales';
    END;
    req_exec := COALESCE((meta->>'requested_executive')::boolean, false);

    INSERT INTO public.access_requests (user_id, full_name, email, requested_team, requested_executive)
    VALUES (NEW.id, COALESCE(meta->>'full_name',''), NEW.email, req_team, req_exec)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Sales records: extend to executive_sales
DROP POLICY IF EXISTS "sales own select" ON public.sales_records;
CREATE POLICY "sales own select" ON public.sales_records
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'executive_sales')
  );

DROP POLICY IF EXISTS "sales own update" ON public.sales_records;
CREATE POLICY "sales own update" ON public.sales_records
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'executive_sales')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'executive_sales')
  );

-- Vendor records: extend to executive_purchase
DROP POLICY IF EXISTS "vendor own select" ON public.vendor_records;
CREATE POLICY "vendor own select" ON public.vendor_records
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'executive_purchase')
  );

DROP POLICY IF EXISTS "vendor own update" ON public.vendor_records;
CREATE POLICY "vendor own update" ON public.vendor_records
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'executive_purchase')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'executive_purchase')
  );

-- Allow exec to read profiles (so they can list their team)
DROP POLICY IF EXISTS "exec profiles select" ON public.profiles;
CREATE POLICY "exec profiles select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'executive_sales')
    OR public.has_role(auth.uid(), 'executive_purchase')
  );

-- Allow exec to manage user_teams scoped to their team
DROP POLICY IF EXISTS "exec sales teams" ON public.user_teams;
CREATE POLICY "exec sales teams" ON public.user_teams
  FOR ALL TO authenticated
  USING (team = 'sales' AND public.has_role(auth.uid(), 'executive_sales'))
  WITH CHECK (team = 'sales' AND public.has_role(auth.uid(), 'executive_sales'));

DROP POLICY IF EXISTS "exec purchase teams" ON public.user_teams;
CREATE POLICY "exec purchase teams" ON public.user_teams
  FOR ALL TO authenticated
  USING (team = 'purchase' AND public.has_role(auth.uid(), 'executive_purchase'))
  WITH CHECK (team = 'purchase' AND public.has_role(auth.uid(), 'executive_purchase'));

-- Allow exec to read user_roles to find members
DROP POLICY IF EXISTS "exec roles select" ON public.user_roles;
CREATE POLICY "exec roles select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'executive_sales')
    OR public.has_role(auth.uid(), 'executive_purchase')
  );
