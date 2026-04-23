-- =====================================================
-- DUKAANMANAGER - Supabase Schema
-- Supabase > SQL Editor mein yeh pura paste karke RUN karein
-- =====================================================

-- 1. SHOPS TABLE (naya banana hai)
create table if not exists public.shops (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  biz_type text default 'kirana',
  biz_emoji text default '🏪',
  biz_label text default 'Kirana Store',
  owner_name text,
  phone text,
  city text,
  categories jsonb default '["General"]'::jsonb,
  pay_modes jsonb default '{"cash":true,"upi":true,"bank":false}'::jsonb,
  cust_types jsonb default '{"retail":true,"wholesale":false}'::jsonb,
  created_at timestamptz default now()
);

-- 2. CUSTOMERS TABLE (reset & recreate)
drop table if exists public.transactions cascade;
drop table if exists public.invoice_items cascade;
drop table if exists public.invoices cascade;
drop table if exists public.purchase_items cascade;
drop table if exists public.purchases cascade;
drop table if exists public.customers cascade;
drop table if exists public.products cascade;
drop table if exists public.suppliers cascade;

create table public.customers (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  type text default 'retail',
  balance numeric default 0,
  wa_optin boolean default true,
  created_at timestamptz default now()
);

-- 3. PRODUCTS TABLE
create table public.products (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  name text not null,
  category text default 'General',
  retail_price numeric not null default 0,
  wholesale_price numeric default 0,
  stock integer default 0,
  unit text default 'pcs',
  min_stock integer default 5,
  is_service boolean default false,
  created_at timestamptz default now()
);

-- 4. SUPPLIERS TABLE
create table public.suppliers (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  items_supplied text,
  created_at timestamptz default now()
);

-- 5. INVOICES (BILLS) TABLE
create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  customer_id uuid references public.customers(id),
  customer_name text default 'Walk-in',
  total numeric not null default 0,
  pay_mode text default 'cash',
  bill_date date default current_date,
  wa_sent boolean default false,
  created_at timestamptz default now()
);

-- 6. INVOICE ITEMS
create table public.invoice_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity numeric not null default 1,
  price numeric not null default 0,
  total numeric not null default 0
);

-- 7. TRANSACTIONS (KHATA)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id),
  amount numeric not null,
  type text not null default 'credit',
  mode text default 'udhar',
  note text,
  tx_date date default current_date,
  created_at timestamptz default now()
);

-- 8. PURCHASES (STOCK KHAREEDNA)
create table public.purchases (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  supplier_id uuid references public.suppliers(id),
  supplier_name text,
  total numeric default 0,
  purchase_date date default current_date,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 9. PURCHASE ITEMS
create table public.purchase_items (
  id uuid default gen_random_uuid() primary key,
  purchase_id uuid references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity numeric not null default 1,
  price numeric default 0
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Data Security
-- =====================================================
alter table public.shops enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.transactions enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

-- Shops: owner hi dekh sakta hai apni dukaan
create policy "Users can manage own shop" on public.shops
  for all using (auth.uid() = owner_id);

-- Customers: shop owner hi dekhe
create policy "Shop owner can manage customers" on public.customers
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Products
create policy "Shop owner can manage products" on public.products
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Suppliers
create policy "Shop owner can manage suppliers" on public.suppliers
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Invoices
create policy "Shop owner can manage invoices" on public.invoices
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Invoice Items
create policy "Shop owner can manage invoice items" on public.invoice_items
  for all using (
    invoice_id in (
      select id from public.invoices where shop_id in (
        select id from public.shops where owner_id = auth.uid()
      )
    )
  );

-- Transactions
create policy "Shop owner can manage transactions" on public.transactions
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Purchases
create policy "Shop owner can manage purchases" on public.purchases
  for all using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Purchase Items
create policy "Shop owner can manage purchase items" on public.purchase_items
  for all using (
    purchase_id in (
      select id from public.purchases where shop_id in (
        select id from public.shops where owner_id = auth.uid()
      )
    )
  );

-- =====================================================
-- SUCCESS! Ab app kholein aur dukaan register karein.
-- =====================================================
