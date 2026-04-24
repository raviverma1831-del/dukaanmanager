-- =====================================================
-- PHASE 2: EXPENSE MANAGEMENT & FINANCIAL REPORTS
-- Add Expenses & GST tracking tables
-- =====================================================

-- 1. EXPENSE CATEGORIES TABLE
create table if not exists public.expense_categories (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  name text not null,
  icon text default '📊',
  created_at timestamptz default now(),
  unique(shop_id, name)
);

-- 2. EXPENSES TABLE
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  category text not null,
  amount numeric not null,
  payment_mode text default 'cash',
  expense_date date default current_date not null,
  note text,
  invoice_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add GST-related fields to shops table if not exist
alter table public.shops 
add column if not exists gst_number text,
add column if not exists gst_type text default 'unregistered',
add column if not exists gst_scheme text default 'regular',
add column if not exists address text;

-- Add GST fields to products table if not exist
alter table public.products 
add column if not exists hsn_code text,
add column if not exists gst_rate numeric default 0,
add column if not exists gst_type text default 'taxable',
add column if not exists price_includes_gst boolean default false;

-- Add GST fields to invoices if not exist
alter table public.invoices 
add column if not exists gst_amount numeric default 0,
add column if not exists taxable_amount numeric default 0,
add column if not exists igst_amount numeric default 0,
add column if not exists cgst_amount numeric default 0,
add column if not exists sgst_amount numeric default 0;

-- Add GST fields to invoice_items if not exist
alter table public.invoice_items 
add column if not exists gst_rate numeric default 0,
add column if not exists gst_amount numeric default 0,
add column if not exists hsn_code text;

-- Add fields to purchases for GST tracking
alter table public.purchases 
add column if not exists gst_amount numeric default 0,
add column if not exists note text;

alter table public.purchase_items 
add column if not exists gst_rate numeric default 0,
add column if not exists gst_amount numeric default 0,
add column if not exists hsn_code text;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) for new tables
-- =====================================================

-- Enable RLS on new tables
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

-- Expense Categories: shop owner can manage
create policy if not exists "Shop owner can manage expense categories" on public.expense_categories
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Expenses: shop owner can manage
create policy if not exists "Shop owner can manage expenses" on public.expenses
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- =====================================================
-- DEFAULT EXPENSE CATEGORIES (seed for new shops)
-- Note: This will be handled in the app when a shop is created
-- =====================================================

-- =====================================================
-- INDEXES for better performance
-- =====================================================
create index if not exists idx_expenses_shop_date on public.expenses(shop_id, expense_date);
create index if not exists idx_expenses_category on public.expenses(shop_id, category);
create index if not exists idx_invoices_shop_date on public.invoices(shop_id, bill_date);
create index if not exists idx_purchases_shop_date on public.purchases(shop_id, purchase_date);
create index if not exists idx_products_shop on public.products(shop_id);

-- =====================================================
-- SUCCESS! Expenses tables ready
-- =====================================================
