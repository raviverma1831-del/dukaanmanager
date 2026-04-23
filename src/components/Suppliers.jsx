import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function Suppliers({ shop }) {
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [orderMode, setOrderMode] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [form, setForm] = useState({ name:'', phone:'', items_supplied:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [shop.id])

  const loadAll = async () => {
    const { data: s } = await supabase.from('suppliers').select('*').eq('shop_id', shop.id).order('name')
    const { data: p } = await supabase.from('products').select('*').eq('shop_id', shop.id)
    setSuppliers(s||[])
    setProducts(p||[])
  }

  const addSupplier = async () => {
    if (!form.name) return
    setSaving(true)
    await supabase.from('suppliers').insert({ ...form, shop_id:shop.id })
    setForm({ name:'', phone:'', items_supplied:'' }); setShowAdd(false); setSaving(false)
    loadAll()
  }

  const deleteS = async (id) => {
    if (!confirm('Delete karein?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    loadAll()
  }

  const startOrder = (s) => {
    const lowStock = products.filter(p=>!p.is_service && p.stock<=p.min_stock)
    setOrderMode(s)
    setOrderItems(lowStock.map(p=>({ ...p, orderQty: p.min_stock*3 })))
  }

  const orderText = () => {
    if (!orderMode) return ''
    const items = orderItems.filter(i=>i.orderQty>0)
    return `📦 *Order List*\n${shop.name} se\nDate: ${new Date().toLocaleDateString('en-IN')}\n━━━━━━━━━━━━━━━\n${items.map(i=>`• ${i.name}: ${i.orderQty} ${i.unit}`).join('\n')}\n━━━━━━━━━━━━━━━\nKripya jald deliver karein 🙏`
  }

  const saveOrder = async () => {
    if (!orderMode) return
    setSaving(true)
    const { data: pur } = await supabase.from('purchases').insert({
      shop_id: shop.id, supplier_id: orderMode.id, supplier_name: orderMode.name,
      total: 0, status: 'pending'
    }).select().single()
    if (pur) {
      const items = orderItems.filter(i=>i.orderQty>0)
      await supabase.from('purchase_items').insert(
        items.map(i=>({ purchase_id:pur.id, product_id:i.id, product_name:i.name, quantity:i.orderQty }))
      )
    }
    setSaving(false)
    setOrderMode(null)
    alert('Order saved! WhatsApp se bhi bhej sakte ho.')
  }

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe', width:'100%', boxSizing:'border-box', marginBottom:10 }
  const lowStock = products.filter(p=>!p.is_service&&p.stock<=p.min_stock)

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>🚚 Suppliers</div>

      {orderMode && (
        <div style={{ background:C.card, borderRadius:16, padding:20, marginBottom:18, border:`2px solid ${C.border}`, boxShadow:'0 4px 16px rgba(22,163,74,0.1)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:16, color:C.g, marginBottom:14 }}>📦 Order List — {orderMode.name}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
            {orderItems.map((item,i)=>(
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:C.gXL, borderRadius:10 }}>
                <span style={{ flex:1, fontWeight:700, fontSize:13 }}>{item.name}</span>
                <span style={{ fontSize:11, color:C.muted }}>Stock: {item.stock}</span>
                <input type="number" value={item.orderQty} onChange={e=>setOrderItems(oi=>oi.map((o,j)=>j===i?{...o,orderQty:+e.target.value}:o))} style={{ width:70, border:`1.5px solid ${C.border}`, borderRadius:8, padding:'5px 8px', fontSize:12, textAlign:'center', outline:'none' }}/>
                <span style={{ fontSize:11, color:C.muted }}>{item.unit}</span>
                <button onClick={()=>setOrderItems(oi=>oi.filter((_,j)=>j!==i))} style={{ background:C.redL, border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:C.red, fontWeight:700 }}>✕</button>
              </div>
            ))}
            {orderItems.length===0 && <div style={{ textAlign:'center', padding:16, color:C.muted }}>Sab stock OK hai!</div>}
          </div>
          {orderItems.length>0 && (
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#0369a1', fontWeight:700, marginBottom:6 }}>📱 WhatsApp Preview → {orderMode.phone}</div>
              <pre style={{ fontSize:12, color:'#333', margin:0, whiteSpace:'pre-wrap', fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }}>{orderText()}</pre>
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <a href={`https://wa.me/91${orderMode.phone}?text=${encodeURIComponent(orderText())}`} target="_blank" rel="noreferrer"
              style={{ flex:2, background:'#25d366', color:'#fff', borderRadius:12, padding:'12px', textAlign:'center', fontWeight:800, fontSize:14, textDecoration:'none', fontFamily:"'Baloo 2',cursive", display:'block' }}>
              📱 WhatsApp se Order Bhejo
            </a>
            <button onClick={saveOrder} disabled={saving} style={{ flex:1, background:C.g, color:'#fff', border:'none', borderRadius:12, padding:'12px', fontWeight:700, cursor:'pointer' }}>{saving?'Saving...':'💾 Save'}</button>
            <button onClick={()=>setOrderMode(null)} style={{ flex:1, background:'#f3f4f6', color:C.text, border:'none', borderRadius:12, padding:'12px', fontWeight:700, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {lowStock.length>0 && !orderMode && (
        <div style={{ background:C.redL, border:`1px solid #fecaca`, borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontWeight:800, color:C.red, fontSize:13, marginBottom:4 }}>⚠️ {lowStock.length} items reorder karne hain!</div>
          <div style={{ fontSize:12, color:'#991b1b' }}>{lowStock.map(p=>p.name).join(' • ')}</div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:16, color:C.text }}>Registered Suppliers</div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{ background:C.g, color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>+ Add Supplier</button>
      </div>

      {showAdd && (
        <div style={{ background:C.card, borderRadius:14, padding:18, marginBottom:16, border:`1.5px solid ${C.border}` }}>
          <input placeholder="Supplier/Dealer ka naam *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/>
          <input placeholder="WhatsApp Number" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={inp}/>
          <input placeholder="Kaunsa saman dete hain?" value={form.items_supplied} onChange={e=>setForm(f=>({...f,items_supplied:e.target.value}))} style={inp}/>
          <button onClick={addSupplier} disabled={saving} style={{ background:C.g, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontWeight:700, cursor:'pointer' }}>{saving?'Saving...':'Save'}</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {suppliers.map(s=>(
          <div key={s.id} style={{ background:C.card, borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:`1.5px solid #e8f5e9` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:16, color:C.text }}>{s.name}</div>
              <button onClick={()=>deleteS(s.id)} style={{ background:C.redL, border:'none', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:C.red, fontSize:11, fontWeight:700 }}>🗑️</button>
            </div>
            <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>📞 {s.phone||'N/A'}</div>
            {s.items_supplied && <div style={{ fontSize:12, color:C.g, marginTop:4, fontWeight:700 }}>📦 {s.items_supplied}</div>}
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={()=>startOrder(s)} style={{ flex:1, background:`linear-gradient(135deg,${C.gD},${C.g})`, color:'#fff', border:'none', borderRadius:10, padding:'9px', fontSize:12, fontWeight:700, cursor:'pointer' }}>📋 Order Banao</button>
              {s.phone && <a href={`https://wa.me/91${s.phone}`} target="_blank" rel="noreferrer" style={{ flex:1, background:'#25d366', color:'#fff', borderRadius:10, padding:'9px', textAlign:'center', fontWeight:700, fontSize:12, textDecoration:'none', fontFamily:"'DM Sans',sans-serif", display:'block' }}>💬 WhatsApp</a>}
            </div>
          </div>
        ))}
        {suppliers.length===0 && <div style={{ textAlign:'center', padding:40, color:C.muted, background:C.card, borderRadius:14 }}>Koi supplier nahi. "+ Add Supplier" karein.</div>}
      </div>
    </div>
  )
}
