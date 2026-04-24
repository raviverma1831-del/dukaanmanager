-- COMPLETE DATABASE SETUP FOR DUKAANMANAGER
-- This script creates all necessary tables for Phase 1, 2, and 3

-- ============================================
-- PHASE 1: CORE TABLES (Already exist)
-- ============================================
-- shops, customers, products, suppliers, invoices, invoice_items, transactions, purchases, purchase_items

-- ============================================
-- PHASE 2: EXPENSE MANAGEMENT & GST
-- ============================================

-- 1. Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📊',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, name)
);

-- 2. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  expense_date DATE DEFAULT CURRENT_DATE NOT NULL,
  note TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. GST fields for shops
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gst_type TEXT DEFAULT 'unregistered';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gst_scheme TEXT DEFAULT 'regular';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address TEXT;

-- 4. GST fields for products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_type TEXT DEFAULT 'taxable';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_includes_gst BOOLEAN DEFAULT false;

-- 5. GST fields for invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0;

-- 6. GST fields for invoice items
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS hsn_code TEXT;

-- 7. GST fields for purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS note TEXT;

-- 8. GST fields for purchase items
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS hsn_code TEXT;

-- ============================================
-- PHASE 3: PREMIUM FEATURES TABLES
-- ============================================

-- 1. Promotions Table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  promo_price NUMERIC NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, product_id)
);

-- 2. AI Debt Recovery Logs
CREATE TABLE IF NOT EXISTS public.recovery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  amount NUMERIC NOT NULL,
  call_type VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN ('initiated', 'scheduled', 'in_progress', 'completed', 'resolved', 'failed')),
  message TEXT,
  call_date TIMESTAMPTZ NOT NULL,
  attempt_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. B2B Network Requests
CREATE TABLE IF NOT EXISTS public.b2b_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  to_shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'delivered', 'cancelled')),
  request_date TIMESTAMPTZ DEFAULT now(),
  accepted_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. WhatsApp Messages Log
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  recipient_phones TEXT[] NOT NULL,
  recipients_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'scheduled')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Voice Reminders & Automation
CREATE TABLE IF NOT EXISTS public.voice_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  reminder_type VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'on_purchase', 'custom')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  message TEXT NOT NULL,
  call_duration INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. WhatsApp Bot Commands & Configuration
CREATE TABLE IF NOT EXISTS public.whatsapp_commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  command_name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  command_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, command_name)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_commands ENABLE ROW LEVEL SECURITY;

-- Expense Categories Policies
CREATE POLICY "expense_categories_shop_access" ON public.expense_categories
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Expenses Policies
CREATE POLICY "expenses_shop_access" ON public.expenses
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Promotions Policies
CREATE POLICY "promotions_shop_access" ON public.promotions
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Recovery Logs Policies
CREATE POLICY "recovery_logs_shop_access" ON public.recovery_logs
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- B2B Requests Policies
CREATE POLICY "b2b_requests_shop_access" ON public.b2b_requests
  FOR ALL USING (
    from_shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR to_shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

-- WhatsApp Messages Policies
CREATE POLICY "whatsapp_messages_shop_access" ON public.whatsapp_messages
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Voice Reminders Policies
CREATE POLICY "voice_reminders_shop_access" ON public.voice_reminders
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- WhatsApp Commands Policies
CREATE POLICY "whatsapp_commands_shop_access" ON public.whatsapp_commands
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_expense_categories_shop ON public.expense_categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON public.expenses(shop_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_promotions_shop ON public.promotions(shop_id);
CREATE INDEX IF NOT EXISTS idx_promotions_product ON public.promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_shop ON public.recovery_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_customer ON public.recovery_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_status ON public.recovery_logs(status);
CREATE INDEX IF NOT EXISTS idx_b2b_requests_from_shop ON public.b2b_requests(from_shop_id);
CREATE INDEX IF NOT EXISTS idx_b2b_requests_to_shop ON public.b2b_requests(to_shop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_shop ON public.whatsapp_messages(shop_id);
CREATE INDEX IF NOT EXISTS idx_voice_reminders_shop ON public.voice_reminders(shop_id);
CREATE INDEX IF NOT EXISTS idx_voice_reminders_customer ON public.voice_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_commands_shop ON public.whatsapp_commands(shop_id);

-- ============================================
-- DATABASE SETUP COMPLETE
-- ============================================
