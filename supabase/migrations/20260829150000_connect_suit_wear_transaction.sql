-- ============================================================
-- AVELIXA: CONNECT SUIT & WEAR TRANSACTION
--
-- Establishes the existing Suit & Wear portfolio item as a real
-- business/lead/project transaction for the existing connector.
-- No client Auth account is created: client_id remains nullable.
-- ============================================================

-- The original commission trigger assumed payment_id had a unique
-- constraint that was not present in the live schema. Keep a unique
-- index for future duplicate protection; the trigger itself is also
-- idempotent without relying on ON CONFLICT.
CREATE UNIQUE INDEX IF NOT EXISTS commissions_payment_id_uidx
  ON public.commissions(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_connector_commission_for_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_project_id uuid;
  v_connector_id uuid;
  v_rate numeric(10,2);
  v_commission_id uuid;
BEGIN
  IF NEW.status NOT IN ('paid','verified','completed') OR NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT i.project_id
  INTO v_project_id
  FROM public.invoices i
  WHERE i.id = NEW.invoice_id;

  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.connector_id
  INTO v_connector_id
  FROM public.projects p
  WHERE p.id = v_project_id;

  IF v_connector_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cp.commission_rate
  INTO v_rate
  FROM public.connector_profiles cp
  WHERE cp.user_id = v_connector_id
    AND cp.is_active = true
  LIMIT 1;

  IF v_rate IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO v_commission_id
  FROM public.commissions
  WHERE payment_id = NEW.id
  LIMIT 1;

  IF v_commission_id IS NULL THEN
    INSERT INTO public.commissions (
      connector_id,
      project_id,
      payment_id,
      eligible_amount,
      commission_percentage,
      amount,
      status,
      payment_method,
      payment_reference,
      verification_message,
      created_at,
      updated_at
    )
    VALUES (
      v_connector_id,
      v_project_id,
      NEW.id,
      NEW.amount,
      v_rate,
      round(NEW.amount * v_rate / 100.0, 2),
      'pending',
      NEW.payment_method,
      NEW.reference_number,
      NEW.verification_message,
      now(),
      now()
    );
  ELSE
    UPDATE public.commissions
    SET connector_id = v_connector_id,
        project_id = v_project_id,
        eligible_amount = NEW.amount,
        commission_percentage = v_rate,
        amount = round(NEW.amount * v_rate / 100.0, 2),
        payment_method = NEW.payment_method,
        payment_reference = NEW.reference_number,
        verification_message = NEW.verification_message,
        updated_at = now()
    WHERE id = v_commission_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------
-- Suit & Wear business
-- ------------------------------------------------------------
DO $migration$
DECLARE
  v_connector uuid := '45ab9ac2-10ee-452b-87f6-2f1caa38adf4';
  v_business uuid;
  v_project uuid;
  v_invoice uuid;
  v_payment uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_connector
      AND role = 'connector'
  ) THEN
    RAISE EXCEPTION 'Expected Suit & Wear connector role is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.connector_profiles
    WHERE user_id = v_connector
      AND is_active = true
      AND commission_rate = 20.00
  ) THEN
    RAISE EXCEPTION 'Expected active 20%% connector profile is missing';
  END IF;

  SELECT id
  INTO v_business
  FROM public.businesses
  WHERE lower(name) = lower('Suit & Wear')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_business IS NULL THEN
    INSERT INTO public.businesses (name, industry)
    VALUES ('Suit & Wear', 'Fashion')
    RETURNING id INTO v_business;
  ELSE
    UPDATE public.businesses
    SET industry = COALESCE(industry, 'Fashion'),
        updated_at = now()
    WHERE id = v_business;
  END IF;

  SELECT id
  INTO v_project
  FROM public.projects
  WHERE lower(title) = lower('Suit & Wear')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_project IS NULL THEN
    INSERT INTO public.projects (
      client_id,
      operator_id,
      connector_id,
      title,
      description,
      status,
      price,
      business_id,
      operator_payment,
      progress,
      priority,
      operator_payment_status,
      operator_paid_at,
      operator_payment_verification
    )
    VALUES (
      NULL,
      NULL,
      v_connector,
      'Suit & Wear',
      'An elegant e-commerce storefront for a menswear brand — tailored product pages, smooth checkout, and a sophisticated visual identity.',
      'completed',
      20000,
      v_business,
      1500,
      100,
      'medium',
      'paid',
      now(),
      'Recorded as paid for the completed project transaction.'
    )
    RETURNING id INTO v_project;
  ELSE
    UPDATE public.projects
    SET connector_id = v_connector,
        business_id = v_business,
        price = 20000,
        status = 'completed',
        progress = 100,
        operator_payment = 1500,
        operator_payment_status = 'paid',
        operator_paid_at = COALESCE(operator_paid_at, now()),
        operator_payment_verification = COALESCE(
          operator_payment_verification,
          'Recorded as paid for the completed project transaction.'
        ),
        updated_at = now()
    WHERE id = v_project;
  END IF;

  -- Link the existing public portfolio representation to the real project.
  UPDATE public.portfolio_items
  SET project_id = v_project,
      updated_at = now()
  WHERE lower(title) = lower('Suit & Wear');

  -- A won lead is the connector's originating opportunity. The existing
  -- schema relates it to the project through the shared business_id.
  IF NOT EXISTS (
    SELECT 1
    FROM public.leads
    WHERE business_id = v_business
      AND connector_id = v_connector
  ) THEN
    INSERT INTO public.leads (
      business_id,
      connector_id,
      title,
      requirements,
      estimated_budget,
      status
    )
    VALUES (
      v_business,
      v_connector,
      'Lead from Suit & Wear',
      'Existing completed Suit & Wear project; connector relationship established for commission tracking.',
      20000,
      'won'
    );
  ELSE
    UPDATE public.leads
    SET status = 'won',
        estimated_budget = 20000,
        updated_at = now()
    WHERE business_id = v_business
      AND connector_id = v_connector;
  END IF;

  -- The data model permits a business/project to exist without an Auth client.
  SELECT id
  INTO v_invoice
  FROM public.invoices
  WHERE project_id = v_project
    AND amount = 20000
    AND status <> 'cancelled'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_invoice IS NULL THEN
    INSERT INTO public.invoices (
      project_id,
      client_id,
      amount,
      status,
      due_date
    )
    VALUES (
      v_project,
      NULL,
      20000,
      'paid',
      NULL
    )
    RETURNING id INTO v_invoice;
  ELSE
    UPDATE public.invoices
    SET client_id = NULL,
        amount = 20000,
        status = 'paid',
        due_date = NULL,
        updated_at = now()
    WHERE id = v_invoice;
  END IF;

  -- Payment status is 'completed' in the live payments check constraint.
  -- The payment trigger creates the connector commission automatically.
  SELECT id
  INTO v_payment
  FROM public.payments
  WHERE invoice_id = v_invoice
    AND lower(COALESCE(status, '')) = 'completed'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_payment IS NULL THEN
    INSERT INTO public.payments (
      invoice_id,
      amount,
      status,
      payment_date
    )
    VALUES (
      v_invoice,
      20000,
      'completed',
      now()
    )
    RETURNING id INTO v_payment;
  ELSE
    UPDATE public.payments
    SET amount = 20000,
        status = 'completed',
        payment_date = COALESCE(payment_date, now())
    WHERE id = v_payment;
  END IF;

  -- Explicitly reconcile the commission for idempotency when this migration
  -- is replayed against an already-connected transaction.
  IF NOT EXISTS (
    SELECT 1 FROM public.commissions WHERE payment_id = v_payment
  ) THEN
    INSERT INTO public.commissions (
      connector_id,
      project_id,
      payment_id,
      eligible_amount,
      commission_percentage,
      amount,
      status,
      verification_message
    )
    VALUES (
      v_connector,
      v_project,
      v_payment,
      20000,
      20.00,
      4000,
      'pending',
      'Commission created from the completed KSh 20,000 Suit & Wear payment.'
    );
  ELSE
    UPDATE public.commissions
    SET connector_id = v_connector,
        project_id = v_project,
        eligible_amount = 20000,
        commission_percentage = 20.00,
        amount = 4000,
        updated_at = now()
    WHERE payment_id = v_payment;
  END IF;
END
$migration$;
