import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

// ─── STAR RATING ───────────────────────────────────────────────
const Stars = ({ rating, size=14 }) => (
  <span style={{ color:'#f59e0b', fontSize:size }}>
    {'★'.repeat(Math.round(rating))}{'☆'.repeat(5-Math.round(rating))}
    <span style={{ color:C.muted, fontSize:size-2, marginLeft:4 }}>{rating.toFixed(1)}</span>
  </span>
)

// ─── PRICE ITEM ROW ────────────────────────────────────────────
const PriceRow = ({ item }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:`1px solid ${C.gXL}`, fontSize:13 }}>
    <div>
      <span style={{ fontWeight:700 }}>{item.product_name}</span>
      <span style={{ color:C.muted, fontSize:11, marginLeft:8 }}>per {item.unit}</span>
      {item.min_qty > 1 && <span style={{ color:'#0369a1', fontSize:10, marginLeft:6, background:'#e0f2fe', borderRadius:10, padding:'1px 7px' }}>Min: {item.min_qty} {item.unit}</span>}
    </div>
    <div style={{ textAlign:'right' }}>
      <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.g, fontSize:15 }}>₹{item.price}</span>
      {!item.available && <div style={{ fontSize:10, color:C.red, fontWeight:700 }}>Out of Stock</div>}
    </div>
  </div>
)

// ─── WHOLESALER CARD ───────────────────────────────────────────
function WholesalerCard({ item, shop, onConnect, onViewPrices, onReview, priceCount, avgRating, reviewCount }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', border:`1.5px solid ${C.border}`, transition:'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(22,163,74,0.13)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 16px rgba(0,0,0,0.07)' }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, padding:'16px 18px', position:'relative' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:17, color:'#fff' }}>{item.business_name}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:2 }}>👤 {item.owner_name} • 📍 {item.city}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
            <span style={{ background:'rgba(255,255,255,0.2)', color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
              {item.business_type==='wholesaler'?'📦 Wholesaler':'🛒 Retailer'}
            </span>
            {item.verified && <span style={{ background:'#fbbf24', color:'#78350f', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:800 }}>✅ Verified</span>}
            {item.shop_id === shop.id && <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>⭐ Meri Listing</span>}
          </div>
        </div>
        {avgRating > 0 && (
          <div style={{ marginTop:8 }}>
            <Stars rating={avgRating} size={13}/>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11, marginLeft:4 }}>({reviewCount} reviews)</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding:'14px 18px' }}>
        {item.categories && (
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
            {item.categories.split(',').slice(0,4).map(c=>(
              <span key={c} style={{ background:'#f0f9ff', color:'#0369a1', borderRadius:20, padding:'2px 9px', fontSize:11, fontWeight:700 }}>{c.trim()}</span>
            ))}
          </div>
        )}
        {item.description && <div style={{ fontSize:12, color:C.text, marginBottom:10, lineHeight:1.6 }}>{item.description}</div>}

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12, fontSize:12 }}>
          {item.min_order > 0 && <span style={{ color:C.muted }}>📦 Min Order: ₹{item.min_order}</span>}
          {item.delivery && <span style={{ color:C.g, fontWeight:700 }}>🚚 Free Delivery</span>}
          {item.delivery_area && <span style={{ color:C.muted }}>📍 {item.delivery_area}</span>}
          {priceCount > 0 && <span style={{ color:'#7c3aed', fontWeight:700 }}>🏷️ {priceCount} products listed</span>}
        </div>

        {/* Price Preview */}
        {priceCount > 0 && (
          <button onClick={()=>onViewPrices(item)} style={{ width:'100%', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, color:'#0369a1', cursor:'pointer', marginBottom:10, textAlign:'center' }}>
            🏷️ Price List Dekho ({priceCount} items)
          </button>
        )}

        {/* Action Buttons */}
        {item.shop_id !== shop.id ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {item.phone && (
              <a href={`tel:+91${item.phone}`} style={{ background:C.gXL, color:C.g, borderRadius:10, padding:'8px', textAlign:'center', fontWeight:700, fontSize:12, textDecoration:'none', display:'block' }}>📞 Call</a>
            )}
            {item.phone && (
              <a href={`https://wa.me/91${item.phone}?text=${encodeURIComponent(`Namaste ${item.owner_name} ji!\nMain ${shop.name} se hoon.\nAapke products ke baare mein baat karni thi. 🙏`)}`}
                target="_blank" rel="noreferrer"
                style={{ background:'#25d366', color:'#fff', borderRadius:10, padding:'8px', textAlign:'center', fontWeight:700, fontSize:12, textDecoration:'none', display:'block' }}>
                💬 WhatsApp
              </a>
            )}
            <button onClick={()=>onConnect(item)} style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              🤝 Connect Request
            </button>
            <button onClick={()=>onReview(item)} style={{ background:'#fdf4ff', color:'#7c3aed', border:'1px solid #e9d5ff', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              ⭐ Review Do
            </button>
          </div>
        ) : (
          <div style={{ background:C.gXL, borderRadius:10, padding:'8px 12px', fontSize:12, color:C.gD, fontWeight:700, textAlign:'center' }}>
            ✅ Yeh aapki listing hai
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PRICE LIST MODAL ──────────────────────────────────────────
function PriceListModal({ listing, shop, onClose }) {
  const [prices, setPrices] = useState([])
  const [myPrices, setMyPrices] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ product_name:'', unit:'pcs', price:'', min_qty:'1', min_order_amount:'0', available:true })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    setIsOwner(listing.shop_id === shop.id)
    loadPrices()
  }, [listing.id])

  const loadPrices = async () => {
    const { data } = await supabase.from('b2b_price_lists').select('*').eq('listing_id', listing.id).order('product_name')
    setPrices(data || [])
    setMyPrices(data || [])
  }

  const savePriceItem = async () => {
    if (!form.product_name || !form.price) return
    setSaving(true)
    const payload = { ...form, price:+form.price, min_qty:+form.min_qty, min_order_amount:+form.min_order_amount, listing_id:listing.id, shop_id:shop.id }
    if (editingId) {
      await supabase.from('b2b_price_lists').update(payload).eq('id', editingId)
      setEditingId(null)
    } else {
      await supabase.from('b2b_price_lists').insert(payload)
    }
    setForm({ product_name:'', unit:'pcs', price:'', min_qty:'1', min_order_amount:'0', available:true })
    setShowAddForm(false); setSaving(false)
    loadPrices()
  }

  const deletePrice = async (id) => {
    await supabase.from('b2b_price_lists').delete().eq('id', id)
    loadPrices()
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setForm({ product_name:item.product_name, unit:item.unit, price:String(item.price), min_qty:String(item.min_qty), min_order_amount:String(item.min_order_amount), available:item.available })
    setShowAddForm(true)
  }

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:9, padding:'8px 10px', fontSize:13, outline:'none', background:'#fafffe', fontFamily:"'DM Sans',sans-serif" }

  const waText = `🏷️ *Price List — ${listing.business_name}*\n📍 ${listing.city}\n━━━━━━━━━━━━━━\n${prices.map(p=>`• ${p.product_name}: ₹${p.price}/${p.unit}${p.min_qty>1?' (Min '+p.min_qty+')':''}`).join('\n')}\n━━━━━━━━━━━━━━\n${listing.min_order>0?'Min Order: ₹'+listing.min_order:''}\n${listing.delivery?'🚚 Delivery Available':''}\n📞 ${listing.phone}`

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, maxWidth:580, width:'100%', maxHeight:'88vh', overflow:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, padding:'18px 22px', borderRadius:'20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:'#fff' }}>🏷️ {listing.business_name}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>📍 {listing.city} • {listing.categories}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, padding:'6px 12px', color:'#fff', fontSize:14, cursor:'pointer', fontWeight:700 }}>✕</button>
        </div>

        <div style={{ padding:'20px 22px' }}>
          {/* Owner: Add/Edit prices */}
          {isOwner && (
            <div style={{ marginBottom:16 }}>
              <button onClick={()=>{setShowAddForm(s=>!s);setEditingId(null);setForm({product_name:'',unit:'pcs',price:'',min_qty:'1',min_order_amount:'0',available:true})}}
                style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'9px 20px', fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:13, cursor:'pointer', marginBottom:12 }}>
                {showAddForm ? '✕ Band Karo' : '+ Item Add Karo'}
              </button>

              {showAddForm && (
                <div style={{ background:C.gXL, borderRadius:12, padding:16, marginBottom:14, border:`1.5px solid ${C.border}` }}>
                  <div style={{ fontWeight:800, color:C.gD, marginBottom:12 }}>{editingId ? '✏️ Edit Item' : '➕ Naya Item'}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:12 }}>
                    <div>
                      <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:3 }}>Product Naam *</label>
                      <input value={form.product_name} onChange={e=>setForm(f=>({...f,product_name:e.target.value}))} placeholder="Jaise: Sugar 1kg" style={{ ...inp, width:'100%', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:3 }}>Price ₹ *</label>
                      <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="0" style={{ ...inp, width:'100%', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:3 }}>Unit</label>
                      <select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} style={{ ...inp, width:'100%', boxSizing:'border-box' }}>
                        {['pcs','kg','g','l','ml','box','pkt','btl','bag','strip','set','doz','m','roll','nos'].map(u=><option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:3 }}>Min Qty</label>
                      <input type="number" value={form.min_qty} onChange={e=>setForm(f=>({...f,min_qty:e.target.value}))} placeholder="1" style={{ ...inp, width:'100%', boxSizing:'border-box' }}/>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, paddingTop:16 }}>
                      <input type="checkbox" id="avail" checked={form.available} onChange={e=>setForm(f=>({...f,available:e.target.checked}))}/>
                      <label htmlFor="avail" style={{ fontWeight:700, fontSize:12, cursor:'pointer' }}>Available hai</label>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={savePriceItem} disabled={saving} style={{ background:saving?C.muted:C.g, color:'#fff', border:'none', borderRadius:9, padding:'8px 20px', fontWeight:800, cursor:saving?'not-allowed':'pointer', fontFamily:"'Baloo 2',cursive" }}>{saving?'Saving...':'💾 Save'}</button>
                    <button onClick={()=>setShowAddForm(false)} style={{ background:'#f3f4f6', color:C.text, border:'none', borderRadius:9, padding:'8px 14px', fontWeight:700, cursor:'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price List */}
          <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:16 }}>
            <div style={{ padding:'10px 14px', background:C.gXL, fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.gD, fontSize:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>🏷️ Price List ({prices.length} items)</span>
              <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Updated: {prices[0]?.updated_at?.slice(0,10)||'—'}</span>
            </div>
            {prices.length === 0
              ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>
                  {isOwner ? 'Price list abhi khali hai. + Item Add Karo button se add karein!' : 'Is wholesaler ne abhi price list nahi daali.'}
                </div>
              : prices.map(item=>(
                <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderBottom:`1px solid ${C.gXL}` }}>
                  <div>
                    <span style={{ fontWeight:700, fontSize:13 }}>{item.product_name}</span>
                    <span style={{ color:C.muted, fontSize:11, marginLeft:8 }}>per {item.unit}</span>
                    {item.min_qty > 1 && <span style={{ color:'#0369a1', fontSize:10, marginLeft:6, background:'#e0f2fe', borderRadius:10, padding:'1px 7px' }}>Min: {item.min_qty}</span>}
                    {!item.available && <span style={{ color:C.red, fontSize:10, marginLeft:6, fontWeight:700 }}>Out of Stock</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, color:item.available?C.g:C.muted, fontSize:16 }}>₹{item.price}</span>
                    {isOwner && (
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>startEdit(item)} style={{ background:C.goldL, border:'none', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:C.gold, fontWeight:700 }}>✏️</button>
                        <button onClick={()=>deletePrice(item.id)} style={{ background:C.redL, border:'none', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:C.red, fontWeight:700 }}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Share price list */}
          {prices.length > 0 && listing.phone && !isOwner && (
            <div style={{ display:'flex', gap:10 }}>
              <a href={`https://wa.me/91${listing.phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"
                style={{ flex:1, background:'#25d366', color:'#fff', borderRadius:12, padding:'11px', textAlign:'center', fontWeight:800, fontSize:14, textDecoration:'none', display:'block', fontFamily:"'Baloo 2',cursive" }}>
                💬 WhatsApp pe Order Karo
              </a>
              <button onClick={()=>{navigator.clipboard.writeText(waText);alert('Price list copied!')}}
                style={{ flex:1, background:'#f0f9ff', color:'#0369a1', border:'1px solid #bae6fd', borderRadius:12, padding:'11px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                📋 List Copy Karo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CONNECT MODAL ─────────────────────────────────────────────
function ConnectModal({ listing, shop, onClose }) {
  const [msg, setMsg] = useState(`Namaste ${listing.owner_name} ji!\n\nMain ${shop.name} se hoon aur aapke saath business karna chahta hoon.\n\nKripya mujhse connect karein. Dhanyawad! 🙏`)
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    setSaving(true)
    await supabase.from('b2b_connections').insert({
      from_shop_id: shop.id,
      to_listing_id: listing.id,
      from_shop_name: shop.name,
      from_phone: shop.phone,
      message: msg,
      status: 'pending'
    })
    setSaving(false); setSent(true)
    // Also open WhatsApp
    if (listing.phone) {
      window.open(`https://wa.me/91${listing.phone}?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, maxWidth:460, width:'100%', padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>
        {sent ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🤝</div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD }}>Request Bhej Di!</div>
            <div style={{ color:C.muted, fontSize:14, marginTop:8, marginBottom:20 }}>
              {listing.business_name} ko connection request gayi + WhatsApp message bhi khula
            </div>
            <button onClick={onClose} style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'11px 28px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:'pointer' }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:C.gD }}>🤝 Connect Request</div>
              <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700 }}>✕</button>
            </div>
            <div style={{ background:C.gXL, borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
              <div style={{ fontWeight:800, color:C.gD }}>{listing.business_name}</div>
              <div style={{ fontSize:12, color:C.muted }}>📍 {listing.city} • 📞 {listing.phone}</div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontWeight:700, fontSize:12, display:'block', marginBottom:6 }}>Apna Message Edit Karein:</label>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={5}
                style={{ border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:"'DM Sans',sans-serif", lineHeight:1.6 }}/>
            </div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>
              💡 Request app mein save hogi + WhatsApp message bhi khulega
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={send} disabled={saving} style={{ flex:2, background:saving?C.muted:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'12px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:saving?'not-allowed':'pointer' }}>
                {saving ? '⏳ Sending...' : '🤝 Request Bhejo'}
              </button>
              <button onClick={onClose} style={{ flex:1, background:'#f3f4f6', color:C.text, border:'none', borderRadius:12, padding:'12px', fontWeight:700, cursor:'pointer' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── REVIEW MODAL ──────────────────────────────────────────────
function ReviewModal({ listing, shop, onClose }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const save = async () => {
    setSaving(true)
    await supabase.from('b2b_reviews').insert({
      listing_id: listing.id,
      reviewer_shop_id: shop.id,
      reviewer_name: shop.name,
      rating, comment
    })
    setSaving(false); setDone(true)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, maxWidth:420, width:'100%', padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>
        {done ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:10 }}>⭐</div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:C.gD }}>Review De Di!</div>
            <div style={{ color:C.muted, fontSize:13, marginTop:6, marginBottom:16 }}>Shukriya — aapka review dusron ki madad karega!</div>
            <button onClick={onClose} style={{ background:C.g, color:'#fff', border:'none', borderRadius:12, padding:'10px 24px', fontWeight:800, cursor:'pointer', fontFamily:"'Baloo 2',cursive" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:C.gD }}>⭐ Review Do</div>
              <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700 }}>✕</button>
            </div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>{listing.business_name} ko rate karein:</div>
            <div style={{ display:'flex', gap:8, marginBottom:16, justifyContent:'center' }}>
              {[1,2,3,4,5].map(s=>(
                <button key={s} onClick={()=>setRating(s)} style={{ background:'none', border:'none', fontSize:32, cursor:'pointer', color:s<=rating?'#f59e0b':'#d1d5db', transition:'color 0.1s' }}>★</button>
              ))}
            </div>
            <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Aapka experience likho (optional)..." rows={3}
              style={{ border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', resize:'none', fontFamily:"'DM Sans',sans-serif", marginBottom:14 }}/>
            <button onClick={save} disabled={saving} style={{ width:'100%', background:saving?C.muted:'#f59e0b', color:'#fff', border:'none', borderRadius:12, padding:'11px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:saving?'not-allowed':'pointer' }}>
              {saving ? '⏳ Saving...' : '⭐ Review Submit Karo'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── AI RATE FINDER ────────────────────────────────────────────
function AIRateFinder({ shop, listings, priceLists }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setResults(null); setAiSuggestion('')

    // Local search across all price lists
    const q = query.toLowerCase()
    const found = []
    priceLists.forEach(pl => {
      const listing = listings.find(l => l.id === pl.listing_id)
      if (!listing) return
      if (pl.product_name.toLowerCase().includes(q) || listing.categories?.toLowerCase().includes(q)) {
        found.push({ ...pl, listing })
      }
    })
    setResults(found.sort((a,b) => a.price - b.price))

    // AI suggestion
    try {
      const geminiKey = import.meta.env.VITE_GEMINI_KEY
      if (geminiKey && found.length > 0) {
        const priceInfo = found.slice(0,5).map(f => `${f.listing.business_name} (${f.listing.city}): ₹${f.price}/${f.unit}${f.listing.delivery?' + Delivery':''}${f.listing.min_order>0?' Min ₹'+f.listing.min_order:''}`).join('\n')
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              contents:[{parts:[{text:`Main ${shop.name} ka owner hoon. Mujhe "${query}" ke liye best wholesale deal chahiye.\n\nAvailable options:\n${priceInfo}\n\nHindi mein 3-4 lines mein suggest karo ki kaunsa best hai aur kyun. Delivery, rate, aur min order sab consider karo.`}]}],
              generationConfig:{ maxOutputTokens:200, temperature:0.7 }
            })
          }
        )
        const d = await res.json()
        const txt = d?.candidates?.[0]?.content?.parts?.[0]?.text
        if (txt) setAiSuggestion(txt.trim())
      }
    } catch(e) { console.log('AI error:', e) }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, borderRadius:18, padding:'24px 22px', marginBottom:20, color:'#fff' }}>
        <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, marginBottom:6 }}>🤖 AI Rate Finder</div>
        <div style={{ fontSize:13, opacity:.8, marginBottom:16 }}>Koi bhi product likhein — AI best wholesaler dhundhega aur suggest karega!</div>
        <div style={{ display:'flex', gap:10 }}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
            placeholder="Jaise: Sugar, Atta, Lipstick, Cement..."
            style={{ flex:1, border:'none', borderRadius:12, padding:'12px 16px', fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif" }}/>
          <button onClick={search} disabled={loading} style={{ background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.4)', color:'#fff', borderRadius:12, padding:'12px 20px', fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:14, cursor:loading?'not-allowed':'pointer', whiteSpace:'nowrap' }}>
            {loading ? '⏳ Searching...' : '🔍 Rate Dhundho'}
          </button>
        </div>
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div style={{ background:'#fdf4ff', border:'1px solid #e9d5ff', borderRadius:14, padding:'16px 18px', marginBottom:16, display:'flex', gap:12 }}>
          <span style={{ fontSize:28, flexShrink:0 }}>🤖</span>
          <div>
            <div style={{ fontWeight:800, color:'#7c3aed', marginBottom:6, fontSize:13 }}>AI Suggestion</div>
            <div style={{ fontSize:13, color:'#4c1d95', lineHeight:1.7 }}>{aiSuggestion}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.gXL}`, fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.text, display:'flex', justifyContent:'space-between' }}>
            <span>🏷️ "{query}" ke Results</span>
            <span style={{ color:C.muted, fontSize:13, fontWeight:600 }}>{results.length} found</span>
          </div>
          {results.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:C.muted }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>
              <div style={{ fontWeight:700 }}>Koi result nahi mila</div>
              <div style={{ fontSize:12, marginTop:6 }}>Abhi price lists kam hain — zyada wholesalers ko invite karein!</div>
            </div>
          ) : results.map((item, i) => (
            <div key={item.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderTop:i>0?`1px solid ${C.gXL}`:'none', background:i===0?'#f0fdf4':'#fff' }}>
              {i === 0 && <span style={{ background:'#fbbf24', color:'#78350f', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:900, flexShrink:0 }}>🥇 Best</span>}
              {i === 1 && <span style={{ background:'#e5e7eb', color:'#374151', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:900, flexShrink:0 }}>🥈</span>}
              {i > 1 && <span style={{ background:'#fff7ed', color:'#c2410c', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:900, flexShrink:0 }}>{i+1}.</span>}
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14 }}>{item.listing.business_name}</div>
                <div style={{ fontSize:12, color:C.muted }}>📍 {item.listing.city}</div>
                <div style={{ display:'flex', gap:8, marginTop:3, flexWrap:'wrap' }}>
                  {item.min_qty > 1 && <span style={{ fontSize:11, color:'#0369a1' }}>Min: {item.min_qty} {item.unit}</span>}
                  {item.listing.min_order > 0 && <span style={{ fontSize:11, color:C.muted }}>Min Order: ₹{item.listing.min_order}</span>}
                  {item.listing.delivery && <span style={{ fontSize:11, color:C.g, fontWeight:700 }}>🚚 Delivery</span>}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:i===0?C.g:C.text }}>₹{item.price}</div>
                <div style={{ fontSize:11, color:C.muted }}>per {item.unit}</div>
              </div>
              {item.listing.phone && (
                <a href={`https://wa.me/91${item.listing.phone}?text=${encodeURIComponent(`Namaste! ${item.product_name} ka order dena tha. Rate confirm karein. - ${shop.name}`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ background:'#25d366', color:'#fff', borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
                  💬 Order Karo
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CONNECTIONS INBOX ─────────────────────────────────────────
function ConnectionsInbox({ shop, myListing }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadRequests() }, [myListing])

  const loadRequests = async () => {
    if (!myListing) { setLoading(false); return }
    const { data } = await supabase.from('b2b_connections').select('*')
      .eq('to_listing_id', myListing.id).order('created_at', { ascending:false })
    setRequests(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('b2b_connections').update({ status }).eq('id', id)
    loadRequests()
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:C.muted }}>Loading...</div>

  return (
    <div>
      {!myListing ? (
        <div style={{ background:'#fff', borderRadius:16, padding:40, textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📬</div>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:18, color:C.gD }}>Pehle Listing Banao</div>
          <div style={{ color:C.muted, marginTop:8 }}>Connection requests dekhne ke liye B2B listing add karein</div>
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.gXL}`, fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15 }}>
            📬 Connection Requests ({requests.length})
          </div>
          {requests.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:C.muted }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
              Abhi koi request nahi
            </div>
          ) : requests.map((req,i) => (
            <div key={req.id} style={{ padding:'14px 18px', borderTop:i>0?`1px solid ${C.gXL}`:'none', display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14 }}>{req.from_shop_name}</div>
                {req.from_phone && <div style={{ fontSize:12, color:C.muted }}>📞 {req.from_phone}</div>}
                <div style={{ fontSize:12, color:C.text, marginTop:4, background:'#f9fafb', borderRadius:8, padding:'6px 10px', lineHeight:1.5 }}>{req.message}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{req.created_at?.slice(0,10)}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                {req.status === 'pending' ? (
                  <>
                    <button onClick={()=>updateStatus(req.id,'accepted')} style={{ background:C.g, color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>✅ Accept</button>
                    {req.from_phone && (
                      <a href={`https://wa.me/91${req.from_phone}?text=${encodeURIComponent(`Namaste! Aapki connect request accept kar li. 🤝 Baat karte hain! - ${shop.name}`)}`}
                        target="_blank" rel="noreferrer"
                        style={{ background:'#25d366', color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, textDecoration:'none', textAlign:'center', display:'block' }}>
                        💬 WA Reply
                      </a>
                    )}
                    <button onClick={()=>updateStatus(req.id,'declined')} style={{ background:C.redL, color:C.red, border:'none', borderRadius:8, padding:'5px 14px', fontSize:11, fontWeight:700, cursor:'pointer' }}>❌ Decline</button>
                  </>
                ) : (
                  <span style={{ background:req.status==='accepted'?C.gXL:C.redL, color:req.status==='accepted'?C.g:C.red, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
                    {req.status==='accepted'?'✅ Accepted':'❌ Declined'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────────
export default function B2BNetwork({ shop }) {
  const [activeTab, setActiveTab] = useState('ai_finder')
  const [listings, setListings] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const [priceCounts, setPriceCounts] = useState({})
  const [ratings, setRatings] = useState({})
  const [myListing, setMyListing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCity, setFilterCity] = useState('All')
  const [selectedListing, setSelectedListing] = useState(null)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  const [form, setForm] = useState({
    business_name: shop.name||'', owner_name: shop.owner_name||'',
    phone: shop.phone||'', city: shop.city||'',
    categories: (shop.categories||[]).join(', '),
    description:'', min_order:'', delivery:false, delivery_area:'',
    business_type: shop.cust_types?.wholesale ? 'wholesaler' : 'retailer',
    rate_type:'negotiable',
  })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [{ data: lst }, { data: prices }, { data: reviews }] = await Promise.all([
      supabase.from('b2b_listings').select('*').order('created_at', { ascending:false }),
      supabase.from('b2b_price_lists').select('*'),
      supabase.from('b2b_reviews').select('*'),
    ])
    setListings(lst || [])
    setPriceLists(prices || [])
    setMyListing((lst||[]).find(l=>l.shop_id===shop.id)||null)

    // Price counts per listing
    const counts = {}
    ;(prices||[]).forEach(p=>{ counts[p.listing_id]=(counts[p.listing_id]||0)+1 })
    setPriceCounts(counts)

    // Avg ratings per listing
    const ratingMap = {}
    ;(reviews||[]).forEach(r=>{
      if (!ratingMap[r.listing_id]) ratingMap[r.listing_id] = { sum:0, count:0 }
      ratingMap[r.listing_id].sum += r.rating
      ratingMap[r.listing_id].count += 1
    })
    const avgRatings = {}
    Object.entries(ratingMap).forEach(([id,{sum,count}])=>{ avgRatings[id]={avg:sum/count,count} })
    setRatings(avgRatings)
  }

  const saveListing = async () => {
    if (!form.business_name||!form.phone) return alert('Naam aur phone required!')
    setSaving(true)
    if (myListing) {
      await supabase.from('b2b_listings').update({...form,shop_id:shop.id}).eq('id',myListing.id)
    } else {
      await supabase.from('b2b_listings').insert({...form,shop_id:shop.id})
    }
    setSaving(false); setShowForm(false)
    loadAll()
    alert('Listing save ho gayi! Ab directory mein dikhegi.')
  }

  const allCities = ['All', ...new Set(listings.map(l=>l.city).filter(Boolean))]
  const filtered = listings.filter(l=>{
    const ms = !search||l.business_name?.toLowerCase().includes(search.toLowerCase())||l.city?.toLowerCase().includes(search.toLowerCase())||l.categories?.toLowerCase().includes(search.toLowerCase())
    const mt = filterType==='all'||l.business_type===filterType
    const mc = filterCity==='All'||l.city===filterCity
    return ms&&mt&&mc
  })

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', background:'#fafffe', width:'100%', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" }

  const TABS = [
    { id:'ai_finder',   emoji:'🤖', label:'AI Rate Finder' },
    { id:'directory',   emoji:'🔍', label:'Directory' },
    { id:'my_listing',  emoji:'📋', label:'Meri Listing' },
    { id:'inbox',       emoji:'📬', label:'Requests' },
  ]

  return (
    <div>
      {/* Modals */}
      {showPriceModal && selectedListing && <PriceListModal listing={selectedListing} shop={shop} onClose={()=>{setShowPriceModal(false);loadAll()}}/>}
      {showConnectModal && selectedListing && <ConnectModal listing={selectedListing} shop={shop} onClose={()=>setShowConnectModal(false)}/>}
      {showReviewModal && selectedListing && <ReviewModal listing={selectedListing} shop={shop} onClose={()=>{setShowReviewModal(false);loadAll()}}/>}

      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:4 }}>🤝 B2B Network</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>Price compare karo • Connect karo • AI se best deal dhundho</div>

      {/* Stats Bar */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {[
          ['📦', listings.filter(l=>l.business_type==='wholesaler').length, 'Wholesalers', C.blue],
          ['🛒', listings.filter(l=>l.business_type==='retailer').length, 'Retailers', C.g],
          ['🏷️', priceLists.length, 'Price Items', '#7c3aed'],
          ['🚚', listings.filter(l=>l.delivery).length, 'Delivery wale', C.gold],
        ].map(([ic,cnt,lb,col])=>(
          <div key={lb} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', flex:'1 1 110px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', borderLeft:`3px solid ${col}`, textAlign:'center' }}>
            <div style={{ fontSize:20 }}>{ic}</div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:col }}>{cnt}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700 }}>{lb}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ background:activeTab===t.id?C.g:'#fff', color:activeTab===t.id?'#fff':C.text, border:`1.5px solid ${activeTab===t.id?C.g:C.border}`, borderRadius:20, padding:'7px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            {t.emoji} {t.label}
          </button>
        ))}
        <button onClick={()=>{setActiveTab('my_listing');setShowForm(true)}} style={{ marginLeft:'auto', background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:20, padding:'7px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          {myListing?'✏️ Listing Edit':'+ Listing Add Karo'}
        </button>
      </div>

      {/* ── AI RATE FINDER ── */}
      {activeTab==='ai_finder' && <AIRateFinder shop={shop} listings={listings} priceLists={priceLists}/>}

      {/* ── DIRECTORY ── */}
      {activeTab==='directory' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Name, city, category..." style={{ ...inp, flex:2, minWidth:180 }}/>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ ...inp, flex:'0 0 auto', width:'auto' }}>
              <option value="all">All Types</option>
              <option value="wholesaler">📦 Wholesalers</option>
              <option value="retailer">🛒 Retailers</option>
            </select>
            <select value={filterCity} onChange={e=>setFilterCity(e.target.value)} style={{ ...inp, flex:'0 0 auto', width:'auto' }}>
              {allCities.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          {filtered.length > 0
            ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
                {filtered.map(item=>(
                  <WholesalerCard key={item.id} item={item} shop={shop}
                    priceCount={priceCounts[item.id]||0}
                    avgRating={ratings[item.id]?.avg||0}
                    reviewCount={ratings[item.id]?.count||0}
                    onViewPrices={l=>{setSelectedListing(l);setShowPriceModal(true)}}
                    onConnect={l=>{setSelectedListing(l);setShowConnectModal(true)}}
                    onReview={l=>{setSelectedListing(l);setShowReviewModal(true)}}
                  />
                ))}
              </div>
            : <div style={{ background:'#fff', borderRadius:16, padding:50, textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:18, color:C.gD }}>Koi listing nahi mili</div>
                <div style={{ color:C.muted, marginTop:8 }}>Pehle apni listing add karein — network tabhi badhega!</div>
              </div>
          }
        </>
      )}

      {/* ── MY LISTING ── */}
      {activeTab==='my_listing' && (
        <div>
          {showForm ? (
            <div style={{ background:'#fff', borderRadius:18, padding:24, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', border:`2px solid ${C.border}` }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:16, color:C.g, marginBottom:16 }}>{myListing?'✏️ Listing Update':'📋 Nai Listing'}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:14 }}>
                {[['business_name','Business Name *'],['owner_name','Owner Name'],['phone','WhatsApp Number *'],['city','City'],['categories','Categories (comma se alag karo)'],['description','Description'],['min_order','Min Order ₹'],['delivery_area','Delivery Area']].map(([k,pl])=>(
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
                  <label htmlFor="deliv" style={{ fontWeight:700, fontSize:13, cursor:'pointer' }}>🚚 Delivery Available</label>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={saveListing} disabled={saving} style={{ background:saving?C.muted:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'10px 28px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:14, cursor:saving?'not-allowed':'pointer' }}>
                  {saving?'Saving...':'💾 Save Listing'}
                </button>
                <button onClick={()=>setShowForm(false)} style={{ background:'#f3f4f6', color:C.text, border:'none', borderRadius:12, padding:'10px 18px', fontWeight:700, cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : myListing ? (
            <div>
              <WholesalerCard item={myListing} shop={shop}
                priceCount={priceCounts[myListing.id]||0}
                avgRating={ratings[myListing.id]?.avg||0}
                reviewCount={ratings[myListing.id]?.count||0}
                onViewPrices={l=>{setSelectedListing(l);setShowPriceModal(true)}}
                onConnect={()=>{}} onReview={()=>{}}
              />
              <button onClick={()=>{setForm({business_name:myListing.business_name,owner_name:myListing.owner_name||'',phone:myListing.phone||'',city:myListing.city||'',categories:myListing.categories||'',description:myListing.description||'',min_order:myListing.min_order||'',delivery:myListing.delivery||false,delivery_area:myListing.delivery_area||'',business_type:myListing.business_type,rate_type:myListing.rate_type});setShowForm(true)}} style={{ marginTop:12, background:C.goldL, color:C.gold, border:'none', borderRadius:12, padding:'10px 24px', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:"'Baloo 2',cursive" }}>
                ✏️ Edit Listing
              </button>
            </div>
          ) : (
            <div style={{ background:'#fff', borderRadius:16, padding:50, textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:18, color:C.gD }}>Koi listing nahi</div>
              <div style={{ color:C.muted, marginTop:8, marginBottom:16 }}>B2B directory mein apni dukaan add karein</div>
              <button onClick={()=>setShowForm(true)} style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'10px 24px', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:"'Baloo 2',cursive" }}>
                + Listing Add Karo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── INBOX ── */}
      {activeTab==='inbox' && <ConnectionsInbox shop={shop} myListing={myListing}/>}
    </div>
  )
}
