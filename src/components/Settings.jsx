import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { C, BIZ_TYPES } from '../lib/constants.js'

export default function Settings({ shop, onUpdate }) {
  const [form, setForm] = useState({
    name: shop.name || '',
    owner_name: shop.owner_name || '',
    phone: shop.phone || '',
    city: shop.city || '',
    biz_label: shop.biz_label || '',
    biz_emoji: shop.biz_emoji || '🏪',
    gst_number: shop.gst_number || '',
    gst_type: shop.gst_type || 'unregistered',
    gst_scheme: shop.gst_scheme || 'regular',
    address: shop.address || '',
    pay_modes: shop.pay_modes || { cash:true, upi:true, bank:false },
    cust_types: shop.cust_types || { retail:true, wholesale:false },
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('basic')

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 14px', fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif", width:'100%', boxSizing:'border-box', background:'#fafffe' }

  const save = async () => {
    setSaving(true)
    const { data, error } = await supabase.from('shops').update({
      name: form.name,
      owner_name: form.owner_name,
      phone: form.phone,
      city: form.city,
      biz_label: form.biz_label,
      biz_emoji: form.biz_emoji,
      gst_number: form.gst_number,
      gst_type: form.gst_type,
      gst_scheme: form.gst_scheme,
      address: form.address,
      pay_modes: form.pay_modes,
      cust_types: form.cust_types,
    }).eq('id', shop.id).select().single()

    setSaving(false)
    if (!error && data) {
      setSaved(true)
      onUpdate(data)
      setTimeout(() => setSaved(false), 3000)
    } else {
      alert('Error: ' + error?.message)
    }
  }

  const Section = ({ id, label, emoji }) => (
    <button onClick={() => setActiveSection(id)} style={{
      background: activeSection===id ? C.g : '#fff',
      color: activeSection===id ? '#fff' : C.text,
      border: `1.5px solid ${activeSection===id ? C.g : C.border}`,
      borderRadius: 10, padding: '8px 16px', fontSize: 13,
      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
    }}>{emoji} {label}</button>
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:20 }}>⚙️ Shop Settings</div>

      {/* Section Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <Section id="basic"   emoji="🏪" label="Basic Info" />
        <Section id="gst"     emoji="📋" label="GST Settings" />
        <Section id="payment" emoji="💳" label="Payment & Customers" />
      </div>

      <div style={{ background:'#fff', borderRadius:16, padding:24, boxShadow:'0 2px 16px rgba(0,0,0,0.06)' }}>

        {/* BASIC INFO */}
        {activeSection === 'basic' && (
          <div style={{ display:'grid', gap:14 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.g, marginBottom:4 }}>🏪 Dukaan ki Basic Info</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>Dukaan ka Naam *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Sharma General Store" style={inp}/>
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>Malik ka Naam *</label>
                <input value={form.owner_name} onChange={e=>setForm(f=>({...f,owner_name:e.target.value}))} placeholder="Ramesh Sharma" style={inp}/>
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>WhatsApp Number</label>
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="9876543210" style={inp}/>
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>Shehar</label>
                <input value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="Lucknow" style={inp}/>
              </div>
            </div>

            <div>
              <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>Poora Address</label>
              <textarea value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Shop no., Street, Area, City, State - PIN" rows={3} style={{ ...inp, resize:'vertical' }}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:12 }}>
              <div>
                <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>Emoji</label>
                <input value={form.biz_emoji} onChange={e=>setForm(f=>({...f,biz_emoji:e.target.value}))} style={{ ...inp, textAlign:'center', fontSize:22 }}/>
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>Business Type</label>
                <input value={form.biz_label} onChange={e=>setForm(f=>({...f,biz_label:e.target.value}))} placeholder="Kirana Store" style={inp}/>
              </div>
            </div>
          </div>
        )}

        {/* GST SETTINGS */}
        {activeSection === 'gst' && (
          <div style={{ display:'grid', gap:16 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.g, marginBottom:4 }}>📋 GST Settings</div>

            <div>
              <label style={{ fontWeight:700, fontSize:13, color:C.text, display:'block', marginBottom:8 }}>GST Registration Status</label>
              <div style={{ display:'flex', gap:10 }}>
                {[['unregistered','❌ Unregistered'],['registered','✅ Registered']].map(([v,l])=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,gst_type:v}))} style={{ flex:1, background:form.gst_type===v?C.g:'#fff', color:form.gst_type===v?'#fff':C.text, border:`1.5px solid ${form.gst_type===v?C.g:C.border}`, borderRadius:10, padding:'10px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
                ))}
              </div>
            </div>

            {form.gst_type === 'registered' && (
              <>
                <div>
                  <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:5 }}>GSTIN Number</label>
                  <input value={form.gst_number} onChange={e=>setForm(f=>({...f,gst_number:e.target.value.toUpperCase()}))} placeholder="22AAAAA0000A1Z5" style={inp}/>
                  <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>15 digit GSTIN number</div>
                </div>

                <div>
                  <label style={{ fontWeight:700, fontSize:13, color:C.text, display:'block', marginBottom:8 }}>GST Scheme</label>
                  <div style={{ display:'flex', gap:10 }}>
                    {[['regular','📊 Regular Scheme'],['composition','💡 Composition Scheme']].map(([v,l])=>(
                      <button key={v} onClick={()=>setForm(f=>({...f,gst_scheme:v}))} style={{ flex:1, background:form.gst_scheme===v?C.blue:'#fff', color:form.gst_scheme===v?'#fff':C.text, border:`1.5px solid ${form.gst_scheme===v?C.blue:C.border}`, borderRadius:10, padding:'10px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
                    ))}
                  </div>
                  <div style={{ marginTop:8, background:C.gXL, borderRadius:10, padding:'10px 14px', fontSize:12, color:C.gD }}>
                    {form.gst_scheme === 'regular'
                      ? '📊 Regular: GST collect karo aur file karo. CGST+SGST ya IGST lage.'
                      : '💡 Composition: 1-6% flat tax. Input credit nahi milti. Turnover limit ₹1.5Cr.'}
                  </div>
                </div>
              </>
            )}

            <div style={{ background:'#f0f9ff', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#0369a1', marginBottom:8 }}>📌 GST Rates Available</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['Nil (0%)','Exempt','5%','12%','18%','28%'].map(r=>(
                  <span key={r} style={{ background:'#e0f2fe', color:'#0369a1', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700 }}>{r}</span>
                ))}
              </div>
              <div style={{ fontSize:12, color:'#0284c7', marginTop:8 }}>Product add karte waqt har item pe GST rate set hogi</div>
            </div>
          </div>
        )}

        {/* PAYMENT & CUSTOMERS */}
        {activeSection === 'payment' && (
          <div style={{ display:'grid', gap:16 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.g, marginBottom:4 }}>💳 Payment Modes</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[['cash','💵 Cash'],['upi','📱 UPI/QR'],['bank','🏦 Bank Transfer']].map(([k,l])=>(
                <button key={k} onClick={()=>setForm(f=>({...f,pay_modes:{...f.pay_modes,[k]:!f.pay_modes[k]}}))} style={{ background:form.pay_modes[k]?C.g:'#fff', color:form.pay_modes[k]?'#fff':C.text, border:`1.5px solid ${form.pay_modes[k]?C.g:C.border}`, borderRadius:20, padding:'8px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
              ))}
            </div>

            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.g }}>👥 Customer Types</div>
            <div style={{ display:'flex', gap:10 }}>
              {[['retail','🛒 Retail'],['wholesale','📦 Wholesale']].map(([k,l])=>(
                <button key={k} onClick={()=>setForm(f=>({...f,cust_types:{...f.cust_types,[k]:!f.cust_types[k]}}))} style={{ background:form.cust_types[k]?C.g:'#fff', color:form.cust_types[k]?'#fff':C.text, border:`1.5px solid ${form.cust_types[k]?C.g:C.border}`, borderRadius:20, padding:'8px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
              ))}
            </div>

            <div style={{ background:C.gXL, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontWeight:800, fontSize:13, color:C.gD, marginBottom:6 }}>💡 B2B & B2C Support</div>
              <div style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>
                ✅ Retail = B2C (end customers)<br/>
                ✅ Wholesale = B2B (dealers/distributors)<br/>
                ✅ Dono ke liye alag pricing set ho sakti hai
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Save Button */}
      <div style={{ marginTop:20, display:'flex', gap:12, alignItems:'center' }}>
        <button onClick={save} disabled={saving} style={{ background:saving?C.muted:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'13px 32px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:saving?'not-allowed':'pointer', boxShadow:'0 4px 16px rgba(22,163,74,0.3)' }}>
          {saving ? '⏳ Saving...' : '💾 Save Changes'}
        </button>
        {saved && <span style={{ color:C.g, fontWeight:700, fontSize:14 }}>✅ Saved successfully!</span>}
      </div>
    </div>
  )
}
