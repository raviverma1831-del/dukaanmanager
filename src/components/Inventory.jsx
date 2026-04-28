import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const GST_RATES = [
  { label:'Nil (0%)',  value:0,  type:'nil' },
  { label:'Exempt',   value:0,  type:'exempt' },
  { label:'5%',       value:5,  type:'taxable' },
  { label:'12%',      value:12, type:'taxable' },
  { label:'18%',      value:18, type:'taxable' },
  { label:'28%',      value:28, type:'taxable' },
]

const BASE_UNITS = [
  { value:'pcs',   label:'Pcs (Pieces)' },
  { value:'nos',   label:'Nos (Numbers)' },
  { value:'kg',    label:'Kg (Kilogram)' },
  { value:'g',     label:'G (Gram)' },
  { value:'l',     label:'L (Litre)' },
  { value:'ml',    label:'ML (Millilitre)' },
  { value:'m',     label:'M (Metre)' },
  { value:'cm',    label:'CM (Centimetre)' },
  { value:'box',   label:'Box' },
  { value:'pkt',   label:'Pkt (Packet)' },
  { value:'btl',   label:'Btl (Bottle)' },
  { value:'tin',   label:'Tin' },
  { value:'bag',   label:'Bag' },
  { value:'strip', label:'Strip' },
  { value:'set',   label:'Set' },
  { value:'pair',  label:'Pair' },
  { value:'roll',  label:'Roll' },
  { value:'doz',   label:'Doz (Dozen=12)' },
  { value:'svc',   label:'Svc (Service)' },
  { value:'other', label:'Other (Custom)' },
]

const HSN_SUGGESTIONS = {
  'sugar':'1701','atta':'1101','rice':'1006','dal':'0713','oil':'1511',
  'salt':'2501','biscuit':'1905','soap':'3401','shampoo':'3305','cream':'3304',
  'lipstick':'3304','bread':'1905','cake':'1905','medicine':'3004',
  'cement':'2523','paint':'3208','saree':'5208','cloth':'5208',
}

export default function Inventory({ shop }) {
  const [products, setProducts] = useState([])
  const [cat, setCat] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const emptyForm = {
    name:'', category:shop.categories?.[0]||'General',
    retail_price:'', wholesale_price:'', stock:'', 
    unit:'pcs', custom_unit:'',
    alt_unit:'', alt_unit_custom:'', alt_unit_qty:'',
    min_stock:'5', is_service:false,
    hsn_code:'', gst_rate:0, gst_type:'taxable', price_includes_gst:false
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadProducts() }, [shop.id])

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('name')
    setProducts(data || [])
  }

  const autoHsn = (name) => {
    const lower = name.toLowerCase()
    for (const [key, code] of Object.entries(HSN_SUGGESTIONS)) {
      if (lower.includes(key)) return code
    }
    return ''
  }

  const getFinalUnit = () => form.unit === 'other' ? form.custom_unit : form.unit
  const getFinalAltUnit = () => form.alt_unit === 'other' ? form.alt_unit_custom : form.alt_unit

  const save = async () => {
    if (!form.name || !form.retail_price) return
    setSaving(true)
    const finalUnit = getFinalUnit()
    const finalAltUnit = getFinalAltUnit()
    const payload = {
      name: form.name, category: form.category,
      retail_price: +form.retail_price,
      wholesale_price: +form.wholesale_price || +form.retail_price,
      stock: +form.stock, 
      unit: finalUnit,
      alt_unit: finalAltUnit || null,
      alt_unit_qty: form.alt_unit_qty ? +form.alt_unit_qty : null,
      min_stock: +form.min_stock,
      is_service: form.is_service, shop_id: shop.id,
      hsn_code: form.hsn_code,
      gst_rate: +form.gst_rate, gst_type: form.gst_type,
      price_includes_gst: form.price_includes_gst,
    }
    if (editing) {
      await supabase.from('products').update(payload).eq('id', editing)
    } else {
      await supabase.from('products').insert(payload)
    }
    setForm(emptyForm); setEditing(null); setShowForm(false); setSaving(false)
    loadProducts()
  }

  const deleteP = async (id) => {
    if (!confirm('Yeh product delete karein?')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  const editP = (p) => {
    setEditing(p.id)
    // Check if unit is in BASE_UNITS
    const unitInList = BASE_UNITS.find(u => u.value === p.unit)
    const altUnitInList = BASE_UNITS.find(u => u.value === p.alt_unit)
    setForm({
      name: p.name, category: p.category || 'General',
      retail_price: String(p.retail_price), wholesale_price: String(p.wholesale_price || ''),
      stock: String(p.stock), 
      unit: unitInList ? p.unit : 'other',
      custom_unit: unitInList ? '' : (p.unit || ''),
      alt_unit: p.alt_unit ? (altUnitInList ? p.alt_unit : 'other') : '',
      alt_unit_custom: altUnitInList ? '' : (p.alt_unit || ''),
      alt_unit_qty: String(p.alt_unit_qty || ''),
      min_stock: String(p.min_stock || 5),
      is_service: p.is_service || false,
      hsn_code: p.hsn_code || '', gst_rate: p.gst_rate || 0,
      gst_type: p.gst_type || 'taxable', price_includes_gst: p.price_includes_gst || false
    })
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  const cats = ['All', ...(shop.categories || ['General'])]
  const filtered = products.filter(p =>
    (cat === 'All' || p.category === cat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const lowCount = products.filter(p => !p.is_service && p.stock <= p.min_stock).length
  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe', width:'100%', boxSizing:'border-box' }

  const gstLabel = (p) => {
    if (p.gst_type === 'exempt') return 'Exempt'
    if (p.gst_type === 'nil') return 'Nil'
    if (p.gst_rate > 0) return `${p.gst_rate}% GST`
    return '—'
  }

  const unitDisplay = (p) => {
    if (!p.alt_unit || !p.alt_unit_qty) return p.unit
    return `${p.unit} (1${p.unit}=${p.alt_unit_qty}${p.alt_unit})`
  }

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>📦 Inventory</div>

      {lowCount > 0 && (
        <div style={{ background:C.redL, border:`1px solid #fecaca`, borderRadius:12, padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <span style={{ fontWeight:700, color:C.red, fontSize:13 }}>{lowCount} items ka stock kam hai!</span>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." style={{ ...inp, flex:'0 0 200px', width:'auto' }}/>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?C.g:'#fff', color:cat===c?'#fff':C.text, border:`1.5px solid ${cat===c?C.g:C.border}`, borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{c}</button>
          ))}
        </div>
        <button onClick={()=>{setEditing(null);setForm(emptyForm);setShowForm(s=>!s)}} style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
          {showForm ? '✕ Band Karo' : '+ Add Product'}
        </button>
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:16, padding:24, marginBottom:16, border:`2px solid ${C.border}`, boxShadow:'0 4px 16px rgba(22,163,74,0.08)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, marginBottom:16, color:C.g }}>{editing ? '✏️ Product Edit' : '➕ Naya Product'}</div>

          {/* Basic fields */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Product Naam *</label>
              <input value={form.name} onChange={e=>{
                const val = e.target.value
                setForm(f => ({ ...f, name:val, hsn_code: f.hsn_code || autoHsn(val) }))
              }} placeholder="Naam" style={inp}/>
            </div>

            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp}>
                {(shop.categories||['General']).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Retail Price ₹ *</label>
              <input type="number" value={form.retail_price} onChange={e=>setForm(f=>({...f,retail_price:e.target.value}))} placeholder="0" style={inp}/>
            </div>

            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Wholesale Price ₹</label>
              <input type="number" value={form.wholesale_price} onChange={e=>setForm(f=>({...f,wholesale_price:e.target.value}))} placeholder="0" style={inp}/>
            </div>

            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Stock</label>
              <input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} placeholder="0" style={inp}/>
            </div>

            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Min Stock Alert</label>
              <input type="number" value={form.min_stock} onChange={e=>setForm(f=>({...f,min_stock:e.target.value}))} placeholder="5" style={inp}/>
            </div>
          </div>

          {/* ── UNIT SYSTEM ── */}
          <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:'#0369a1', marginBottom:12 }}>📏 Unit & Conversion System</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>

              {/* Primary Unit */}
              <div>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Primary Unit (Stock) *</label>
                <select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value,custom_unit:''}))} style={inp}>
                  {BASE_UNITS.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                {form.unit === 'other' && (
                  <input value={form.custom_unit} onChange={e=>setForm(f=>({...f,custom_unit:e.target.value}))}
                    placeholder="Unit ka naam likhein..." style={{ ...inp, marginTop:6 }}/>
                )}
              </div>

              {/* Alt Unit */}
              <div>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Alternate Unit (Optional)</label>
                <select value={form.alt_unit} onChange={e=>setForm(f=>({...f,alt_unit:e.target.value,alt_unit_custom:''}))} style={inp}>
                  <option value="">— No Alternate Unit —</option>
                  {BASE_UNITS.filter(u=>u.value!=='svc').map(u=><option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                {form.alt_unit === 'other' && (
                  <input value={form.alt_unit_custom} onChange={e=>setForm(f=>({...f,alt_unit_custom:e.target.value}))}
                    placeholder="Alt unit naam..." style={{ ...inp, marginTop:6 }}/>
                )}
              </div>

              {/* Conversion Qty */}
              {form.alt_unit && (
                <div>
                  <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>
                    1 {getFinalUnit()} = ? {getFinalAltUnit()}
                  </label>
                  <input type="number" value={form.alt_unit_qty} onChange={e=>setForm(f=>({...f,alt_unit_qty:e.target.value}))}
                    placeholder="Jaise 12 (agar 1 pkt = 12 pcs)" style={inp}/>
                </div>
              )}
            </div>

            {/* Preview */}
            {form.alt_unit && form.alt_unit_qty && (
              <div style={{ marginTop:10, background:'#fff', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#0369a1', fontWeight:700 }}>
                ✅ Conversion: 1 {getFinalUnit()} = {form.alt_unit_qty} {getFinalAltUnit()}
                {form.retail_price && ` | Per ${getFinalAltUnit()}: ₹${(+form.retail_price / +form.alt_unit_qty).toFixed(2)}`}
              </div>
            )}

            {/* Examples */}
            <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'#0369a1', background:'#e0f2fe', borderRadius:20, padding:'2px 10px' }}>📦 1 Box = 12 Pcs</span>
              <span style={{ fontSize:11, color:'#0369a1', background:'#e0f2fe', borderRadius:20, padding:'2px 10px' }}>🛍️ 1 Pkt = 500 G</span>
              <span style={{ fontSize:11, color:'#0369a1', background:'#e0f2fe', borderRadius:20, padding:'2px 10px' }}>🍶 1 L = 1000 ML</span>
              <span style={{ fontSize:11, color:'#0369a1', background:'#e0f2fe', borderRadius:20, padding:'2px 10px' }}>👗 1 Set = 3 Pcs</span>
            </div>
          </div>

          {/* GST Section */}
          <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:'#0369a1', marginBottom:12 }}>📋 GST Settings</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
              <div>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>HSN Code</label>
                <input value={form.hsn_code} onChange={e=>setForm(f=>({...f,hsn_code:e.target.value}))} placeholder="Auto ya manual" style={inp}/>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>AI naam se auto-suggest karta hai</div>
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>GST Rate</label>
                <select value={form.gst_rate+'_'+form.gst_type} onChange={e=>{
                  const [rate,type] = e.target.value.split('_')
                  setForm(f=>({...f,gst_rate:+rate,gst_type:type}))
                }} style={inp}>
                  {GST_RATES.map(r=><option key={r.label} value={r.value+'_'+r.type}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:18 }}>
                <input type="checkbox" id="priceGst" checked={form.price_includes_gst} onChange={e=>setForm(f=>({...f,price_includes_gst:e.target.checked}))}/>
                <label htmlFor="priceGst" style={{ fontWeight:700, fontSize:12, cursor:'pointer' }}>Price GST included hai</label>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:18 }}>
                <input type="checkbox" id="isSvc" checked={form.is_service} onChange={e=>setForm(f=>({...f,is_service:e.target.checked}))}/>
                <label htmlFor="isSvc" style={{ fontWeight:700, fontSize:12, cursor:'pointer' }}>Service hai (stock nahi)</label>
              </div>
            </div>
            {form.gst_rate > 0 && form.retail_price && (
              <div style={{ marginTop:10, background:'#fff', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
                <b>Preview:</b> ₹{form.retail_price} {form.price_includes_gst
                  ? `→ Taxable: ₹${(+form.retail_price/(1+form.gst_rate/100)).toFixed(2)} + GST: ₹${(+form.retail_price - +form.retail_price/(1+form.gst_rate/100)).toFixed(2)}`
                  : `+ ${form.gst_rate}% GST = Total: ₹${(+form.retail_price*(1+form.gst_rate/100)).toFixed(2)}`
                }
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={save} disabled={saving} style={{ background:saving?C.muted:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'10px 24px', fontWeight:800, fontSize:14, cursor:saving?'not-allowed':'pointer', fontFamily:"'Baloo 2',cursive" }}>
              {saving ? '⏳ Saving...' : '💾 Save'}
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
                {['Product','Category','HSN','Retail','Wholesale','GST','Unit','Stock','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'11px 12px', textAlign:'left', fontWeight:800, color:C.gD, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i)=>(
                <tr key={p.id} style={{ borderTop:`1px solid ${C.gXL}`, background:i%2===0?'#fafffe':'#fff' }}>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:C.text, maxWidth:160 }}>{p.name}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ background:C.gXL, color:C.gL, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{p.category}</span></td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:C.muted }}>{p.hsn_code||'—'}</td>
                  <td style={{ padding:'10px 12px', fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.g }}>₹{p.retail_price}</td>
                  <td style={{ padding:'10px 12px', fontFamily:"'Baloo 2',cursive", fontWeight:700, color:C.gold }}>₹{p.wholesale_price||p.retail_price}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ background:'#f0f9ff', color:'#0369a1', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{gstLabel(p)}</span></td>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:'#0369a1', fontSize:11 }}>
                    {unitDisplay(p)}
                    {p.alt_unit && p.alt_unit_qty && (
                      <div style={{ fontSize:10, color:C.muted }}>1{p.unit}={p.alt_unit_qty}{p.alt_unit}</div>
                    )}
                  </td>
                  <td style={{ padding:'10px 12px', fontWeight:700 }}>{p.is_service?'∞':p.stock+' '+p.unit}</td>
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
              {filtered.length===0 && <tr><td colSpan={10} style={{ textAlign:'center', padding:30, color:C.muted }}>Koi product nahi mila</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
