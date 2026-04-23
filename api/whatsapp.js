// api/whatsapp.js - Auto Fallback: Claude → Gemini
import { createClient } from '@supabase/supabase-js'

// ── AI Call with Auto Fallback ────────────────────────────────
async function callAI(systemPrompt, userMessage) {
  // 1. Pehle Claude try karo
  try {
    const claudeKey = process.env.ANTHROPIC_KEY
    if (claudeKey && claudeKey.startsWith('sk-ant')) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      })
      const data = await res.json()
      if (data?.content?.[0]?.text) {
        console.log('✅ Claude replied')
        return data.content[0].text
      }
      console.log('Claude failed:', JSON.stringify(data?.error))
    }
  } catch (e) {
    console.log('Claude error:', e.message)
  }

  // 2. Gemini pe switch karo
  try {
    const geminiKey = process.env.GEMINI_KEY
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nUser: ${userMessage}`
              }]
            }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
          })
        }
      )
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        console.log('✅ Gemini replied')
        return text
      }
      console.log('Gemini failed:', JSON.stringify(data?.error))
    }
  } catch (e) {
    console.log('Gemini error:', e.message)
  }

  return 'Maafi chahta hoon, AI service abhi available nahi hai. Thodi der baad try karein 🙏'
}

// ── Main Webhook Handler ──────────────────────────────────────
export default async function handler(req, res) {
  // Browser test
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: '✅ DukaanManager WhatsApp Bot Running!',
      claude: !!process.env.ANTHROPIC_KEY,
      gemini: !!process.env.GEMINI_KEY,
      twilio: !!process.env.TWILIO_AUTH_TOKEN
    })
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
    let shopContext = 'Shop data abhi load nahi hua.'
    try {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )

      const { data: shops } = await supabase
        .from('shops').select('*').limit(1)

      if (shops && shops.length > 0) {
        const shop = shops[0]

        const [{ data: products }, { data: customers }, { data: sales }] = await Promise.all([
          supabase.from('products')
            .select('name,retail_price,stock,unit,min_stock,is_service')
            .eq('shop_id', shop.id).order('name'),
          supabase.from('customers')
            .select('name,phone,balance,type')
            .eq('shop_id', shop.id).order('name'),
          supabase.from('invoices')
            .select('total,pay_mode')
            .eq('shop_id', shop.id)
            .eq('bill_date', new Date().toISOString().slice(0, 10))
        ])

        const cash  = sales?.filter(s => s.pay_mode === 'cash').reduce((s,i) => s+i.total, 0) || 0
        const upi   = sales?.filter(s => ['upi','bank'].includes(s.pay_mode)).reduce((s,i) => s+i.total, 0) || 0
        const udhar = sales?.filter(s => s.pay_mode === 'udhar').reduce((s,i) => s+i.total, 0) || 0
        const lowStock = products?.filter(p => !p.is_service && p.stock <= p.min_stock).map(p => p.name) || []

        shopContext = `
DUKAAN: ${shop.name} | Type: ${shop.biz_label} | Owner: ${shop.owner_name} | City: ${shop.city}

AAJ KI SALE (${new Date().toISOString().slice(0,10)}):
💵 Cash: ₹${cash} | 📱 UPI: ₹${upi} | 📒 Udhar: ₹${udhar} | 💰 Total: ₹${cash+upi+udhar} | Bills: ${sales?.length||0}

PRODUCTS (${products?.length||0}):
${products?.slice(0,15).map(p => `• ${p.name} — ₹${p.retail_price} | Stock: ${p.is_service?'Service':p.stock+' '+p.unit}`).join('\n') || 'Koi product nahi'}

⚠️ LOW STOCK: ${lowStock.length > 0 ? lowStock.join(', ') : 'Sab theek hai'}

CUSTOMERS (${customers?.length||0}):
${customers?.slice(0,10).map(c => `• ${c.name} (${c.phone||'no phone'}) — Baaki: ₹${c.balance||0} [${c.type}]`).join('\n') || 'Koi customer nahi'}
        `.trim()
      }
    } catch (dbErr) {
      console.error('DB Error:', dbErr.message)
    }

    // ── System Prompt ─────────────────────────────────
    const systemPrompt = `Tu DukaanManager ka WhatsApp AI assistant hai.
Hindi aur Hinglish mein baat kar. Short aur helpful replies do (max 4-5 lines). Emoji zaroor use kar.

${shopContext}

Important rules:
- Sirf upar ke data ke basis pe jawab do
- Numbers clearly batao ₹ sign ke saath  
- Agar koi cheez data mein nahi hai to politely batao
- Bill banane ya stock update ke liye app kholne ko kaho: dukaanmanager.vercel.app`

    // ── AI Call (Claude → Gemini fallback) ───────────
    const replyText = await callAI(systemPrompt, userMessage)

    // ── Twilio se WhatsApp reply ──────────────────────
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_WA_NUMBER,
          To: From,
          Body: replyText.slice(0, 1000) // Max 1000 chars
        })
      }
    )

    if (!twilioRes.ok) {
      const td = await twilioRes.json()
      console.error('Twilio error:', JSON.stringify(td))
    }

    res.setHeader('Content-Type', 'text/xml')
    res.status(200).send('<Response></Response>')

  } catch (err) {
    console.error('Webhook error:', err.message)
    res.setHeader('Content-Type', 'text/xml')
    res.status(200).send('<Response></Response>')
  }
}
