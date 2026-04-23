import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function Billing({ shop }) {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [custSearch, setCustSearch] = useState('')
  const [selCust, setSelCust] = useState(null)
  const [showCustDrop, setShowCustDrop] = useState(false)
  const [custType, setCustType] = useState('retail')
  const [payMode, setPayMode] = useState('cash')
  const [done, setDone] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [shop.id])

  const loadData = async () => {
    const { data: p } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('name')
    const { data: c } = await supabase.from('customers').select('*').eq('shop_id', shop.id).order('name')
    setProducts(p||[])
    setCustomers(c||[])
  }

  const categories = ['All', ...(shop.categories||[])]
  const payModes = shop.pay_modes||{cash:true,upi:true}
  const custTypes = shop.cust_types||{retail:true}

  const getPrice = (p) => custType==='wholesale' && p.wholesale_price ? p.wholesale_price : p.retail_price

  const filtered = products.filter(p =>
    (cat==='All' || p.category===cat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const custFiltered = customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()))

  const addToCart = (p) => {
    if (!p.is_service && p.stock < 1) return
    setCart(prev => {
      const ex = prev.find(i=>i.id===p.id)
      return ex ? prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...prev,{...p,qty:1}]
    })
  }

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+delta)}:i).filter(i=>i.qty>0))
  }

  const total = cart.reduce((s,i)=>s+getPrice(i)*i.qty, 0)

  const checkout = async () => {
    if (!cart.length) return
    setSaving(true)
    const today = new Date().toISOString().slice(0,10)

    // Create invoice
    const { data: inv, error: invErr } = await supabase.from('invoices').insert({
      shop_id: shop.id,
      customer_id: selCust?.id || null,
      customer_name: selCust?.name || 'Walk-in',
      total, pay_mode: payMode, bill_date: today
    }).select().single()

    if (invErr) { alert('Error: '+invErr.message); setSaving(false); return }

    // Invoice items
    await supabase.from('invoice_items').insert(
      cart.map(i => ({
        invoice_id: inv.id,
        product_id: i.id,
        product_name: i.name,
        quantity: i.qty,
        price: getPrice(i),
        total: getPrice(i) * i.qty
      }))
    )

    // Update product stock
    for (const item of cart) {
      if (!item.is_service) {
        await supabase.from('products').update({ stock: Math.max(0, item.stock - item.qty) }).eq('id', item.id)
      }
    }

    // Update customer balance if khata or udhar
    if (selCust) {
      const isUdhar = payMode === 'udhar'
      const newBalance = (selCust.balance||0) + (isUdhar ? total : 0)
      await supabase.from('customers').update({ balance: newBalance }).eq('id', selCust.id)
      await supabase.from('transactions').insert({
        shop_id: shop.id,
        customer_id: selCust.id,
        invoice_id: inv.id,
        amount: total,
        type: 'credit',
        mode: payMode,
        note: cart.map(i=>i.name).join(', '),
        tx_date: today
      })
    }

    setDone({ ...inv, cart: [...cart], customer: selCust?.name||'Walk-in' })
    setCart([])
    setSaving(false)
    loadData()
  }

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe' }

  if (done) return (
    <div style={{ maxWidth:420, margin:'0 auto', background:C.card, borderRadius:20, padding:28, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ fontSize:48 }}>🧾</div>
        <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.g }}>Bill Taiyar!</div>
        <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>{done.bill_date} • {done.customer}</div>
      </div>
      <div style={{ borderTop:`1px dashed ${C.border}`, borderBottom:`1px dashed ${C.border}`, padding:'12px 0', marginBottom:14 }}>
        {done.cart.map(i=>(
          <div key={i.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0' }}>
            <span>{i.name} × {i.qty}</span>
            <span style={{ fontWeight:700 }}>₹{getPrice(i)*i.qty}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, marginBottom:20 }}>
        <span>Total</span><span style={{ color:C.g }}>₹{done.total}</span>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        {done.customer !== 'Walk-in' && (
          <a href={`https://wa.me/91${customers.find(c=>c.name===done.customer)?.phone||''}?text=${encodeURIComponent(`🧾 Bill ${done.id?.slice(-4)||''}\n${shop.name}\n${done.cart.map(i=>`${i.name} x${i.qty} = ₹${getPrice(i)*i.qty}`).join('\n')}\nTotal: ₹${done.total}`)}`}
            target="_blank" rel="noreferrer"
            style={{ flex:1, background:'#25d366', color:'#fff', borderRadius:12, padding:11, textAlign:'center', fontWeight:800, fontSize:13, textDecoration:'none', fontFamily:"'Baloo 2',cursive", display:'block' }}>
            📱 WhatsApp bhejo
          </a>
        )}
        <button onClick={()=>{setDone(null);setSelCust(null);setCustSearch('');setPayMode('cash')}} style={{ flex:1, background:`linear-gradient(135deg,${C.gD},${C.g})`, color:'#fff', border:'none', borderRadius:12, padding:11, fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:14, cursor:'pointer' }}>
          + Naya Bill
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>🧾 Billing</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
        {/* Products Grid */}
        <div>
          {/* Customer Type + Category */}
          <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
            {custTypes.retail && <button onClick={()=>setCustType('retail')} style={{ background:custType==='retail'?C.g:'#fff', color:custType==='retail'?'#fff':C.text, border:`1.5px solid ${custType==='retail'?C.g:C.border}`, borderRadius:9, padding:'6px 14px', fontSize:12, fontWeight:800, cursor:'pointer' }}>🛒 Retail</button>}
            {custTypes.wholesale && <button onClick={()=>setCustType('wholesale')} style={{ background:custType==='wholesale'?C.gold:'#fff', color:custType==='wholesale'?'#fff':C.text, border:`1.5px solid ${custType==='wholesale'?C.gold:C.border}`, borderRadius:9, padding:'6px 14px', fontSize:12, fontWeight:800, cursor:'pointer' }}>📦 Wholesale</button>}
            <div style={{ width:1, background:C.border, margin:'0 4px' }}/>
            {categories.map(c=><button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?C.gD:'#fff', color:cat===c?'#fff':C.text, border:`1.5px solid ${cat===c?C.gD:C.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{c}</button>)}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Item search..." style={{ ...inp, width:'100%', boxSizing:'border-box', marginBottom:12 }}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {filtered.map(p=>{
              const disabled = !p.is_service && p.stock < 1
              return (
                <div key={p.id} onClick={()=>!disabled&&addToCart(p)}
                  style={{ background:disabled?'#f9fafb':C.card, border:`1.5px solid ${p.stock<=p.min_stock&&!p.is_service?'#fca5a5':C.border}`, borderRadius:12, padding:'12px 14px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, transition:'transform 0.12s, box-shadow 0.12s' }}
                  onMouseEnter={e=>{if(!disabled){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 18px rgba(22,163,74,0.12)'}}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.text, lineHeight:1.3 }}>{p.name}</div>
                  <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.g, fontSize:15 }}>₹{getPrice(p)}</span>
                    {!p.is_service && <span style={{ background:p.stock<=p.min_stock?C.redL:C.gXL, color:p.stock<=p.min_stock?C.red:C.gL, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{p.stock} {p.unit}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cart */}
        <div style={{ background:C.card, borderRadius:18, padding:18, boxShadow:'0 4px 20px rgba(0,0,0,0.07)', position:'sticky', top:80 }}>
          {/* Customer search */}
          <div style={{ position:'relative', marginBottom:10 }}>
            <input value={custSearch} onChange={e=>{setCustSearch(e.target.value);setShowCustDrop(true)}} onFocus={()=>setShowCustDrop(true)}
              placeholder="🔍 Customer search..." style={{ ...inp, width:'100%', boxSizing:'border-box' }}/>
            {showCustDrop && custSearch && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, zIndex:10, maxHeight:160, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.1)' }}>
                {custFiltered.slice(0,6).map(c=>(
                  <div key={c.id} onClick={()=>{setSelCust(c);setCustSearch(c.name);setShowCustDrop(false)}}
                    style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, fontWeight:700, borderBottom:`1px solid ${C.gXL}` }}>
                    {c.name} <span style={{ color:C.muted, fontWeight:500 }}>({c.type})</span>
                    {c.balance>0 && <span style={{ color:C.red, fontSize:11, marginLeft:6 }}>₹{c.balance} baaki</span>}
                  </div>
                ))}
                <div onClick={()=>{setSelCust(null);setCustSearch('');setShowCustDrop(false)}} style={{ padding:'10px 14px', cursor:'pointer', fontSize:12, color:C.muted }}>Walk-in Customer</div>
              </div>
            )}
          </div>
          {selCust && <div style={{ background:C.gXL, borderRadius:9, padding:'7px 12px', marginBottom:10, fontSize:12, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontWeight:800, color:C.gD }}>{selCust.name}</span>
            {selCust.balance>0 && <span style={{ color:C.red, fontWeight:700 }}>₹{selCust.balance} baaki</span>}
          </div>}

          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:16, color:C.text, marginBottom:10 }}>
            🛒 Cart {cart.length>0 && <span style={{ background:C.g, color:'#fff', borderRadius:'50%', padding:'0 7px', fontSize:12 }}>{cart.length}</span>}
          </div>

          {cart.length===0
            ? <div style={{ textAlign:'center', padding:'28px 0', color:C.muted, fontSize:13 }}>← Item add karein</div>
            : <>
              <div style={{ maxHeight:220, overflowY:'auto' }}>
                {cart.map(i=>(
                  <div key={i.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, paddingBottom:8, borderBottom:`1px solid ${C.gXL}` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:12 }}>{i.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>₹{getPrice(i)} × {i.qty} = <b>₹{getPrice(i)*i.qty}</b></div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <button onClick={()=>updateQty(i.id,-1)} style={{ background:'#f3f4f6', border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', fontWeight:900 }}>−</button>
                      <span style={{ fontWeight:800, fontSize:12, minWidth:18, textAlign:'center' }}>{i.qty}</span>
                      <button onClick={()=>updateQty(i.id,1)} style={{ background:C.gXL, border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', fontWeight:900, color:C.g }}>+</button>
                      <button onClick={()=>setCart(prev=>prev.filter(x=>x.id!==i.id))} style={{ background:C.redL, border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', color:C.red, fontWeight:900 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:`2px dashed ${C.border}`, paddingTop:12, marginTop:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, marginBottom:12 }}>
                  <span>Total</span><span style={{ color:C.g }}>₹{total}</span>
                </div>
                <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                  {[['cash','💵 Cash'],['upi','📱 UPI'],['bank','🏦 Bank'],['udhar','📒 Udhar']].filter(([k])=>k==='udhar'||payModes[k]).map(([k,l])=>(
                    <button key={k} onClick={()=>setPayMode(k)} style={{ flex:1, minWidth:55, background:payMode===k?C.g:'#fff', color:payMode===k?'#fff':C.text, border:`1.5px solid ${payMode===k?C.g:C.border}`, borderRadius:8, padding:'6px', fontSize:11, fontWeight:800, cursor:'pointer' }}>{l}</button>
                  ))}
                </div>
                <button onClick={checkout} disabled={saving} style={{ width:'100%', background:saving?C.muted:`linear-gradient(135deg,${C.gD},${C.g})`, color:'#fff', border:'none', borderRadius:12, padding:13, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:saving?'not-allowed':'pointer' }}>
                  {saving ? '⏳ Saving...' : '✅ Bill Banao'}
                </button>
              </div>
            </>
          }
        </div>
      </div>
    </div>
  )
}
