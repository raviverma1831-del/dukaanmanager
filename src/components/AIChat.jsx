import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function AIChat({ shop }) {
  const [msgs, setMsgs] = useState([{
    role:'bot',
    text:`Namaste! Main ${shop.name} ka AI Assistant hoon 🤖\n\nAap bol kar ya likh kar commands de sakte hain:\n• "Harish ko 2kg sugar ka bill bana do"\n• "Naya customer Rahul add karo number 9876543210"\n• "10kg atta purchase chadha do, 500 cash diya"\n• "Sunita ka balance batao aur usko call lagao"\n• "Aaj ki kamai ki summary batao"`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)
  const endRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'hi-IN'
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(prev => (prev ? prev + ' ' : '') + transcript)
        setIsListening(false)
      }
      
      recognition.onerror = (event) => {
        console.error("Speech error:", event.error)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }
      
      recognitionRef.current = recognition
    }
  }, [])

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

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

    if (action === 'create_customer') {
      const { data: newC } = await supabase.from('customers').insert({ shop_id:shop.id, name:data.customer_name, phone:data.customer_phone||'', type:'retail', balance:0 }).select().single()
      if (newC) addMsg('bot', `✅ Naya customer "${newC.name}" add ho gaya hai.`)
    }

    if (action === 'add_purchase') {
      let totalAmount = 0
      for (const item of (data.items||[])) {
        const prod = ctx.products.find(p => p.name.toLowerCase().includes((item.name||'').toLowerCase()))
        if (prod && !prod.is_service) {
          await supabase.from('products').update({ stock: prod.stock + (item.qty||1) }).eq('id', prod.id)
          totalAmount += (prod.wholesale_price || prod.retail_price) * (item.qty||1)
        }
      }
      if (totalAmount > 0) {
        await supabase.from('transactions').insert({ shop_id:shop.id, amount:totalAmount, type:'debit', mode:data.payment_mode||'cash', note:`Purchase: ${(data.items||[]).map(i=>i.name).join(', ')}`, tx_date:today })
        addMsg('bot', `✅ Purchase chadha di gayi! Stock update ho gaya aur ₹${totalAmount} ka kharcha (debit) record hua.`)
      } else {
        addMsg('bot', `❌ Product nahi mila. Pehle item inventory me add karein.`)
      }
    }

    if (action === 'call_customer' || action === 'ask_payment') {
      const c = ctx.customers.find(c=>c.name.toLowerCase().includes((data.customer_name||'').toLowerCase()))
      if (c && c.phone) {
        if (action === 'call_customer') {
          addMsg('bot', `📞 ${c.name} ka number: ${c.phone}\nNeeche button se direct call lagayein:`, { tag:'call', phone:c.phone, name:c.name })
        } else {
          const msg = `Namaste ${c.name} ji, ${shop.name} se baat kar rahe hain. Aapka ₹${c.balance||0} baaki hai, kripya jald payment karein. 🙏`
          addMsg('bot', `📲 ${c.name} ko Udhar Reminder bhejna hai?`, { tag:'wa_preview', waText:msg, phone:c.phone })
        }
      } else {
        addMsg('bot', `❌ "${data.customer_name}" ka number nahi mila!`)
      }
    }

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
    
    if (action === 'update_settings') {
      if (data.update_type === 'name') {
        await supabase.from('shops').update({ name: data.value }).eq('id', shop.id)
        addMsg('bot', `✅ Dukaan ka naam badal kar "${data.value}" kar diya gaya hai!`)
      } else {
        addMsg('bot', `⚙️ Settings update karne ke liye aap menu se "Settings" tab mein jaa sakte hain.`)
      }
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
      const systemPrompt = `You are an AI assistant with FULL ACCESS for "${ctx.shop.name}", a ${ctx.shop.type} run by ${ctx.shop.owner}.

SHOP DATA:
Products: ${JSON.stringify(ctx.products.map(p=>({id:p.id,name:p.name,price:p.retail_price,stock:p.stock,unit:p.unit})))}
Customers: ${JSON.stringify(ctx.customers.map(c=>({id:c.id,name:c.name,phone:c.phone,balance:c.balance})))}
Today Sales: Total=₹${ctx.todaySales.total} Bills=${ctx.todaySales.count}

RULES:
1. Understand Hindi and Hinglish voice/text commands.
2. Only execute destructive actions (update, add, create, bill, purchase) when EXPLICITLY requested by the user. Do not guess.
3. Determine the correct "action" and extract required "data".

JSON format:
{
  "reply": "Hindi/Hinglish message (use *bold*, emoji)",
  "action": "create_bill|add_purchase|create_customer|call_customer|ask_payment|balance_check|evening_summary|place_order|promo_message|update_settings|none",
  "data": {
    for create_bill: {"customer_name":"","customer_phone":"","items":[{"product_search":"","qty":1}],"payment_mode":"cash|bank|udhar|ask"},
    for add_purchase: {"items":[{"name":"","qty":1}],"payment_mode":"cash|bank"},
    for create_customer: {"customer_name":"","customer_phone":""},
    for call_customer/ask_payment: {"customer_name":""},
    for balance_check: {"customer_name":""},
    for update_settings: {"update_type":"name|other", "value":""},
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

  const quickCmds = ['Aaj ki summary batao', 'Rahul ko call lagao', '2kg sugar purchase chadao', 'Ramesh ka bill banao']

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, height:'calc(100vh - 110px)' }}>
      {/* Chat */}
      <div style={{ display:'flex', flexDirection:'column', background:'#e5ddd5', borderRadius:18, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.1)' }}>
        {/* WA Header */}
        <div style={{ background:'#075E54', padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'#25d366', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🤖</div>
          <div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, color:'#fff' }}>{shop.name} AI Voice Bot</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)' }}>● Online — Bol kar command dein!</div>
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
                    <a href={`https://wa.me/91${m.meta.phone}?text=${encodeURIComponent(m.meta.waText)}`} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:8, background:'#25d366', color:'#fff', padding:'6px 12px', borderRadius:6, textDecoration:'none', fontSize:11, fontWeight:'bold' }}>Bhejo</a>
                  </div>
                )}
                {m.meta?.tag==='call' && (
                  <div style={{ background:'#f0f0f0', borderRadius:10, padding:'10px 12px', marginBottom:8, borderLeft:`4px solid ${C.b}` }}>
                    <div style={{ fontSize:10, color:C.b, fontWeight:800, marginBottom:6 }}>📞 Call {m.meta.name}</div>
                    <div style={{ fontSize:13, fontWeight:'bold' }}>{m.meta.phone}</div>
                    <a href={`tel:${m.meta.phone}`} style={{ display:'inline-block', marginTop:8, background:C.b, color:'#fff', padding:'6px 12px', borderRadius:6, textDecoration:'none', fontSize:11, fontWeight:'bold' }}>Call Lagayein</a>
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
          <button 
            onClick={toggleListen}
            style={{ width:42, height:42, borderRadius:'50%', background:isListening?'#ef4444':'#fff', border:isListening?'none':`1.5px solid ${C.border}`, cursor:'pointer', fontSize:18, color:isListening?'#fff':C.text, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 5px rgba(0,0,0,0.1)', transition:'0.3s' }}>
            {isListening ? '🎙️' : '🎤'}
          </button>
          
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
            placeholder={isListening ? 'Sun raha hoon...' : 'Kuch bhi bolkar ya likh kar commands dein...'}
            style={{ flex:1, border:'none', borderRadius:24, padding:'10px 16px', fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fff' }}/>
            
          <button onClick={sendMessage} disabled={loading||!input.trim()} style={{ width:42, height:42, borderRadius:'50%', background:loading||!input.trim()?C.muted:'#25d366', border:'none', cursor:loading||!input.trim()?'not-allowed':'pointer', fontSize:18, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      {/* Commands Guide */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
        <div style={{ background:C.card, borderRadius:16, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, color:C.gD, marginBottom:12 }}>🤖 Voice Commands Guide</div>
          {[
            ['🧾 Bill Banana', '"Harish ko 2kg sugar ka bill bana do, cash mein"'],
            ['📦 Purchase Chadana', '"Aaj 10kg atta purchase kiya, stock update kar do"'],
            ['💳 Customer Add', '"Rahul naya customer add karo, phone 987654321"'],
            ['📞 Call / Payment', '"Sunita ko call lagao" ya "Sunita se udhar maango"'],
            ['⚙️ Settings', '"Dukaan ka naam badal kar Super Store kar do"'],
            ['📊 Summary', '"Aaj ki kamai batao"'],
          ].map(([t,ex])=>(
            <div key={t} style={{ marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${C.gXL}` }}>
              <div style={{ fontWeight:800, fontSize:12, color:C.g }}>{t}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2, fontStyle:'italic', cursor:'pointer' }} onClick={()=>setInput(ex.replace(/"/g,''))}>"{ex}"</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:14, padding:16 }}>
          <div style={{ fontWeight:800, fontSize:13, color:C.gold, marginBottom:8 }}>⚠️ Dhyan Dein</div>
          <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
            Bot sirf tabhi action lega jab aap explicitly "banao", "add karo", "update karo" bolenge. Mic icon pe click karein aur bolna shuru karein!
          </div>
          <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6, marginTop:8 }}>
            AI bot ke liye VITE_ANTHROPIC_KEY .env mein set karni hai. claude.ai se key le sakte hain.
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}
