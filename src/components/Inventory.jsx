import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function Inventory({ shop }) {
  const [products, setProducts] = useState([])
  const [cat, setCat] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const empty = { name:'', category:shop.categories?.[0]||'General', retail_price:'', wholesale_price:'', stock:'', unit:'pcs', min_stock:'5', is_service:false }
  const [form, setForm] = useState(empty)

  useEffect(() => { loadProducts() }, [shop.id])

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('name')
    setProducts(data||[])
  }

  const save = async () => {
    if (!form.name || !form.retail_price) return
    setSaving(true)
    const payload = { ...form, retail_price:+form.retail_price, wholesale_price:+form.wholesale_price||+form.retail_price, stock:+form.stock, min_stock:+form.min_stock, shop_id:shop.id }
    if (editing) {
      await supabase.from('products').update(payload).eq('id', editing)
    } else {
      await supabase.from('products').insert(payload)
    }
    setForm(empty); setEditing(null); setShowForm(false); setSaving(false)
    loadProducts()
  }

  const deleteP = async (id) => {
    if (!confirm('Yeh product delete karein?')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  const editP = (p) => {
    setEditing(p.id)
    setForm({ name:p.name, category:p.category||'General', retail_price:String(p.retail_price), wholesale_price:String(p.wholesale_price||''), stock:String(p.stock), unit:p.unit||'pcs', min_stock:String(p.min_stock||5), is_service:p.is_service||false })
    setShowForm(true)
  }

  const cats = ['All', ...(shop.categories||['General'])]
  const filtered = products.filter(p => cat==='All' || p.category===cat)
  const lowCount = products.filter(p=>!p.is_service&&p.stock<=p.min_stock).length
  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe', width:'100%', boxSizing:'border-box' }

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>📦 Inventory</div>

      {lowCount>0 && <div style={{ background:C.redL, border:`1px solid #fecaca`, borderRadius:12, padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>⚠️</span>
        <span style={{ fontWeight:700, color:C.red, fontSize:13 }}>{lowCount} items ka stock kam hai! Jaldi order karein.</span>
      </div>}

      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?C.g:'#fff', color:cat===c?'#fff':C.text, border:`1.5px solid ${cat===c?C.g:C.border}`, borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{c}</button>)}
        </div>
        <button onClick={()=>{setEditing(null);setForm(empty);setShowForm(s=>!s)}} style={{ background:C.g, color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>+ Add Product</button>
      </div>

      {showForm && (
        <div style={{ background:C.card, borderRadius:16, padding:20, marginBottom:16, border:`2px solid ${C.border}`, boxShadow:'0 4px 16px rgba(22,163,74,0.08)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, marginBottom:14, color:C.g }}>{editing ? '✏️ Product Edit' : '➕ Naya Product'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
            <div><label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:4 }}>Product Naam *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Naam" style={inp}/></div>
            <div><label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:4 }}>Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp}>
                {(shop.categories||['General']).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:4 }}>Retail Price ₹ *</label><input type="number" value={form.retail_price} onChange={e=>setForm(f=>({...f,retail_price:e.target.value}))} placeholder="0" style={inp}/></div>
            <div><label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:4 }}>Wholesale Price ₹</label><input type="number" value={form.wholesale_price} onChange={e=>setForm(f=>({...f,wholesale_price:e.target.value}))} placeholder="0" style={inp}/></div>
            <div><label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:4 }}>Stock</label><input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} placeholder="0" style={inp}/></div>
            <div><label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:4 }}>Unit</label><input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="pcs/kg/btl" style={inp}/></div>
            <div><label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:4 }}>Min Stock Alert</label><input type="number" value={form.min_stock} onChange={e=>setForm(f=>({...f,min_stock:e.target.value}))} placeholder="5" style={inp}/></div>
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
              <input type="checkbox" id="svc" checked={form.is_service} onChange={e=>setForm(f=>({...f,is_service:e.target.checked}))} />
              <label htmlFor="svc" style={{ fontWeight:700, fontSize:13, cursor:'pointer' }}>Service hai (stock track na karo)</label>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button onClick={save} disabled={saving} style={{ background:C.g, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{saving?'Saving...':'💾 Save'}</button>
            <button onClick={()=>{setShowForm(false);setEditing(null)}} style={{ background:'#f3f4f6', color:C.text, border:'none', borderRadius:10, padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background:C.card, borderRadius:14, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0fdf4' }}>
                {['Product','Category','Retail','Wholesale','Stock','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'11px 12px', textAlign:'left', fontWeight:800, color:C.gD, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i)=>(
                <tr key={p.id} style={{ borderTop:`1px solid ${C.gXL}`, background:i%2===0?'#fafffe':'#fff' }}>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:C.text }}>{p.name}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ background:C.gXL, color:C.gL, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{p.category}</span></td>
                  <td style={{ padding:'10px 12px', fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.g }}>₹{p.retail_price}</td>
                  <td style={{ padding:'10px 12px', fontFamily:"'Baloo 2',cursive", fontWeight:700, color:C.gold }}>₹{p.wholesale_price||p.retail_price}</td>
                  <td style={{ padding:'10px 12px', fontWeight:700 }}>{p.is_service?'Service':p.stock+' '+p.unit}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ background:p.is_service?C.blueL:p.stock===0?C.redL:p.stock<=p.min_stock?C.goldL:C.gXL, color:p.is_service?C.blue:p.stock===0?C.red:p.stock<=p.min_stock?C.gold:C.gL, borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700 }}>
                      {p.is_service?'Service':p.stock===0?'Out':p.stock<=p.min_stock?'Low':'OK'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={()=>editP(p)} style={{ background:C.goldL, border:'none', borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.gold }}>✏️</button>
                      <button onClick={()=>deleteP(p.id)} style={{ background:C.redL, border:'none', borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.red }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:30, color:C.muted }}>Koi product nahi mila</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
