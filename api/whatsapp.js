// api/whatsapp.js
// DukaanManager WhatsApp Bot - Twilio + Claude AI

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { Body, From, To } = req.body
    const userMessage = (Body || '').trim()
    const userPhone = From // whatsapp:+91xxxxxxxxxx

    if (!userMessage) {
      return res.status(200).send('<Response></Response>')
    }

    // ── Claude AI se intelligent response lo ──────────────────
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: `Tu DukaanManager ka WhatsApp AI bot hai.
Dukaandaar Hindi/Hinglish mein baat karta hai.
Short aur helpful replies do.
Samajhne wali cheezein:
- Bill banana: "Harish ko 2kg sugar ka bill bana do"
- Balance check: "Sunita ka balance batao"  
- Stock check: "Sugar ka stock kitna hai"
- Aaj ki kamai: "Aaj ki summary batao"
- Promo: "Kal sale hai sabko msg karo"
- Order: "Sharma ji ko order bhej do"

Agar kuch samajh na aaye to politely poochho.
Reply mein emoji use karo. Max 3-4 lines.`,
        messages: [{ role: 'user', content: userMessage }]
      })
    })

    const aiData = await aiRes.json()
    const replyText = aiData.content?.[0]?.text ||
      'Maafi chahta hoon, samajh nahi aaya. Dobara try karein 🙏'

    // ── Twilio WhatsApp reply bhejo ───────────────────────────
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_WA_NUMBER

    const twilioUrl =
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization':
          'Basic ' +
          Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: userPhone,
        Body: replyText
      })
    })

    const twilioData = await twilioRes.json()

    if (!twilioRes.ok) {
      console.error('Twilio error:', twilioData)
    }

    // Twilio ko TwiML response chahiye
    res.setHeader('Content-Type', 'text/xml')
    res.status(200).send('<Response></Response>')

  } catch (err) {
    console.error('Webhook error:', err)
    res.setHeader('Content-Type', 'text/xml')
    res.status(200).send('<Response></Response>')
  }
}