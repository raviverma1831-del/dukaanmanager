-- Phase 3: Premium Features - Database Tables

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  promo_price DECIMAL(10, 2) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, product_id, start_date)
);

-- Recovery logs for AI Debt Recovery
CREATE TABLE IF NOT EXISTS recovery_logs (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  call_type VARCHAR(50) NOT NULL CHECK (call_type IN ('ai_initiated', 'scheduled', 'payment_received', 'callback_required')),
  status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN ('initiated', 'scheduled', 'in_progress', 'completed', 'resolved', 'failed')),
  message TEXT,
  call_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B2B Network Requests
CREATE TABLE IF NOT EXISTS b2b_requests (
  id BIGSERIAL PRIMARY KEY,
  from_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  to_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'delivered', 'cancelled')),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_date TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Messages tracking
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  recipients INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'scheduled')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Voice Reminders for WhatsApp Bot
CREATE TABLE IF NOT EXISTS voice_reminders (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  reminder_type VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'on_purchase', 'custom')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security (RLS) Policies for all Phase 3 tables

-- Promotions RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owners can see only their promotions" ON promotions
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "Shop owners can insert promotions" ON promotions
  FOR INSERT WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "Shop owners can update their promotions" ON promotions
  FOR UPDATE USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Recovery Logs RLS
ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owners can see their recovery logs" ON recovery_logs
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "Shop owners can insert recovery logs" ON recovery_logs
  FOR INSERT WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- B2B Requests RLS
ALTER TABLE b2b_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owners can see their b2b requests" ON b2b_requests
  FOR SELECT USING (
    from_shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    OR to_shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );
CREATE POLICY "Shop owners can create b2b requests" ON b2b_requests
  FOR INSERT WITH CHECK (from_shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- WhatsApp Messages RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owners can see their whatsapp messages" ON whatsapp_messages
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "Shop owners can insert whatsapp messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Voice Reminders RLS
ALTER TABLE voice_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owners can see their voice reminders" ON voice_reminders
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "Shop owners can insert voice reminders" ON voice_reminders
  FOR INSERT WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_promotions_shop_id ON promotions(shop_id);
CREATE INDEX IF NOT EXISTS idx_promotions_product_id ON promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_shop_id ON recovery_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_customer_id ON recovery_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_requests_from_shop ON b2b_requests(from_shop_id);
CREATE INDEX IF NOT EXISTS idx_b2b_requests_to_shop ON b2b_requests(to_shop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_shop_id ON whatsapp_messages(shop_id);
CREATE INDEX IF NOT EXISTS idx_voice_reminders_shop_id ON voice_reminders(shop_id);
CREATE INDEX IF NOT EXISTS idx_voice_reminders_customer_id ON voice_reminders(customer_id);
