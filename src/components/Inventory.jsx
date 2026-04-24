import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const GST_RATES = [
  { label:'Nil (0%)', value:0, type:'nil' },
  { label:'Exempt', value:0, type:'exempt' },
  { label:'5%', value:5, type:'taxable' },
  { label:'12%', value:12, type:'taxable' },
  { label:'18%', value:18, type:'taxable' },
  { label:'28%', value:28, type:'taxable' },
]

const HSN_SUGGESTIONS = {
  'sugar': '1701', 'atta': '1101', 'rice': '1006', 'dal': '0713',
  'oil': '1511', 'salt': '2501', 'biscuit': '1905', 'soap': '3401',
  'shampoo': '3305', 'cream': '3304', 'lipstick': '3304', 'bread': '1905',
  'cake': '1905', 'medicine': '3004', 'cement': '2523', 'paint': '3208',
  'saree': '5208', 'cloth': '5208',
}

export default function Inventory({ shop }) {
  const [products, setProducts] = useState([])
  const [cat, setCat] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const empty = {
    name:'', category:shop.categories?.[0]||'General',
    retail_price:'', wholesale_price:'', stock:'', unit:'pcs', min_stock:'5',
    is_service:false, hsn_code:'', gst_rate:0, gst_type:'taxable', price_includes_gst:false
  }
  const [form, setForm] = useState(empty)

  useEffect(() => { loadProducts() }, [shop.id])

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('name')
    setProducts(data||[])
  }

  const autoHsn = (name) => {
    const lower = name.toLowerCase()
    for (const [key, code] of Object.entries(HSN_SUGGESTIONS)) {
      if (lower.includes(key)) return code
    }
    return ''
  }

  const save = async () => {
    if (!form.name || !form.retail_price) return
    setSaving(true)
    const payload = {
      name: form.name, category: form.category,
      retail_price: +form.retail_price,
      wholesale_price: +form.wholesale_price || +form.retail_price,
      stock: +form.stock, unit: form.unit, min_stock: +form.min_stock,
      is_service: form.is_service, shop_id: shop.id,
      hsn_code: form.hsn_code,
      gst_rate: +form.gst_rate,
      gst_type: form.gst_type,
      price_includes_gst: form.price_includes_gst,
    }
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
    setForm({
      name: p.name, category: p.category||'General',
      retail_price: String(p.retail_price), wholesale_price: String(p.wholesale_price||''),
      stock: String(p.stock), unit: p.unit||'pcs', min_stock: String(p.min_stock||5),
      is_service: p.is_service||false,
      hsn_code: p.hsn_code||'', gst_rate: p.gst_rate||0,
      gst_type: p.gst_type||'taxable', price_includes_gst: p.price_includes_gst||false
    })
    setShowForm(true)
    window.scrollTo(0,0)
  }

  const cats = ['All', ...(shop.categories||['General'])]
  const filtered = products.filter(p =>
    (cat==='All' || p.category===cat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const lowCount = products.filter(p=>!p.is_service&&p.stock<=p.min_stock).length
  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe', width:'100%', boxSizing:'border-box' }

  const gstLabel = (p) => {
    if (p.gst_type==='exempt') return 'Exempt'
    if (p.gst_type==='nil') return 'Nil'
    if (p.gst_rate>0) return `${p.gst_rate}% GST`
    return '—'
  }

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>📦 Inventory</div>

      {lowCount>0 && (
        <div style={{ background:C.redL, border:`1px solid #fecaca`, borderRadius:12, padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <span style={{ fontWeight:700, color:C.red, fontSize:13 }}>{lowCount} items ka stock kam hai!</span>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search product..." style={{ ...inp, flex:'0 0 200px', width:'auto' }}/>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?C.g:'#fff', color:cat===c?'#fff':C.text, border:`1.5px solid ${cat===c?C.g:C.border}`, borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{c}</button>
          ))}
        </div>
        <button onClick={()=>{setEditing(null);setForm(empty);setShowForm(s=>!s)}} style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>+ Add Product</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:16, padding:24, marginBottom:16, border:`2px solid ${C.border}`, boxShadow:'0 4px 16px rgba(22,163,74,0.08)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, marginBottom:16, color:C.g }}>{editing?'✏️ Product Edit':'➕ Naya Product'}</div>

          {/* Basic Info */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4, color:C.text }}>Product Naam *</label>
              <input value={form.name} onChange={e=>{setForm(f=>({...f,name:e.target.value}));if(!editing&&!form.hsn_code)setForm(f=>({...f,name:e.target.value,hsn_code:autoHsn(e.target.value)}))}} placeholder="Naam" style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4, color:C.text }}>Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp}>
                {(shop.categories||['General']).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4, color:C.text }}>Retail Price ₹ *</label>
              <input type="number" value={form.retail_price} onChange={e=>setForm(f=>({...f,retail_price:e.target.value}))} placeholder="0" style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4, color:C.text }}>Wholesale Price ₹</label>
              <input type="number" value={form.wholesale_price} onChange={e=>setForm(f=>({...f,wholesale_price:e.target.value}))} placeholder="0" style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4, color:C.text }}>Stock</label>
              <input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} placeholder="0" style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4, color:C.text }}>Unit</label>
              <input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="pcs/kg/btl" style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4, color:C.text }}>Min Stock Alert</label>
              <input type="number" value={form.min_stock} onChange={e=>setForm(f=>({...f,min_stock:e.target.value}))} placeholder="5" style={inp}/>
            </div>
          </div>

          {/* GST Section */}
          <div style={{ background:'#f0f9ff', borderRadius:12, padding:'16px', marginBottom:14, border:'1px solid #bae6fd' }}>
            <div style={{ fontWeight:800, fontSize:13, color:'#0369a1', marginBottom:12 }}>📋 GST Settings</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
              <div>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>HSN Code</label>
                <input value={form.hsn_code} onChange={e=>setForm(f=>({...f,hsn_code:e.target.value}))} placeholder="Auto ya manual (e.g. 1701)" style={inp}/>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>AI auto-suggest karta hai</div>
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>GST Rate</label>
                <select value={form.gst_rate+'_'+form.gst_type} onChange={e=>{const [rate,type]=e.target.value.split('_');setForm(f=>({...f,gst_rate:+rate,gst_type:type}))}} style={inp}>
                  {GST_RATES.map(r=><option key={r.label} value={r.value+'_'+r.type}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
                <input type="checkbox" id="priceInclGst" checked={form.price_includes_gst} onChange={e=>setForm(f=>({...f,price_includes_gst:e.target.checked}))}/>
                <label htmlFor="priceInclGst" style={{ fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  Price GST included hai
                </label>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
                <input type="checkbox" id="isSvc" checked={form.is_service} onChange={e=>setForm(f=>({...f,is_service:e.target.checked}))}/>
                <label htmlFor="isSvc" style={{ fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  Service hai (stock nahi)
                </label>
              </div>
            </div>
            {form.gst_rate > 0 && form.retail_price && (
              <div style={{ marginTop:12, background:'#fff', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
                <b>Preview:</b> Price ₹{form.retail_price} {form.price_includes_gst
                  ? `→ Taxable: ₹${(+form.retail_price/(1+form.gst_rate/100)).toFixed(2)} + GST: ₹${(+form.retail_price - +form.retail_price/(1+form.gst_rate/100)).toFixed(2)}`
                  : `+ ${form.gst_rate}% GST = Total: ₹${(+form.retail_price*(1+form.gst_rate/100)).toFixed(2)}`
                }
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={save} disabled={saving} style={{ background:saving?C.muted:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'10px 24px', fontWeight:800, fontSize:14, cursor:saving?'not-allowed':'pointer', fontFamily:"'Baloo 2',cursive" }}>
              {saving?'Saving...':'💾 Save'}
            </button>
            <button onClick={()=>{setShowForm(false);setEditing(null)}} style={{ background:'#f3f4f6', color:C.text, border:'none', borderRadius:10, padding:'10px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:14, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0fdf4' }}>
                {['Product','Category','HSN','Retail','Wholesale','GST','Stock','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'11px 12px', textAlign:'left', fontWeight:800, color:C.gD, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i)=>(
                <tr key={p.id} style={{ borderTop:`1px solid ${C.gXL}`, background:i%2===0?'#fafffe':'#fff' }}>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:C.text, maxWidth:160 }}>{p.name}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ background:C.gXL, color:C.gL, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{p.category}</span>
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:C.muted }}>{p.hsn_code||'—'}</td>
                  <td style={{ padding:'10px 12px', fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.g }}>₹{p.retail_price}</td>
                  <td style={{ padding:'10px 12px', fontFamily:"'Baloo 2',cursive", fontWeight:700, color:C.gold }}>₹{p.wholesale_price||p.retail_price}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ background:'#f0f9ff', color:'#0369a1', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{gstLabel(p)}</span>
                  </td>
                  <td style={{ padding:'10px 12px', fontWeight:700 }}>{p.is_service?'∞':p.stock+' '+p.unit}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ background:p.is_service?C.blueL:p.stock===0?C.redL:p.stock<=p.min_stock?C.goldL:C.gXL, color:p.is_service?C.blue:p.stock===0?C.red:p.stock<=p.min_stock?C.gold:C.gL, borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700 }}>
                      {p.is_service?'Service':p.stock===0?'Out':p.stock<=p.min_stock?'Low':'OK'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={()=>editP(p)} style={{ background:C.goldL, border:'none', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.gold }}>✏️ Edit</button>
                      <button onClick={()=>deleteP(p.id)} style={{ background:C.redL, border:'none', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.red }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:30, color:C.muted }}>Koi product nahi mila</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
