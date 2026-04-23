import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function AIChat({ shop }) {
  const [msgs, setMsgs] = useState([{
    role:'bot',
    text:`Namaste! Main ${shop.name} ka AI Assistant hoon 🤖\n\nAap mujhse yeh keh sakte hain:\n• "Harish ko 2kg sugar ka bill bana do"\n• "Aaj ki kamai ki summary batao"\n• "Sugar ka stock batao"\n• "Sharma Wholesalers ko order bhej do"\n• "Sunita ka balance batao"\n• "Kal Diwali offer hai sabko promo bhejo"`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])

  const addMsg = (role, text, meta) => setMsgs(m => [...m, { role, text, meta, time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) }])

  const buildContext = async () => {
    const today = new Date().toISOString().slice(0,10)
    const { data: products } = await supabase.from('products').select('id,name,retail_price,wholesale_price,stock,unit,category,min_stock,is_service').eq('shop_id', shop.id)
    const { data: customers } = await supabase.from('customers').select('id,name,phone,type,balance').eq('shop_id', shop.id)
    const { data: suppliers } = await supabase.from('suppliers').select('id,name,phone,items_supplied').eq('shop_id', shop.id)
    const { data: todayInv } = await supabase.from('invoices').select('total,pay_mode').eq('shop_id', shop.id).eq('bill_date', today)
    const todaySales = { count: todayInv?.length||0, total: todayInv?.reduce((s,i)=>s+i.total,0)||0, cash: todayInv?.filter(i=>i.pay_mode==='cash').reduce((s,i)=>s+i.total,0)||0, bank: todayInv?.filter(i=>['upi','bank'].includes(i.pay_mode)).reduce((s,i)=>s+i.total,0)||0, udhar: todayInv?.filter(i=>i.pay_mode==='udhar').reduce((s,i)=>s+i.total,0)||0 }
    return { shop:{ name:shop.name, owner:shop.owner_name, type:shop.biz_label }, products:(products||[]).slice(0,20), customers:(customers||[]), suppliers:(suppliers||[]), todaySales, lowStock:(products||[]).filter(p=>!p.is_service&&p.stock>0&&p.stock<=p.min_stock).map(p=>p.name), outOfStock:(products||[]).filter(p=>!p.is_service&&p.stock===0).map(p=>p.name), payModes:shop.pay_modes||{cash:true,upi:true} }
  }

  const executeAction = async (action, data, ctx) => {
    const today = new Date().toISOString().slice(0,10)

    if (action === 'create_bill') {
      let customer = ctx.customers.find(c => c.name.toLowerCase().includes((data.customer_name||'').toLowerCase()))
      let isNew = false
      if (!customer && data.customer_name) {
        const { data: newC } = await supabase.from('customers').insert({ shop_id:shop.id, name:data.customer_name, phone:data.customer_phone||'', type:'retail', balance:0 }).select().single()
        customer = newC; isNew = true
        if (isNew) addMsg('bot', `✅ "${data.customer_name}" ka naya ledger create kar diya!`)
      }
      const billItems = (data.items||[]).map(item => {
        const prod = ctx.products.find(p => p.name.toLowerCase().includes((item.product_search||item.name||'').toLowerCase()))
        return prod ? { ...prod, qty: item.qty||1 } : null
      }).filter(Boolean)
      if (billItems.length===0) { addMsg('bot','❌ Product nahi mila inventory mein. Pehle product add karein.'); return }
      const total = billItems.reduce((s,i)=>s+i.retail_price*i.qty, 0)

      // WhatsApp bill text
      const billText = `🧾 *${shop.name}*\nDate: ${today}\n━━━━━━━━━━━━\n${billItems.map(i=>`• ${i.name} ×${i.qty} = ₹${i.retail_price*i.qty}`).join('\n')}\n━━━━━━━━━━━━\n💰 *Total: ₹${total}*`
      addMsg('bot', `📱 Bill taiyar!\n\n${billText}`, { tag:'wa_preview', waText:billText, phone:customer?.phone })

      if (data.payment_mode === 'ask' || !data.payment_mode) {
        setPendingPayment({ customer, billItems, total, today })
        addMsg('bot', `💳 Payment mode kya hai?\nReply karein:\n• "Cash hai"\n• "UPI / QR se diya"\n• "Udhar hai"`, { tag:'question' })
      } else {
        await finalizeBill(customer, billItems, total, data.payment_mode, today)
      }
    }

    if (action === 'balance_check') {
      const c = ctx.customers.find(c=>c.name.toLowerCase().includes((data.customer_name||'').toLowerCase()))
      if (c) addMsg('bot',`📒 *${c.name}* ka Balance:\n💰 Baaki: ₹${c.balance||0}\nType: ${c.type}\n📞 ${c.phone||'N/A'}`)
      else addMsg('bot',`❌ "${data.customer_name}" customer nahi mila.`)
    }

    if (action === 'evening_summary') {
      const s = ctx.todaySales
      addMsg('bot',`🌙 Aaj ka Hisaab (${today}):\n━━━━━━━━━━━━━━\n💵 Cash: ₹${s.cash}\n📱 Bank/UPI: ₹${s.bank}\n📒 Udhar: ₹${s.udhar}\n💰 Total: ₹${s.total}\n🧾 Bills: ${s.count}\n━━━━━━━━━━━━━━\n⚠️ Low Stock: ${ctx.lowStock.length>0?ctx.lowStock.join(', '):'Sab theek'}\n❌ Out: ${ctx.outOfStock.length>0?ctx.outOfStock.join(', '):'Koi nahi'}`)
    }

    if (action === 'place_order') {
      const supplier = ctx.suppliers.find(s=>s.name.toLowerCase().includes((data.supplier_search||'').toLowerCase()))||ctx.suppliers[0]
      if (supplier) {
        const orderText = `📦 *Order*\n${shop.name}\n━━━━━━━━━━━━\n${(data.items||[]).map(i=>`• ${i.name}: ${i.qty} ${i.unit||''}`).join('\n')}\n━━━━━━━━━━━━\nJald deliver karein 🙏`
        addMsg('bot',`✅ ${supplier.name} ko order!`, { tag:'wa_preview', waText:orderText, phone:supplier.phone })
      } else addMsg('bot','❌ Supplier nahi mila. Pehle supplier add karein.')
    }

    if (action === 'promo_message') {
      const { data: allCusts } = await supabase.from('customers').select('name,phone').eq('shop_id', shop.id).not('phone','is',null)
      addMsg('bot',`📣 Promo Message:\n\n${data.message}\n\n${(allCusts||[]).length} customers ko WhatsApp blast kar sakte ho!`, { tag:'promo', promoText:data.message, customers: allCusts||[] })
    }
  }

  const finalizeBill = async (customer, items, total, payMode, today) => {
    const { data: inv } = await supabase.from('invoices').insert({ shop_id:shop.id, customer_id:customer?.id, customer_name:customer?.name||'Walk-in', total, pay_mode:payMode, bill_date:today }).select().single()
    if (inv) {
      await supabase.from('invoice_items').insert(items.map(i=>({ invoice_id:inv.id, product_id:i.id, product_name:i.name, quantity:i.qty, price:i.retail_price, total:i.retail_price*i.qty })))
      for (const item of items) {
        if (!item.is_service) await supabase.from('products').update({ stock:Math.max(0,item.stock-item.qty) }).eq('id',item.id)
      }
      if (customer) {
        const isUdhar = payMode==='udhar'
        await supabase.from('customers').update({ balance:(customer.balance||0)+(isUdhar?total:0) }).eq('id',customer.id)
        await supabase.from('transactions').insert({ shop_id:shop.id, customer_id:customer.id, invoice_id:inv.id, amount:total, type:'credit', mode:payMode, note:items.map(i=>i.name).join(', '), tx_date:today })
        if (isUdhar) addMsg('bot',`📱 ${customer.name} ko balance notification:\nNaya balance: ₹${(customer.balance||0)+total}`)
      }
    }
    const modeLabel = payMode==='cash'?'💵 Cash':payMode==='udhar'?'📒 Udhar':'📱 Bank/UPI'
    addMsg('bot',`✅ *Bill Save Ho Gaya!*\n💰 Total: ₹${total}\n${modeLabel} se payment`, { tag:'success' })
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim(); setInput('')
    addMsg('user', userMsg)

    // Handle pending payment confirmation
    if (pendingPayment) {
      const lower = userMsg.toLowerCase()
      let mode = 'udhar'
      if (lower.includes('cash')) mode = 'cash'
      else if (lower.includes('upi')||lower.includes('qr')||lower.includes('bank')) mode = 'bank'
      addMsg('bot',`💳 ${mode==='cash'?'💵 Cash':mode==='bank'?'📱 UPI/Bank':'📒 Udhar'} record kar raha hoon...`)
      await finalizeBill(pendingPayment.customer, pendingPayment.billItems, pendingPayment.total, mode, pendingPayment.today)
      setPendingPayment(null)
      return
    }

    setLoading(true)
    try {
      const ctx = await buildContext()
      const systemPrompt = `You are an AI assistant for "${ctx.shop.name}", a ${ctx.shop.type} run by ${ctx.shop.owner}.

SHOP DATA:
Products: ${JSON.stringify(ctx.products.map(p=>({id:p.id,name:p.name,price:p.retail_price,stock:p.stock,unit:p.unit})))}
Customers: ${JSON.stringify(ctx.customers.map(c=>({id:c.id,name:c.name,phone:c.phone,balance:c.balance})))}
Suppliers: ${JSON.stringify(ctx.suppliers)}
Today Sales: Cash=₹${ctx.todaySales.cash} UPI=₹${ctx.todaySales.bank} Udhar=₹${ctx.todaySales.udhar} Total=₹${ctx.todaySales.total} Bills=${ctx.todaySales.count}
Low Stock: ${ctx.lowStock.join(', ')||'None'}
Payment modes: ${JSON.stringify(ctx.payModes)}

Respond ONLY in JSON. Understand Hindi and Hinglish.

JSON format:
{
  "reply": "Hindi/Hinglish message (use *bold*, emoji)",
  "action": "create_bill|update_payment|balance_check|evening_summary|place_order|promo_message|none",
  "data": {
    for create_bill: {"customer_name":"","customer_phone":"","items":[{"product_search":"","qty":1}],"payment_mode":"cash|bank|udhar|ask"},
    for balance_check: {"customer_name":""},
    for place_order: {"supplier_search":"","items":[{"name":"","qty":0,"unit":""}]},
    for promo_message: {"message":"complete WhatsApp promo message in Hindi"},
    for evening_summary: {},
    otherwise: {}
  }
}

Return ONLY raw JSON, no markdown.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, system:systemPrompt, messages:[{ role:'user', content:userMsg }] })
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error?.message||'API Error')
      const text = resData.content?.map(b=>b.text||'').join('')||'{}'
      let parsed
      try { parsed = JSON.parse(text.replace(/```json|```/g,'').trim()) }
      catch { parsed = { reply:'Samajh nahi aaya. Dobara try karein.', action:'none', data:{} } }
      if (parsed.reply) addMsg('bot', parsed.reply)
      if (parsed.action && parsed.action!=='none') {
        await executeAction(parsed.action, parsed.data||{}, ctx)
      }
    } catch(err) {
      if (err.message?.includes('API key')) addMsg('bot','❌ API key sahi nahi. .env file mein VITE_ANTHROPIC_KEY check karein.')
      else addMsg('bot','⚠️ AI se connect nahi ho pa raha. Internet aur API key check karein.\n\nError: '+err.message)
    }
    setLoading(false)
  }

  const quickCmds = ['Aaj ki summary batao', 'Sugar ka stock batao', 'Harish ka balance batao', 'Low stock list dikhao']

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, height:'calc(100vh - 110px)' }}>
      {/* Chat */}
      <div style={{ display:'flex', flexDirection:'column', background:'#e5ddd5', borderRadius:18, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.1)' }}>
        {/* WA Header */}
        <div style={{ background:'#075E54', padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'#25d366', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🤖</div>
          <div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, color:'#fff' }}>{shop.name} AI Bot</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)' }}>● Online — Claude AI Powered</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'80%', background:m.role==='user'?'#dcf8c6':'#fff', borderRadius:m.role==='user'?'16px 4px 16px 16px':'4px 16px 16px 16px', padding:'10px 14px', boxShadow:'0 1px 2px rgba(0,0,0,0.08)', borderLeft:m.meta?.tag==='question'?`3px solid ${C.gold}`:m.meta?.tag==='success'?`3px solid ${C.g}`:'none' }}>
                {m.meta?.tag==='wa_preview' && (
                  <div style={{ background:'#f0f0f0', borderRadius:10, padding:'10px 12px', marginBottom:8, borderLeft:'4px solid #25d366' }}>
                    <div style={{ fontSize:10, color:'#25d366', fontWeight:800, marginBottom:6 }}>📱 WhatsApp Message{m.meta.phone?` → ${m.meta.phone}`:''}</div>
                    <pre style={{ fontSize:11, color:'#333', margin:0, whiteSpace:'pre-wrap', fontFamily:"'DM Sans',sans-serif" }}>{m.meta.waText}</pre>
                  </div>
                )}
                {m.meta?.tag==='promo' && m.meta.customers?.length>0 && (
                  <div style={{ marginTop:8 }}>
                    <a href={`https://wa.me/?text=${encodeURIComponent(m.meta.promoText)}`} target="_blank" rel="noreferrer"
                      style={{ display:'inline-block', background:'#25d366', color:'#fff', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:12, textDecoration:'none', fontFamily:"'Baloo 2',cursive" }}>
                      📣 WhatsApp se Broadcast Karein
                    </a>
                  </div>
                )}
                <pre style={{ margin:0, fontSize:13, whiteSpace:'pre-wrap', fontFamily:"'DM Sans',sans-serif", color:'#2d2d2d', lineHeight:1.5 }}>{m.text}</pre>
                {m.time && <div style={{ fontSize:10, color:C.muted, textAlign:'right', marginTop:4 }}>{m.time}</div>}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', justifyContent:'flex-start' }}>
              <div style={{ background:'#fff', borderRadius:'4px 16px 16px 16px', padding:'12px 18px', boxShadow:'0 1px 2px rgba(0,0,0,0.08)' }}>
                <div style={{ display:'flex', gap:4 }}>
                  {[0,1,2].map(k=><div key={k} style={{ width:8, height:8, borderRadius:'50%', background:C.muted, animation:'bounce 1s infinite', animationDelay:`${k*0.15}s` }}/>)}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Quick commands */}
        <div style={{ background:'rgba(255,255,255,0.9)', padding:'8px 12px', display:'flex', gap:6, overflowX:'auto', flexWrap:'wrap' }}>
          {quickCmds.map(cmd=>(
            <button key={cmd} onClick={()=>setInput(cmd)} style={{ flexShrink:0, background:'#fff', border:`1px solid ${C.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', color:C.text }}>
              {cmd}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ background:'#f0f0f0', padding:'10px 12px', display:'flex', gap:10, alignItems:'center' }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
            placeholder="Kuch bhi likhein... (Hindi ya English)"
            style={{ flex:1, border:'none', borderRadius:24, padding:'10px 16px', fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fff' }}/>
          <button onClick={sendMessage} disabled={loading} style={{ width:42, height:42, borderRadius:'50%', background:loading?C.muted:'#25d366', border:'none', cursor:loading?'not-allowed':'pointer', fontSize:18, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      {/* Commands Guide */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
        <div style={{ background:C.card, borderRadius:16, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, color:C.gD, marginBottom:12 }}>🤖 AI Bot Commands</div>
          {[
            ['🧾 Bill Banana', '"Harish ko 2kg sugar ka bill bana ke bhej do"'],
            ['💳 Payment', '"Harish ne 500 cash diya"'],
            ['📒 Balance', '"Sunita ka balance batao"'],
            ['📊 Summary', '"Aaj ki kamai ki summary batao"'],
            ['📦 Order', '"Sharma ji ko atta oil ka order do"'],
            ['📣 Promo', '"Kal Holi sale hai — accha message banao sabko bhejo"'],
            ['🔍 Stock', '"Sugar ka stock kitna hai"'],
          ].map(([t,ex])=>(
            <div key={t} style={{ marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${C.gXL}` }}>
              <div style={{ fontWeight:800, fontSize:12, color:C.g }}>{t}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2, fontStyle:'italic', cursor:'pointer' }} onClick={()=>setInput(ex.replace(/"/g,''))}>"{ex}"</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:14, padding:16 }}>
          <div style={{ fontWeight:800, fontSize:13, color:C.gold, marginBottom:8 }}>⚠️ Note</div>
          <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
            AI bot ke liye VITE_ANTHROPIC_KEY .env mein set karni hai. claude.ai se key le sakte hain.
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}
