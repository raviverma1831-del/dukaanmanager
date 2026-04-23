// api/whatsapp.js - Fixed Version v2
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'WhatsApp webhook is running!' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { Body, From } = req.body
    const userMessage = (Body || '').trim()
    if (!userMessage) {
      res.setHeader('Content-Type', 'text/xml')
      return res.status(200).send('<Response></Response>')
    }

    // ── Supabase se shop data lo ──────────────────────
    let shopContext = 'Shop data load nahi hua.'
    try {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      )
      const { data: shops } = await supabase.from('shops').select('*').limit(1)
      if (shops && shops.length > 0) {
        const shop = shops[0]
        const { data: products } = await supabase.from('products')
          .select('name,retail_price,stock,unit,min_stock,is_service')
          .eq('shop_id', shop.id).order('name')
        const { data: customers } = await supabase.from('customers')
          .select('name,phone,balance,type').eq('shop_id', shop.id).order('name')
        const today = new Date().toISOString().slice(0, 10)
        const { data: sales } = await supabase.from('invoices')
          .select('total,pay_mode').eq('shop_id', shop.id).eq('bill_date', today)
        const cash = sales?.filter(s=>s.pay_mode==='cash').reduce((s,i)=>s+i.total,0)||0
        const upi = sales?.filter(s=>['upi','bank'].includes(s.pay_mode)).reduce((s,i)=>s+i.total,0)||0
        const udhar = sales?.filter(s=>s.pay_mode==='udhar').reduce((s,i)=>s+i.total,0)||0
        const lowStock = products?.filter(p=>!p.is_service&&p.stock<=p.min_stock).map(p=>p.name)||[]
        shopContext = `SHOP: ${shop.name} (${shop.biz_label}), Owner: ${shop.owner_name}, City: ${shop.city}
AAJ KI SALE: Cash=₹${cash}, UPI=₹${upi}, Udhar=₹${udhar}, Total=₹${cash+upi+udhar}, Bills=${sales?.length||0}
PRODUCTS: ${products?.slice(0,15).map(p=>`${p.name}(₹${p.retail_price},stock:${p.is_service?'svc':p.stock+p.unit})`).join(', ')||'none'}
LOW STOCK: ${lowStock.join(', ')||'sab theek'}
CUSTOMERS: ${customers?.slice(0,10).map(c=>`${c.name}(${c.phone||'no ph'},baaki:₹${c.balance||0})`).join(', ')||'none'}`
      }
    } catch (dbErr) { console.error('DB Error:', dbErr.message) }

    // ── Claude AI ─────────────────────────────────────
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `Tu DukaanManager WhatsApp bot hai. Hindi/Hinglish mein short jawab do (max 4 lines). Emoji use kar.\n\nDUKAAN DATA:\n${shopContext}`,
        messages: [{ role: 'user', content: userMessage }]
      })
    })
    const aiData = await aiRes.json()
    console.log('AI status:', aiRes.status, 'response:', JSON.stringify(aiData).slice(0,300))

    let replyText = aiData?.content?.[0]?.text || `Error: ${JSON.stringify(aiData?.error)||'unknown'}`

    // ── Twilio reply ──────────────────────────────────
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ From: process.env.TWILIO_WA_NUMBER, To: From, Body: replyText })
    })

    res.setHeader('Content-Type', 'text/xml')
    res.status(200).send('<Response></Response>')
  } catch (err) {
    console.error('Error:', err.message)
    res.setHeader('Content-Type', 'text/xml')
    res.status(200).send('<Response></Response>')
  }
}
