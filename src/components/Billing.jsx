import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

// GST Calculation Helper
const calcGST = (price, gstRate, priceIncludesGst, isInterstate) => {
  if (!gstRate || gstRate === 0) return { taxable: price, cgst: 0, sgst: 0, igst: 0, total: price }
  let taxable = priceIncludesGst ? price / (1 + gstRate / 100) : price
  const gstAmount = taxable * gstRate / 100
  if (isInterstate) return { taxable, cgst: 0, sgst: 0, igst: gstAmount, total: taxable + gstAmount }
  return { taxable, cgst: gstAmount/2, sgst: gstAmount/2, igst: 0, total: taxable + gstAmount }
}

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
  const [invoiceType, setInvoiceType] = useState('B2C')
  const [custGstin, setCustGstin] = useState('')
  const [isInterstate, setIsInterstate] = useState(false)
  const [done, setDone] = useState(null)
  const [saving, setSaving] = useState(false)
  const invoiceRef = useRef(null)

  useEffect(() => { loadData() }, [shop.id])

  const loadData = async () => {
    const { data: p } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('name')
    const { data: c } = await supabase.from('customers').select('*').eq('shop_id', shop.id).order('name')
    setProducts(p||[]); setCustomers(c||[])
  }

  const categories = ['All', ...(shop.categories||[])]
  const payModes = shop.pay_modes || { cash:true, upi:true }
  const custTypes = shop.cust_types || { retail:true }
  const getBasePrice = (p) => custType==='wholesale' && p.wholesale_price ? p.wholesale_price : p.retail_price

  const filtered = products.filter(p =>
    (cat==='All' || p.category===cat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (p) => {
    if (!p.is_service && p.stock < 1) return
    setCart(prev => {
      const ex = prev.find(i=>i.id===p.id)
      return ex ? prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...prev,{...p,qty:1}]
    })
  }

  const updateQty = (id, delta) => setCart(prev => prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+delta)}:i))
  const removeItem = (id) => setCart(prev => prev.filter(i=>i.id!==id))

  // GST Calculations
  const cartWithGST = cart.map(item => {
    const basePrice = getBasePrice(item)
    const lineTotal = basePrice * item.qty
    const gst = calcGST(lineTotal, item.gst_rate||0, item.price_includes_gst||false, isInterstate)
    return { ...item, basePrice, lineTotal, ...gst }
  })

  const subtotal = cartWithGST.reduce((s,i) => s + i.taxable, 0)
  const totalCgst = cartWithGST.reduce((s,i) => s + i.cgst, 0)
  const totalSgst = cartWithGST.reduce((s,i) => s + i.sgst, 0)
  const totalIgst = cartWithGST.reduce((s,i) => s + i.igst, 0)
  const totalGst = totalCgst + totalSgst + totalIgst
  const grandTotal = subtotal + totalGst
  const isGstRegistered = shop.gst_type === 'registered'

  const getInvoiceNumber = () => `INV-${Date.now().toString().slice(-6)}`

  const checkout = async () => {
    if (!cart.length) return
    setSaving(true)
    const today = new Date().toISOString().slice(0,10)
    const invNumber = getInvoiceNumber()

    const { data: inv, error: invErr } = await supabase.from('invoices').insert({
      shop_id: shop.id,
      customer_id: selCust?.id || null,
      customer_name: selCust?.name || 'Walk-in',
      subtotal: +subtotal.toFixed(2),
      cgst: +totalCgst.toFixed(2),
      sgst: +totalSgst.toFixed(2),
      igst: +totalIgst.toFixed(2),
      total_gst: +totalGst.toFixed(2),
      total: +grandTotal.toFixed(2),
      pay_mode: payMode, bill_date: today,
      invoice_type: invoiceType,
      customer_gstin: custGstin || null,
      is_interstate: isInterstate,
      invoice_number: invNumber,
    }).select().single()

    if (invErr) { alert('Error: '+invErr.message); setSaving(false); return }

    await supabase.from('invoice_items').insert(
      cartWithGST.map(i => ({
        invoice_id: inv.id, product_id: i.id,
        product_name: i.name, quantity: i.qty,
        price: i.basePrice, total: i.lineTotal,
        hsn_code: i.hsn_code||'',
        gst_rate: i.gst_rate||0,
        taxable_amount: +i.taxable.toFixed(2),
        cgst_amount: +i.cgst.toFixed(2),
        sgst_amount: +i.sgst.toFixed(2),
        igst_amount: +i.igst.toFixed(2),
      }))
    )

    for (const item of cart) {
      if (!item.is_service) {
        await supabase.from('products').update({ stock: Math.max(0, item.stock-item.qty) }).eq('id', item.id)
      }
    }

    if (selCust) {
      const isUdhar = payMode === 'udhar'
      await supabase.from('customers').update({ balance: (selCust.balance||0)+(isUdhar?grandTotal:0) }).eq('id', selCust.id)
      await supabase.from('transactions').insert({
        shop_id: shop.id, customer_id: selCust.id, invoice_id: inv.id,
        amount: +grandTotal.toFixed(2), type: 'credit', mode: payMode,
        note: cart.map(i=>i.name).join(', '), tx_date: today
      })
    }

    setDone({ ...inv, cartItems: cartWithGST, invNumber, subtotal, totalCgst, totalSgst, totalIgst, totalGst, grandTotal })
    setCart([]); setSaving(false); loadData()
  }

  const printInvoice = () => {
    const content = invoiceRef.current?.innerHTML
    const win = window.open('','_blank')
    win.document.write(`<html><head><title>Invoice ${done.invNumber}</title><style>body{font-family:Arial;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f0fdf4}.total{font-weight:bold;font-size:14px}</style></head><body>${content}</body></html>`)
    win.document.close(); win.print()
  }

  const whatsappBill = () => {
    if (!done || !selCust?.phone) return
    const items = done.cartItems.map(i=>`${i.name} ×${i.qty} = ₹${i.lineTotal.toFixed(0)}`).join('\n')
    const msg = `🧾 *${shop.name}*\nInvoice: ${done.invNumber}\nDate: ${done.bill_date}\n\n${items}\n\nSubtotal: ₹${done.subtotal.toFixed(0)}${done.totalGst>0?`\nGST: ₹${done.totalGst.toFixed(0)}`:''}  \n*Total: ₹${done.grandTotal.toFixed(0)}*\n\nThank you! 🙏`
    window.open(`https://wa.me/91${selCust.phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe' }

  if (done) return (
    <div style={{ maxWidth:520, margin:'0 auto' }}>
      {/* Invoice Preview */}
      <div ref={invoiceRef} style={{ background:'#fff', borderRadius:20, padding:28, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', marginBottom:16 }}>
        <div style={{ textAlign:'center', borderBottom:`2px solid ${C.gXL}`, paddingBottom:16, marginBottom:16 }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD }}>{shop.name}</div>
          {shop.address && <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{shop.address}</div>}
          {shop.gst_number && <div style={{ fontSize:12, color:C.muted }}>GSTIN: {shop.gst_number}</div>}
          <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', fontSize:12, color:C.muted }}>
            <span>Invoice: <b>{done.invNumber}</b></span>
            <span>Date: <b>{done.bill_date}</b></span>
          </div>
          {done.customer_name !== 'Walk-in' && (
            <div style={{ marginTop:6, fontSize:12, textAlign:'left', background:C.gXL, borderRadius:8, padding:'8px 12px' }}>
              <b>Bill To:</b> {done.customer_name}
              {done.customer_gstin && <span style={{ marginLeft:8 }}>GSTIN: {done.customer_gstin}</span>}
            </div>
          )}
        </div>

        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginBottom:14 }}>
          <thead>
            <tr style={{ background:C.gXL }}>
              <th style={{ padding:'8px', textAlign:'left', fontWeight:800 }}>Item</th>
              <th style={{ padding:'8px', textAlign:'right', fontWeight:800 }}>HSN</th>
              <th style={{ padding:'8px', textAlign:'right', fontWeight:800 }}>Qty</th>
              <th style={{ padding:'8px', textAlign:'right', fontWeight:800 }}>Rate</th>
              {isGstRegistered && <th style={{ padding:'8px', textAlign:'right', fontWeight:800 }}>GST%</th>}
              {isGstRegistered && <th style={{ padding:'8px', textAlign:'right', fontWeight:800 }}>GST Amt</th>}
              <th style={{ padding:'8px', textAlign:'right', fontWeight:800 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {done.cartItems.map((item,i)=>(
              <tr key={item.id} style={{ borderBottom:`1px solid ${C.gXL}`, background:i%2===0?'#fafffe':'#fff' }}>
                <td style={{ padding:'8px', fontWeight:700 }}>{item.name}</td>
                <td style={{ padding:'8px', textAlign:'right', color:C.muted, fontFamily:'monospace' }}>{item.hsn_code||'—'}</td>
                <td style={{ padding:'8px', textAlign:'right' }}>{item.qty} {item.unit}</td>
                <td style={{ padding:'8px', textAlign:'right' }}>₹{item.basePrice}</td>
                {isGstRegistered && <td style={{ padding:'8px', textAlign:'right' }}>{item.gst_rate||0}%</td>}
                {isGstRegistered && <td style={{ padding:'8px', textAlign:'right', color:'#0369a1' }}>₹{(item.cgst+item.sgst+item.igst).toFixed(2)}</td>}
                <td style={{ padding:'8px', textAlign:'right', fontWeight:800, color:C.gD }}>₹{item.lineTotal.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop:`2px solid ${C.gXL}`, paddingTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
            <span>Subtotal (Taxable):</span><span style={{ fontWeight:700 }}>₹{done.subtotal.toFixed(2)}</span>
          </div>
          {isGstRegistered && done.totalCgst > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#0369a1', marginBottom:4 }}>
              <span>CGST:</span><span>₹{done.totalCgst.toFixed(2)}</span>
            </div>
          )}
          {isGstRegistered && done.totalSgst > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#0369a1', marginBottom:4 }}>
              <span>SGST:</span><span>₹{done.totalSgst.toFixed(2)}</span>
            </div>
          )}
          {isGstRegistered && done.totalIgst > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#0369a1', marginBottom:4 }}>
              <span>IGST:</span><span>₹{done.totalIgst.toFixed(2)}</span>
            </div>
          )}
          {isGstRegistered && done.totalGst > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#0369a1', marginBottom:8, fontWeight:700 }}>
              <span>Total GST:</span><span>₹{done.totalGst.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
            <span>GRAND TOTAL</span><span>₹{done.grandTotal.toFixed(2)}</span>
          </div>
          <div style={{ marginTop:8, fontSize:12, color:C.muted }}>
            Payment: {done.pay_mode==='cash'?'💵 Cash':done.pay_mode==='upi'?'📱 UPI':done.pay_mode==='bank'?'🏦 Bank':'📒 Udhar'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <button onClick={printInvoice} style={{ background:'#1d4ed8', color:'#fff', border:'none', borderRadius:12, padding:12, fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:14, cursor:'pointer' }}>🖨️ Print Invoice</button>
        {selCust?.phone && <button onClick={whatsappBill} style={{ background:'#25d366', color:'#fff', border:'none', borderRadius:12, padding:12, fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:14, cursor:'pointer' }}>📱 WhatsApp</button>}
      </div>
      <button onClick={()=>{setDone(null);setSelCust(null);setCustSearch('');setPayMode('cash');setCustGstin('');}} style={{ width:'100%', background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:13, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:'pointer' }}>
        + Naya Bill
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>🧾 Billing</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
        {/* Products */}
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
            {custTypes.retail && <button onClick={()=>setCustType('retail')} style={{ background:custType==='retail'?C.g:'#fff', color:custType==='retail'?'#fff':C.text, border:`1.5px solid ${custType==='retail'?C.g:C.border}`, borderRadius:9, padding:'6px 14px', fontSize:12, fontWeight:800, cursor:'pointer' }}>🛒 Retail</button>}
            {custTypes.wholesale && <button onClick={()=>setCustType('wholesale')} style={{ background:custType==='wholesale'?C.gold:'#fff', color:custType==='wholesale'?'#fff':C.text, border:`1.5px solid ${custType==='wholesale'?C.gold:C.border}`, borderRadius:9, padding:'6px 14px', fontSize:12, fontWeight:800, cursor:'pointer' }}>📦 Wholesale</button>}
            <div style={{ width:1, background:C.border }}/>
            {categories.map(c=><button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?C.gD:'#fff', color:cat===c?'#fff':C.text, border:`1.5px solid ${cat===c?C.gD:C.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{c}</button>)}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Item search..." style={{ ...inp, width:'100%', boxSizing:'border-box', marginBottom:12 }}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:10 }}>
            {filtered.map(p=>{
              const disabled = !p.is_service && p.stock < 1
              const basePrice = getBasePrice(p)
              const hasGst = p.gst_rate > 0
              return (
                <div key={p.id} onClick={()=>!disabled&&addToCart(p)}
                  style={{ background:disabled?'#f9fafb':'#fff', border:`1.5px solid ${p.stock<=p.min_stock&&!p.is_service?'#fca5a5':C.border}`, borderRadius:12, padding:'12px 14px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, transition:'transform 0.12s' }}
                  onMouseEnter={e=>{if(!disabled)e.currentTarget.style.transform='translateY(-2px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='none'}}>
                  <div style={{ fontWeight:700, fontSize:12, color:C.text, lineHeight:1.3, marginBottom:4 }}>{p.name}</div>
                  {p.hsn_code && <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace' }}>HSN: {p.hsn_code}</div>}
                  <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.g, fontSize:14 }}>₹{basePrice}</span>
                    {!p.is_service && <span style={{ background:p.stock<=p.min_stock?C.redL:C.gXL, color:p.stock<=p.min_stock?C.red:C.gL, borderRadius:20, padding:'2px 7px', fontSize:10, fontWeight:700 }}>{p.stock}</span>}
                  </div>
                  {hasGst && <div style={{ fontSize:10, color:'#0369a1', marginTop:2 }}>+{p.gst_rate}% GST</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cart */}
        <div style={{ background:'#fff', borderRadius:18, padding:18, boxShadow:'0 4px 20px rgba(0,0,0,0.07)', position:'sticky', top:80 }}>
          {/* Invoice Type */}
          {isGstRegistered && (
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {['B2C','B2B'].map(t=>(
                <button key={t} onClick={()=>setInvoiceType(t)} style={{ flex:1, background:invoiceType===t?C.g:'#fff', color:invoiceType===t?'#fff':C.text, border:`1.5px solid ${invoiceType===t?C.g:C.border}`, borderRadius:8, padding:'6px', fontSize:12, fontWeight:800, cursor:'pointer' }}>{t}</button>
              ))}
              <button onClick={()=>setIsInterstate(!isInterstate)} style={{ flex:1, background:isInterstate?'#7c3aed':'#fff', color:isInterstate?'#fff':C.text, border:`1.5px solid ${isInterstate?'#7c3aed':C.border}`, borderRadius:8, padding:'6px', fontSize:11, fontWeight:800, cursor:'pointer' }}>{isInterstate?'Inter-state':'Intra-state'}</button>
            </div>
          )}

          {/* Customer */}
          <div style={{ position:'relative', marginBottom:8 }}>
            <input value={custSearch} onChange={e=>{setCustSearch(e.target.value);setShowCustDrop(true)}} onFocus={()=>setShowCustDrop(true)}
              placeholder="🔍 Customer search..." style={{ ...inp, width:'100%', boxSizing:'border-box' }}/>
            {showCustDrop && custSearch && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, zIndex:10, maxHeight:150, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.1)' }}>
                {customers.filter(c=>c.name.toLowerCase().includes(custSearch.toLowerCase())).slice(0,5).map(c=>(
                  <div key={c.id} onClick={()=>{setSelCust(c);setCustSearch(c.name);setShowCustDrop(false)}} style={{ padding:'9px 14px', cursor:'pointer', fontSize:13, fontWeight:700, borderBottom:`1px solid ${C.gXL}`, display:'flex', justifyContent:'space-between' }}>
                    <span>{c.name}</span>
                    {c.balance>0 && <span style={{ color:C.red, fontSize:11 }}>₹{c.balance} baaki</span>}
                  </div>
                ))}
                <div onClick={()=>{setSelCust(null);setCustSearch('');setShowCustDrop(false)}} style={{ padding:'9px 14px', cursor:'pointer', fontSize:12, color:C.muted }}>Walk-in</div>
              </div>
            )}
          </div>

          {/* B2B GSTIN */}
          {invoiceType==='B2B' && isGstRegistered && (
            <input value={custGstin} onChange={e=>setCustGstin(e.target.value.toUpperCase())} placeholder="Customer GSTIN" style={{ ...inp, width:'100%', boxSizing:'border-box', marginBottom:8, fontSize:12 }}/>
          )}

          {selCust && (
            <div style={{ background:C.gXL, borderRadius:9, padding:'6px 12px', marginBottom:8, fontSize:12, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:800 }}>{selCust.name}</span>
              {selCust.balance>0 && <span style={{ color:C.red, fontWeight:700 }}>₹{selCust.balance} baaki</span>}
            </div>
          )}

          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, color:C.text, marginBottom:10 }}>
            🛒 Cart {cart.length>0 && <span style={{ background:C.g, color:'#fff', borderRadius:'50%', padding:'0 7px', fontSize:12 }}>{cart.length}</span>}
          </div>

          {cart.length===0
            ? <div style={{ textAlign:'center', padding:'24px 0', color:C.muted, fontSize:13 }}>← Item add karein</div>
            : (
              <>
                <div style={{ maxHeight:200, overflowY:'auto' }}>
                  {cartWithGST.map(i=>(
                    <div key={i.id} style={{ marginBottom:8, paddingBottom:8, borderBottom:`1px solid ${C.gXL}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:12 }}>{i.name}</div>
                          <div style={{ fontSize:10, color:C.muted }}>₹{i.basePrice} × {i.qty} = ₹{i.lineTotal.toFixed(0)}{i.gst_rate>0?` (+${i.gst_rate}% GST)`:''}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                          <button onClick={()=>updateQty(i.id,-1)} style={{ background:'#f3f4f6', border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', fontWeight:900 }}>−</button>
                          <span style={{ fontWeight:800, fontSize:12, minWidth:18, textAlign:'center' }}>{i.qty}</span>
                          <button onClick={()=>updateQty(i.id,1)} style={{ background:C.gXL, border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', fontWeight:900, color:C.g }}>+</button>
                          <button onClick={()=>removeItem(i.id)} style={{ background:C.redL, border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', color:C.red, fontWeight:900 }}>×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ borderTop:`2px dashed ${C.border}`, paddingTop:10, marginTop:4 }}>
                  {isGstRegistered && totalGst > 0 && (
                    <div style={{ fontSize:12, color:'#0369a1', marginBottom:4 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
                      {totalCgst>0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span>CGST:</span><span>₹{totalCgst.toFixed(2)}</span></div>}
                      {totalSgst>0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span>SGST:</span><span>₹{totalSgst.toFixed(2)}</span></div>}
                      {totalIgst>0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span>IGST:</span><span>₹{totalIgst.toFixed(2)}</span></div>}
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, marginBottom:10 }}>
                    <span>Total</span><span style={{ color:C.g }}>₹{grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Payment Mode */}
                  <div style={{ display:'flex', gap:5, marginBottom:10, flexWrap:'wrap' }}>
                    {[['cash','💵'],['upi','📱'],['bank','🏦'],['udhar','📒']].filter(([k])=>k==='udhar'||payModes[k]).map(([k,l])=>(
                      <button key={k} onClick={()=>setPayMode(k)} style={{ flex:1, minWidth:50, background:payMode===k?C.g:'#fff', color:payMode===k?'#fff':C.text, border:`1.5px solid ${payMode===k?C.g:C.border}`, borderRadius:8, padding:'6px', fontSize:13, fontWeight:800, cursor:'pointer' }}>{l}</button>
                    ))}
                  </div>

                  <button onClick={checkout} disabled={saving} style={{ width:'100%', background:saving?C.muted:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:13, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:saving?'not-allowed':'pointer' }}>
                    {saving ? '⏳ Saving...' : '✅ Bill Banao'}
                  </button>
                </div>
              </>
            )
          }
        </div>
      </div>
    </div>
  )
}
