-- =====================================================
-- DUKAANMANAGER v2 — Additional Schema
-- Supabase > SQL Editor mein yeh pura paste karke RUN karein
-- IMPORTANT: Ye naya schema hai, purana schema v1 se alag hai
-- Pehle supabase_schema.sql run karo, phir ye
-- =====================================================

-- ================================================
-- BUG FIX: purchases table mein note column missing tha
-- ================================================
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS pay_mode text DEFAULT 'cash';

-- ================================================
-- INVOICES TABLE mein extra columns (agar pehle nahi hain)
-- ================================================
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cgst numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sgst numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS igst numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_gst numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'B2C';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_gstin text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_interstate boolean DEFAULT false;

-- INVOICE ITEMS extra columns
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS hsn_code text;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS gst_rate numeric DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS taxable_amount numeric DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS igst_amount numeric DEFAULT 0;

-- PRODUCTS extra columns for GST
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_rate numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hsn_code text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_includes_gst boolean DEFAULT false;

-- SHOPS extra columns
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gst_type text DEFAULT 'unregistered';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gst_scheme text DEFAULT 'regular';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS fy_start date DEFAULT '2024-04-01';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS fy_end date DEFAULT '2025-03-31';

-- ================================================
-- 1. FIXED ASSETS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'Equipment',
  purchase_date date DEFAULT current_date,
  cost numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  depreciation_rate numeric DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop owner fixed_assets" ON public.fixed_assets;
CREATE POLICY "shop owner fixed_assets" ON public.fixed_assets
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ================================================
-- 2. CAPITAL ACCOUNTS TABLE
-- Malik ka paisa, secured/unsecured loans
-- ================================================
CREATE TABLE IF NOT EXISTS public.capital_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  account_type text NOT NULL, -- 'capital', 'secured_loan', 'unsecured_loan'
  name text NOT NULL,
  amount numeric DEFAULT 0,
  date date DEFAULT current_date,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.capital_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop owner capital" ON public.capital_accounts;
CREATE POLICY "shop owner capital" ON public.capital_accounts
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ================================================
-- 3. VOUCHERS TABLE (Receipt, Payment, Contra, Journal)
-- ================================================
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  voucher_type text NOT NULL, -- 'receipt', 'payment', 'contra', 'journal'
  voucher_no text,
  voucher_date date DEFAULT current_date,
  narration text,
  party_name text,           -- customer/supplier name
  total_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop owner vouchers" ON public.vouchers;
CREATE POLICY "shop owner vouchers" ON public.vouchers
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ================================================
-- 4. VOUCHER ENTRIES (Dr/Cr lines — double entry)
-- ================================================
CREATE TABLE IF NOT EXISTS public.voucher_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE CASCADE,
  ledger_name text NOT NULL,
  ledger_type text DEFAULT 'other', -- 'cash', 'bank', 'debtor', 'creditor', 'other'
  dr_amount numeric DEFAULT 0,
  cr_amount numeric DEFAULT 0
);

ALTER TABLE public.voucher_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop owner voucher_entries" ON public.voucher_entries;
CREATE POLICY "shop owner voucher_entries" ON public.voucher_entries
  FOR ALL USING (
    voucher_id IN (
      SELECT id FROM public.vouchers
      WHERE shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
  );

-- ================================================
-- 5. FINANCIAL YEARS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.financial_years (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  fy_label text NOT NULL,       -- '2024-25'
  start_date date NOT NULL,     -- '2024-04-01'
  end_date date NOT NULL,       -- '2025-03-31'
  is_active boolean DEFAULT true,
  opening_cash numeric DEFAULT 0,
  opening_bank numeric DEFAULT 0,
  opening_debtors numeric DEFAULT 0,
  opening_creditors numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop owner fy" ON public.financial_years;
CREATE POLICY "shop owner fy" ON public.financial_years
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ================================================
-- SUCCESS! Ab app open karein aur naye features use karein.
-- ================================================
