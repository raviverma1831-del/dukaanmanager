import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function B2BNetwork({ shop }) {
  const [activeTab, setActiveTab] = useState('directory')
  const [listings, setListings] = useState([])
  const [myListing, setMyListing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterBizType, setFilterBizType] = useState('all')
  const [filterCity, setFilterCity] = useState('All')

  const [form, setForm] = useState({
    business_name: shop.name || '',
    owner_name: shop.owner_name || '',
    phone: shop.phone || '',
    city: shop.city || '',
    categories: (shop.categories || []).join(', '),
    description: '',
    min_order: '',
    delivery: false,
    delivery_area: '',
    business_type: shop.cust_types?.wholesale ? 'wholesaler' : 'retailer',
    rate_type: 'negotiable',
  })

  useEffect(() => { loadListings() }, [])

  const loadListings = async () => {
    const { data } = await supabase.from('b2b_listings').select('*').order('created_at', { ascending: false })
    setListings(data || [])
    setMyListing((data || []).find(l => l.shop_id === shop.id) || null)
  }

  const saveListing = async () => {
    if (!form.business_name || !form.phone) return alert('Naam aur phone required!')
    setSaving(true)
    if (myListing) {
      await supabase.from('b2b_listings').update({ ...form, shop_id: shop.id }).eq('id', myListing.id)
    } else {
      await supabase.from('b2b_listings').insert({ ...form, shop_id: shop.id })
    }
    setSaving(false); setShowForm(false)
    loadListings()
    alert('Listing save ho gayi! Ab directory mein dikhegi.')
  }

  const deleteListing = async () => {
    if (!myListing || !confirm('Listing delete karein?')) return
    await supabase.from('b2b_listings').delete().eq('id', myListing.id)
    setMyListing(null); loadListings()
  }

  const allCities = ['All', ...new Set(listings.map(l => l.city).filter(Boolean))]

  const filtered = listings.filter(l => {
    const matchSearch = !search || l.business_name?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase()) || l.categories?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterBizType === 'all' || l.business_type === filterBizType
    const matchCity = filterCity === 'All' || l.city === filterCity
    return matchSearch && matchType && matchCity
  })

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', background:'#fafffe', width:'100%', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" }

  const Card = ({ item }) => (
    <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:`1.5px solid ${C.border}`, transition:'transform 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
      onMouseLeave={e=>e.currentTarget.style.transform='none'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:16, color:C.text }}>{item.business_name}</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>👤 {item.owner_name} • 📍 {item.city}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
          <span style={{ background:item.business_type==='wholesaler'?C.blueL:C.gXL, color:item.business_type==='wholesaler'?C.blue:C.g, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
            {item.business_type==='wholesaler'?'📦 Wholesaler':'🛒 Retailer'}
          </span>
          {item.verified && <span style={{ background:'#fef9c3', color:'#854d0e', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>✅ Verified</span>}
          {item.shop_id === shop.id && <span style={{ background:C.gXL, color:C.g, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>⭐ Meri Listing</span>}
        </div>
      </div>

      {item.categories && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
          {item.categories.split(',').slice(0,4).map(c=>(
            <span key={c} style={{ background:'#f0f9ff', color:'#0369a1', borderRadius:20, padding:'2px 9px', fontSize:11, fontWeight:700 }}>{c.trim()}</span>
          ))}
        </div>
      )}

      {item.description && <div style={{ fontSize:12, color:C.text, marginBottom:10, lineHeight:1.5 }}>{item.description}</div>}

      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12, fontSize:12 }}>
        {item.min_order > 0 && <span style={{ color:C.muted }}>📦 Min: ₹{item.min_order}</span>}
        {item.delivery && <span style={{ color:C.g, fontWeight:700 }}>🚚 Delivery Available</span>}
        {item.delivery_area && <span style={{ color:C.muted }}>📍 {item.delivery_area}</span>}
        <span style={{ color:C.muted }}>💰 {item.rate_type}</span>
      </div>

      {item.phone && item.shop_id !== shop.id && (
        <div style={{ display:'flex', gap:8 }}>
          <a href={`tel:+91${item.phone}`} style={{ flex:1, background:C.gXL, color:C.g, borderRadius:10, padding:'8px', textAlign:'center', fontWeight:700, fontSize:12, textDecoration:'none' }}>📞 Call</a>
          <a href={`https://wa.me/91${item.phone}?text=${encodeURIComponent(`Namaste ${item.owner_name} ji! Main ${shop.name} se bol raha hoon. Aapke products ke baare mein baat karni thi. 🙏`)}`}
            target="_blank" rel="noreferrer"
            style={{ flex:1, background:'#25d366', color:'#fff', borderRadius:10, padding:'8px', textAlign:'center', fontWeight:700, fontSize:12, textDecoration:'none' }}>
            💬 WhatsApp
          </a>
          <button onClick={()=>{
            const msg = `Namaste ${item.owner_name} ji!\nMain ${shop.name} se hoon.\n${item.business_type==='wholesaler'?'Aapka wholesale rate kya hai?':'Kya aap hamare product khareedna chahenge?'}\n📱 ${shop.phone||''}`
            navigator.clipboard.writeText(msg); alert('Message copied! WhatsApp mein paste karein.')
          }} style={{ flex:1, background:'#f0f9ff', color:'#0369a1', border:'none', borderRadius:10, padding:'8px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            📋 Copy Msg
          </button>
        </div>
      )}
      {item.shop_id === shop.id && (
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{setForm({business_name:item.business_name,owner_name:item.owner_name||'',phone:item.phone||'',city:item.city||'',categories:item.categories||'',description:item.description||'',min_order:item.min_order||'',delivery:item.delivery||false,delivery_area:item.delivery_area||'',business_type:item.business_type,rate_type:item.rate_type});setShowForm(true);setActiveTab('my_listing')}} style={{ flex:1, background:C.goldL, color:C.gold, border:'none', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer' }}>✏️ Edit</button>
          <button onClick={deleteListing} style={{ flex:1, background:C.redL, color:C.red, border:'none', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer' }}>🗑️ Delete</button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:4 }}>🤝 B2B Network</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>Wholesalers aur Retailers se connect karein • Rate compare karein • Direct WhatsApp karein</div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        {[['directory','🔍 Directory'],['my_listing','📋 Meri Listing'],['compare','⚖️ Rate Compare']].map(([v,l])=>(
          <button key={v} onClick={()=>setActiveTab(v)} style={{ background:activeTab===v?C.g:'#fff', color:activeTab===v?'#fff':C.text, border:`1.5px solid ${activeTab===v?C.g:C.border}`, borderRadius:20, padding:'7px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
        ))}
        <button onClick={()=>{setActiveTab('my_listing');setShowForm(true)}} style={{ marginLeft:'auto', background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:20, padding:'7px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          {myListing ? '✏️ Listing Edit Karo' : '+ Apni Listing Add Karo'}
        </button>
      </div>

      {/* ── DIRECTORY ── */}
      {activeTab === 'directory' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Name, city, category se search..." style={{ ...inp, flex:2, minWidth:180 }}/>
            <select value={filterBizType} onChange={e=>setFilterBizType(e.target.value)} style={{ ...inp, flex:'0 0 auto', width:'auto' }}>
              <option value="all">All Types</option>
              <option value="wholesaler">📦 Wholesalers</option>
              <option value="retailer">🛒 Retailers</option>
            </select>
            <select value={filterCity} onChange={e=>setFilterCity(e.target.value)} style={{ ...inp, flex:'0 0 auto', width:'auto' }}>
              {allCities.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            {[
              ['📦',listings.filter(l=>l.business_type==='wholesaler').length,'Wholesalers',C.blue],
              ['🛒',listings.filter(l=>l.business_type==='retailer').length,'Retailers',C.g],
              ['🚚',listings.filter(l=>l.delivery).length,'Home Delivery',C.gold],
              ['🔍',filtered.length,'Results',C.muted],
            ].map(([ic,cnt,lb,col])=>(
              <div key={lb} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', flex:'1 1 100px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', borderLeft:`3px solid ${col}`, textAlign:'center' }}>
                <div style={{ fontSize:20 }}>{ic}</div>
                <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:col }}>{cnt}</div>
                <div style={{ fontSize:11, color:C.muted, fontWeight:700 }}>{lb}</div>
              </div>
            ))}
          </div>

          {filtered.length > 0
            ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
                {filtered.map(item => <Card key={item.id} item={item}/>)}
              </div>
            : <div style={{ background:'#fff', borderRadius:16, padding:50, textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:18, color:C.gD }}>Koi listing nahi mili</div>
                <div style={{ color:C.muted, marginTop:8 }}>Pehle aap apni listing add karein — aur doosron ko bhi invite karein!</div>
              </div>
          }
        </>
      )}

      {/* ── MY LISTING ── */}
      {activeTab === 'my_listing' && (
        <div>
          {showForm ? (
            <div style={{ background:'#fff', borderRadius:18, padding:24, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', border:`2px solid ${C.border}` }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:16, color:C.g, marginBottom:16 }}>{myListing ? '✏️ Listing Update Karein' : '📋 Nai Listing Banayein'}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:14 }}>
                {[['business_name','Business Name *'],['owner_name','Owner Name'],['phone','WhatsApp Number *'],['city','City *'],['categories','Categories (comma separated)'],['description','Description'],['min_order','Min Order ₹'],['delivery_area','Delivery Area']].map(([k,pl])=>(
                  <div key={k}>
                    <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>{pl}</label>
                    <input value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={pl} style={inp}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Business Type</label>
                  <select value={form.business_type} onChange={e=>setForm(f=>({...f,business_type:e.target.value}))} style={inp}>
                    <option value="wholesaler">📦 Wholesaler / Distributor</option>
                    <option value="retailer">🛒 Retailer</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Rate Type</label>
                  <select value={form.rate_type} onChange={e=>setForm(f=>({...f,rate_type:e.target.value}))} style={inp}>
                    <option value="fixed">Fixed Rate</option>
                    <option value="negotiable">Negotiable</option>
                    <option value="market">Market Rate</option>
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
                  <input type="checkbox" id="deliv" checked={form.delivery} onChange={e=>setForm(f=>({...f,delivery:e.target.checked}))}/>
                  <label htmlFor="deliv" style={{ fontWeight:700, fontSize:13, cursor:'pointer' }}>🚚 Home Delivery Available</label>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={saveListing} disabled={saving} style={{ background:saving?C.muted:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'10px 28px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:14, cursor:saving?'not-allowed':'pointer' }}>{saving?'Saving...':'💾 Save Listing'}</button>
                <button onClick={()=>setShowForm(false)} style={{ background:'#f3f4f6', color:C.text, border:'none', borderRadius:12, padding:'10px 18px', fontWeight:700, cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : myListing ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
              <Card item={myListing}/>
            </div>
          ) : (
            <div style={{ background:'#fff', borderRadius:16, padding:50, textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:18, color:C.gD }}>Koi listing nahi</div>
              <div style={{ color:C.muted, marginTop:8, marginBottom:16 }}>B2B directory mein apni dukaan add karein</div>
              <button onClick={()=>setShowForm(true)} style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'10px 24px', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:"'Baloo 2',cursive" }}>+ Listing Add Karo</button>
            </div>
          )}
        </div>
      )}

      {/* ── RATE COMPARE ── */}
      {activeTab === 'compare' && (
        <div style={{ display:'grid', gap:14 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:16, marginBottom:14 }}>⚖️ Wholesaler Rate Comparison</div>
            {listings.filter(l=>l.business_type==='wholesaler').length === 0
              ? <div style={{ textAlign:'center', padding:30, color:C.muted }}>Abhi koi wholesaler nahi — unhe bhi app pe invite karein!</div>
              : listings.filter(l=>l.business_type==='wholesaler').map(w=>(
                <div key={w.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderBottom:`1px solid ${C.gXL}`, borderRadius:10, background:'#fafafa', marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:14 }}>{w.business_name}</div>
                    <div style={{ fontSize:12, color:C.muted }}>📍 {w.city} • {w.categories?.slice(0,40)}</div>
                    {w.min_order > 0 && <div style={{ fontSize:11, color:C.muted }}>Min order: ₹{w.min_order}</div>}
                  </div>
                  <div style={{ textAlign:'center', minWidth:80 }}>
                    <div style={{ fontWeight:800, fontSize:12, color:C.g }}>{w.rate_type}</div>
                    {w.delivery && <div style={{ fontSize:11, color:C.g, fontWeight:700 }}>🚚 Delivery</div>}
                  </div>
                  {w.phone && (
                    <a href={`https://wa.me/91${w.phone}?text=${encodeURIComponent(`Namaste! Rate list bhejein. Main ${shop.name} se hoon. 🙏`)}`}
                      target="_blank" rel="noreferrer"
                      style={{ background:'#25d366', color:'#fff', borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                      💬 Rate Poochein
                    </a>
                  )}
                </div>
              ))
            }
          </div>

          <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:14, padding:'14px 18px', fontSize:13, color:'#92400e' }}>
            💡 <b>Tip:</b> Wholesaler se WhatsApp pe rate manga lo, phir yahan compare karo. Jo best rate de usse order karo!
          </div>
        </div>
      )}
    </div>
  )
}