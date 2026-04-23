import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { BIZ_TYPES, PRESET_CATEGORIES, PRESET_PRODUCTS, C } from '../lib/constants.js'

export default function Onboarding({ userId, onComplete }) {
  const [step, setStep] = useState(1)
  const [bizType, setBizType] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [payModes, setPayModes] = useState({ cash:true, upi:true, bank:false })
  const [custTypes, setCustTypes] = useState({ retail:true, wholesale:false })
  const [loading, setLoading] = useState(false)

  const selBiz = BIZ_TYPES.find(b=>b.id===bizType)
  const inp = { width:'100%', border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', background:'#fafffe', marginBottom:12 }

  const finish = async () => {
    setLoading(true)
    const cats = bizType==='custom' ? ['Category 1','Category 2','Category 3'] : PRESET_CATEGORIES[bizType]||['General']
    const bizLabel = bizType==='custom' ? customLabel : selBiz?.label

    // Create shop
    const { data: shopData, error: shopErr } = await supabase.from('shops').insert({
      owner_id: userId,
      name: shopName,
      biz_type: bizType,
      biz_emoji: selBiz?.emoji||'🏪',
      biz_label: bizLabel,
      owner_name: ownerName,
      phone, city,
      categories: cats,
      pay_modes: payModes,
      cust_types: custTypes,
    }).select().single()

    if (shopErr) { alert('Error: '+shopErr.message); setLoading(false); return }

    // Insert preset products
    const prods = PRESET_PRODUCTS[bizType]||[]
    if (prods.length > 0) {
      await supabase.from('products').insert(
        prods.map(p => ({ ...p, shop_id: shopData.id }))
      )
    }

    onComplete(shopData)
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(135deg, ${C.gD} 0%, ${C.g} 60%, #0d9488 100%)`, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <div style={{ background:C.card, borderRadius:24, padding:'36px 32px', maxWidth:580, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>
        {/* Steps */}
        <div style={{ display:'flex', gap:6, marginBottom:28 }}>
          {[1,2,3].map(s=>(
            <div key={s} style={{ flex:1, height:5, borderRadius:4, background:step>=s?C.g:'#e5e7eb', transition:'background 0.3s' }}/>
          ))}
        </div>

        {step===1 && (
          <>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:24, color:C.gD, marginBottom:6 }}>Apna Business Type Chunein 🏪</div>
            <p style={{ color:C.muted, fontSize:13, marginBottom:20 }}>Iske hisaab se aapki dukaan customize hogi</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:20 }}>
              {BIZ_TYPES.map(b=>(
                <div key={b.id} onClick={()=>setBizType(b.id)} style={{ border:`2px solid ${bizType===b.id?C.g:'#e5e7eb'}`, background:bizType===b.id?C.gXL:'#fafafa', borderRadius:14, padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'all 0.15s' }}>
                  <span style={{ fontSize:22 }}>{b.emoji}</span>
                  <span style={{ fontWeight:700, fontSize:13, color:bizType===b.id?C.gD:C.text, flex:1 }}>{b.label}</span>
                  {bizType===b.id && <span style={{ color:C.g }}>✓</span>}
                </div>
              ))}
            </div>
            {bizType==='custom' && (
              <input value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="Apna business type likhein..." style={inp} />
            )}
            <button onClick={()=>bizType&&setStep(2)} style={{ width:'100%', background:bizType?`linear-gradient(135deg,${C.gD},${C.g})`:'#d1d5db', color:'#fff', border:'none', borderRadius:12, padding:13, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:bizType?'pointer':'not-allowed' }}>
              Aage Badhein →
            </button>
          </>
        )}

        {step===2 && (
          <>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:6 }}>{selBiz?.emoji} Dukaan ki Jaankari</div>
            <p style={{ color:C.muted, fontSize:13, marginBottom:18 }}>Yeh details bills aur reports mein use hongi</p>
            <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:4 }}>Dukaan ka Naam *</label>
            <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Jaise: Sharma General Store" style={inp} />
            <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:4 }}>Malik ka Naam *</label>
            <input value={ownerName} onChange={e=>setOwnerName(e.target.value)} placeholder="Jaise: Ramesh Sharma" style={inp} />
            <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:4 }}>WhatsApp Number *</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9876543210" style={inp} />
            <label style={{ fontWeight:700, fontSize:12, color:C.text, display:'block', marginBottom:4 }}>Shehar</label>
            <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Jaise: Lucknow" style={inp} />

            <div style={{ background:C.gXL, borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:13, color:C.gD, marginBottom:8 }}>💳 Payment Modes (jo aap accept karte hain)</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {[['cash','💵 Cash'],['upi','📱 UPI/QR'],['bank','🏦 Bank']].map(([k,l])=>(
                  <label key={k} onClick={()=>setPayModes(m=>({...m,[k]:!m[k]}))} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', background:payModes[k]?C.g:'#fff', color:payModes[k]?'#fff':C.text, borderRadius:20, padding:'5px 14px', fontSize:13, fontWeight:700, border:`1.5px solid ${payModes[k]?C.g:C.border}` }}>
                    {l}
                  </label>
                ))}
              </div>
              <div style={{ fontWeight:800, fontSize:13, color:C.gD, marginTop:12, marginBottom:8 }}>👥 Customer Types</div>
              <div style={{ display:'flex', gap:10 }}>
                {[['retail','🛒 Retail'],['wholesale','📦 Wholesale']].map(([k,l])=>(
                  <label key={k} onClick={()=>setCustTypes(m=>({...m,[k]:!m[k]}))} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', background:custTypes[k]?C.g:'#fff', color:custTypes[k]?'#fff':C.text, borderRadius:20, padding:'5px 14px', fontSize:13, fontWeight:700, border:`1.5px solid ${custTypes[k]?C.g:C.border}` }}>
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setStep(1)} style={{ flex:1, background:'#f3f4f6', color:C.text, border:'none', borderRadius:12, padding:11, fontFamily:"'Baloo 2',cursive", fontWeight:700, fontSize:14, cursor:'pointer' }}>← Wapas</button>
              <button onClick={()=>shopName&&ownerName&&phone&&setStep(3)} style={{ flex:2, background:shopName&&ownerName&&phone?`linear-gradient(135deg,${C.gD},${C.g})`:'#d1d5db', color:'#fff', border:'none', borderRadius:12, padding:11, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:14, cursor:shopName&&ownerName&&phone?'pointer':'not-allowed' }}>
                Aage Badhein →
              </button>
            </div>
          </>
        )}

        {step===3 && (
          <>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:24, color:C.gD, marginBottom:16 }}>🎉 Sab Taiyar Hai!</div>
            <div style={{ background:C.gXL, borderRadius:16, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>{selBiz?.emoji}</div>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:C.gD }}>{shopName}</div>
              <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>Malik: {ownerName} • 📞 {phone}</div>
              {city && <div style={{ color:C.muted, fontSize:13 }}>📍 {city}</div>}
              <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ background:C.g, color:'#fff', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700 }}>{bizType==='custom'?customLabel:selBiz?.label}</span>
                {payModes.cash && <span style={{ background:'#e0f2fe', color:'#0369a1', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700 }}>💵 Cash</span>}
                {payModes.upi && <span style={{ background:'#ede9fe', color:'#7c3aed', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700 }}>📱 UPI</span>}
                {custTypes.wholesale && <span style={{ background:C.goldL, color:C.gold, borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700 }}>📦 Wholesale</span>}
              </div>
            </div>
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#0369a1', marginBottom:6 }}>🤖 AI WhatsApp Bot</div>
              <div style={{ fontSize:12, color:'#0284c7', lineHeight:1.7 }}>
                Register ke baad AI Chat se bolein:<br/>
                <i>"Harish ko 2kg sugar ka bill bana do"</i><br/>
                <i>"Aaj ki kamai batao"</i>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setStep(2)} style={{ flex:1, background:'#f3f4f6', color:C.text, border:'none', borderRadius:12, padding:11, fontFamily:"'Baloo 2',cursive", fontWeight:700, cursor:'pointer' }}>← Wapas</button>
              <button onClick={finish} disabled={loading} style={{ flex:2, background:loading?C.muted:`linear-gradient(135deg,${C.gD},${C.g})`, color:'#fff', border:'none', borderRadius:12, padding:13, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:loading?'not-allowed':'pointer' }}>
                {loading ? '⏳ Taiyar ho raha hai...' : '🚀 Dukaan Shuru Karein!'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
