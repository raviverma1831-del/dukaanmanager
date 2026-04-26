import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const TEMPLATES = [
  { id:'sale',     emoji:'🎉', title:'Sale / Offer',      hint:'20% off aaj sirf!' },
  { id:'festival', emoji:'🪔', title:'Festival Greeting', hint:'Diwali / Holi / Eid' },
  { id:'newstock', emoji:'📦', title:'Naya Stock',        hint:'Nayi items aa gayi' },
  { id:'reminder', emoji:'💰', title:'Udhar Reminder',    hint:'Balance reminder' },
  { id:'loyalty',  emoji:'❤️', title:'Loyal Customer',    hint:'Special discount' },
  { id:'custom',   emoji:'✏️', title:'Custom',            hint:'Apna prompt likhein' },
]
const FESTIVALS = ['Diwali','Holi','Eid','Christmas','New Year','Navratri','Raksha Bandhan','Dussehra','Makar Sankranti']

export default function AIMarketing({ shop }) {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [template, setTemplate] = useState('sale')
  const [offerText, setOfferText] = useState('')
  const [festival, setFestival] = useState('Diwali')
  const [customPrompt, setCustomPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedMsg, setGeneratedMsg] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [activeTab, setActiveTab] = useState('create')
  const [campaignName, setCampaignName] = useState('')

  useEffect(() => { loadData() }, [shop.id])

  const loadData = async () => {
    const [{ data: c }, { data: p }, { data: camp }] = await Promise.all([
      supabase.from('customers').select('*').eq('shop_id', shop.id).order('name'),
      supabase.from('products').select('name,retail_price').eq('shop_id', shop.id).limit(10),
      supabase.from('marketing_campaigns').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(20),
    ])
    setCustomers(c || [])
    setProducts(p || [])
    setCampaigns(camp || [])
    setSelectedIds((c || []).filter(x => x.phone).map(x => x.id))
  }

  const visibleCustomers = customers.filter(c => {
    if (!c.phone) return false
    if (filterType === 'retail') return c.type === 'retail'
    if (filterType === 'wholesale') return c.type === 'wholesale'
    if (filterType === 'udhar') return (c.balance || 0) > 0
    return true
  })

  const generateMessage = async () => {
    setGenerating(true)
    const tmpl = TEMPLATES.find(t => t.id === template)

    const prompts = {
      sale:     `Ek catchy WhatsApp sale promo message banao Hindi mein. Dukaan: ${shop.name}. Offer: ${offerText || '20% off'}. Max 5 lines. Emojis use karo.`,
      festival: `Ek warm ${festival} greeting message banao Hindi mein dukaan ${shop.name} ki taraf se. Special offer include karo: ${offerText || 'khas discount'}. Max 5 lines.`,
      newstock: `Ek exciting naye stock announcement message banao Hindi mein. Dukaan: ${shop.name}. Naye items: ${products.slice(0,4).map(p=>p.name).join(', ')||'bahut kuch naya'}. Max 4 lines.`,
      reminder: `Ek polite udhar reminder message banao Hindi mein. Dukaan: ${shop.name}. Amount: ${offerText || 'kuch baaki hai'}. Rude nahi, soft tone. Max 4 lines.`,
      loyalty:  `Ek warm loyal customer appreciation message banao Hindi mein. Dukaan: ${shop.name}. Special offer: ${offerText || '10% special discount sirf aapke liye'}. Max 4 lines.`,
      custom:   customPrompt || `Ek WhatsApp promo banao ${shop.name} ke liye Hindi mein.`,
    }

    const prompt = prompts[template]

    try {
      const geminiKey = import.meta.env.VITE_GEMINI_KEY
      if (geminiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt + '\n\nSirf message do, koi explanation nahi.' }] }],
              generationConfig: { maxOutputTokens: 250, temperature: 0.9 }
            })
          }
        )
        const d = await res.json()
        const txt = d?.candidates?.[0]?.content?.parts?.[0]?.text
        if (txt) { setGeneratedMsg(txt.trim()); setGenerating(false); return }
      }
    } catch(e) { console.log('Gemini error:', e) }

    // Fallback messages
    const fallbacks = {
      sale:     `🎉 *${shop.name}* mein Mega Sale!\n\n🔥 ${offerText || 'Sab items pe khaas discount!'}\n\nAaj hi aayein! Offer limited time ke liye hai. 🏃\n📍 ${shop.city || 'Hamare paas'}`,
      festival: `🪔 *${festival} ki Hardik Shubhkamnayen!*\n\n${shop.name} ki taraf se aap aur aapke parivar ko ❤️\n\n✨ ${offerText || 'Is tyohar par khaas offer hai!'}\n\nAayein aur khushi se khareeddaari karein! 🎊`,
      newstock: `📦 *Naya Stock Aa Gaya!*\n\n${shop.name} mein abhi available:\n${products.slice(0,4).map(p=>'• '+p.name).join('\n') || '• Bahut saari nai cheezein!'}\n\n🏃 Jaldi aayein, limited stock!`,
      reminder: `Namaste! 🙏\n\n*${shop.name}* ki taraf se yaad dila rahe hain.\n💰 ${offerText || 'Aapka thoda amount baaki hai.'}\n\nKripya jald se jald clear karein. Dhanyawad! 🙏`,
      loyalty:  `❤️ *Aapka Bahut Shukriya!*\n\nAap hamare sabse khas customer hain! 🌟\n\n*${offerText || '10% special discount sirf aapke liye!'}*\n\n- ${shop.name} 🏪`,
      custom:   `🎉 *${shop.name}*\n\n${offerText || 'Khaas offer aapke liye!'}\n\nAaj hi aayein! 🙏`,
    }
    setGeneratedMsg(fallbacks[template])
    setGenerating(false)
  }

  const sendBulk = async () => {
    if (!generatedMsg) return alert('Pehle message generate karein!')
    const toSend = visibleCustomers.filter(c => selectedIds.includes(c.id) && c.phone)
    if (!toSend.length) return alert('Koi customer select nahi!')

    setSending(true); setSentCount(0)
    for (let i = 0; i < toSend.length; i++) {
      window.open(`https://wa.me/91${toSend[i].phone}?text=${encodeURIComponent(generatedMsg)}`, '_blank')
      setSentCount(i + 1)
      await new Promise(r => setTimeout(r, 1000))
    }

    // Save campaign
    await supabase.from('marketing_campaigns').insert({
      shop_id: shop.id,
      campaign_name: campaignName || `${TEMPLATES.find(t=>t.id===template)?.title} - ${new Date().toLocaleDateString('en-IN')}`,
      message: generatedMsg,
      sent_to: toSend.length,
      campaign_type: template,
    })

    setSending(false)
    loadData()
    alert(`✅ ${toSend.length} customers ko message bheja!`)
  }

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', background:'#fafffe', width:'100%', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" }

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:4 }}>🎨 AI Marketing</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>AI se promo banao aur WhatsApp pe customers ko bhejo</div>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['create','✏️ Create'],['send','📤 Send'],['history','📊 History']].map(([v,l])=>(
          <button key={v} onClick={()=>setActiveTab(v)} style={{ background:activeTab===v?C.g:'#fff', color:activeTab===v?'#fff':C.text, border:`1.5px solid ${activeTab===v?C.g:C.border}`, borderRadius:20, padding:'7px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
        ))}
      </div>

      {/* ── CREATE ── */}
      {activeTab === 'create' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div>
            <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:16 }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, marginBottom:14 }}>📋 Template Chunein</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {TEMPLATES.map(t=>(
                  <button key={t.id} onClick={()=>setTemplate(t.id)} style={{ background:template===t.id?C.gXL:'#fafafa', border:`2px solid ${template===t.id?C.g:C.border}`, borderRadius:12, padding:'10px 14px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:18 }}>{t.emoji}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12, color:template===t.id?C.gD:C.text }}>{t.title}</div>
                      <div style={{ fontSize:10, color:C.muted }}>{t.hint}</div>
                    </div>
                    {template===t.id && <span style={{ marginLeft:'auto', color:C.g, fontWeight:900 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, marginBottom:14 }}>⚙️ Details</div>

              {template === 'festival' && (
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:5 }}>Festival</label>
                  <select value={festival} onChange={e=>setFestival(e.target.value)} style={inp}>
                    {FESTIVALS.map(f=><option key={f}>{f}</option>)}
                  </select>
                </div>
              )}

              {template === 'custom' && (
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:5 }}>Apna Prompt</label>
                  <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} placeholder="Jaise: Ek funny message banao sugar ke offer ke liye Hindi mein..." rows={3} style={{ ...inp, resize:'vertical' }}/>
                </div>
              )}

              <div style={{ marginBottom:14 }}>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:5 }}>
                  {template==='reminder'?'Amount/Details':template==='loyalty'?'Special Offer':'Offer / Extra Details'}
                </label>
                <input value={offerText} onChange={e=>setOfferText(e.target.value)}
                  placeholder={template==='reminder'?'₹540 baaki hai':template==='sale'?'20% off aaj sirf!':'Kuch add karna ho...'}
                  style={inp}/>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:5 }}>Campaign Name (optional)</label>
                <input value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Jaise: Diwali Sale 2025" style={inp}/>
              </div>

              <button onClick={generateMessage} disabled={generating} style={{ width:'100%', background:generating?C.muted:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:12, padding:13, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, cursor:generating?'not-allowed':'pointer' }}>
                {generating ? '⏳ AI likh raha hai...' : '🤖 AI se Message Banao'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:16 }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, marginBottom:14 }}>👁️ Preview</div>
              {generatedMsg ? (
                <>
                  <div style={{ background:'#dcf8c6', borderRadius:'4px 16px 16px 16px', padding:'14px 16px', fontSize:13, lineHeight:1.8, whiteSpace:'pre-wrap', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', minHeight:100 }}>{generatedMsg}</div>
                  <textarea value={generatedMsg} onChange={e=>setGeneratedMsg(e.target.value)} rows={5} style={{ ...inp, marginTop:10, fontSize:12, resize:'vertical' }}/>
                </>
              ) : (
                <div style={{ background:'#f9fafb', borderRadius:12, padding:40, textAlign:'center', color:C.muted }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🤖</div>
                  <div>AI message yahaan dikhega</div>
                </div>
              )}
            </div>

            {generatedMsg && (
              <div style={{ background:'#fff', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight:800, fontSize:13, marginBottom:10 }}>🚀 Quick Actions</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>{ navigator.clipboard.writeText(generatedMsg); alert('Copied!') }} style={{ flex:1, background:'#f3f4f6', color:C.text, border:'none', borderRadius:10, padding:'9px', fontSize:12, fontWeight:700, cursor:'pointer' }}>📋 Copy</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(generatedMsg)}`} target="_blank" rel="noreferrer" style={{ flex:1, background:'#25d366', color:'#fff', borderRadius:10, padding:'9px', fontSize:12, fontWeight:700, textDecoration:'none', textAlign:'center', display:'block' }}>📱 WA Share</a>
                  <button onClick={()=>setActiveTab('send')} style={{ flex:1, background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'9px', fontSize:12, fontWeight:700, cursor:'pointer' }}>📤 Bulk Send</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SEND ── */}
      {activeTab === 'send' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15 }}>👥 Customers Select Karein</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>setSelectedIds(visibleCustomers.map(c=>c.id))} style={{ background:C.gXL, color:C.g, border:'none', borderRadius:8, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>✅ All</button>
                <button onClick={()=>setSelectedIds([])} style={{ background:C.redL, color:C.red, border:'none', borderRadius:8, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>❌ Clear</button>
              </div>
            </div>

            <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
              {[['all','🌐 All'],['retail','🛒 Retail'],['wholesale','📦 Wholesale'],['udhar','📒 Udhar wale']].map(([v,l])=>(
                <button key={v} onClick={()=>setFilterType(v)} style={{ background:filterType===v?C.g:'#fff', color:filterType===v?'#fff':C.text, border:`1.5px solid ${filterType===v?C.g:C.border}`, borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{l}</button>
              ))}
            </div>

            <div style={{ maxHeight:400, overflowY:'auto' }}>
              {visibleCustomers.map(c=>(
                <div key={c.id} onClick={()=>setSelectedIds(prev=>prev.includes(c.id)?prev.filter(x=>x!==c.id):[...prev,c.id])}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', cursor:'pointer', background:selectedIds.includes(c.id)?C.gXL:'#fff', borderRadius:10, marginBottom:4, border:`1px solid ${selectedIds.includes(c.id)?C.g:C.border}`, transition:'all 0.1s' }}>
                  <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>{}} style={{ cursor:'pointer', width:16, height:16 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>📞 {c.phone} • {c.type}</div>
                  </div>
                  {c.balance>0 && <span style={{ background:C.redL, color:C.red, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>₹{c.balance}</span>}
                </div>
              ))}
              {visibleCustomers.length===0 && <div style={{ textAlign:'center', padding:30, color:C.muted }}>Koi customer nahi</div>}
            </div>
          </div>

          <div>
            <div style={{ background:'#fff', borderRadius:16, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:14 }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:10 }}>📨 Message Preview</div>
              {generatedMsg
                ? <div style={{ background:'#dcf8c6', borderRadius:12, padding:'10px 14px', fontSize:12, lineHeight:1.6, whiteSpace:'pre-wrap', maxHeight:180, overflowY:'auto' }}>{generatedMsg}</div>
                : <div style={{ background:C.goldL, borderRadius:10, padding:'10px 14px', fontSize:12, color:C.gold, fontWeight:700 }}>⚠️ Pehle Create tab se message banao!</div>
              }
            </div>

            <div style={{ background:'#fff', borderRadius:16, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                <span style={{ fontWeight:700 }}>Selected:</span>
                <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.g, fontSize:18 }}>{visibleCustomers.filter(c=>selectedIds.includes(c.id)).length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, fontSize:13 }}>
                <span style={{ fontWeight:700 }}>Phone wale:</span>
                <span style={{ fontWeight:700, color:C.g }}>{visibleCustomers.filter(c=>selectedIds.includes(c.id)&&c.phone).length}</span>
              </div>

              {sending && (
                <div style={{ background:C.gXL, borderRadius:10, padding:'10px 14px', marginBottom:12 }}>
                  <div style={{ fontWeight:700, color:C.g, fontSize:12 }}>📤 Bhej raha hoon... {sentCount}/{visibleCustomers.filter(c=>selectedIds.includes(c.id)).length}</div>
                  <div style={{ background:'#fff', borderRadius:4, height:6, marginTop:6, overflow:'hidden' }}>
                    <div style={{ background:C.g, height:'100%', width:`${(sentCount/Math.max(visibleCustomers.filter(c=>selectedIds.includes(c.id)).length,1))*100}%`, transition:'width 0.3s' }}/>
                  </div>
                </div>
              )}

              <button onClick={sendBulk} disabled={sending||!generatedMsg} style={{ width:'100%', background:sending||!generatedMsg?C.muted:'#25d366', color:'#fff', border:'none', borderRadius:12, padding:13, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:14, cursor:sending||!generatedMsg?'not-allowed':'pointer' }}>
                {sending ? '⏳ Bhej raha hoon...' : `📱 ${visibleCustomers.filter(c=>selectedIds.includes(c.id)).length} Ko WhatsApp Bhejo`}
              </button>
              <div style={{ fontSize:10, color:C.muted, textAlign:'center', marginTop:6 }}>Har customer ka WA ek ek karke khulega</div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'history' && (
        <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.gXL}`, fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15 }}>📊 Campaign History</div>
          {campaigns.length === 0
            ? <div style={{ padding:40, textAlign:'center', color:C.muted }}><div style={{ fontSize:40, marginBottom:8 }}>📊</div>Abhi koi campaign nahi — Create tab se banao!</div>
            : campaigns.map((camp,i)=>(
              <div key={camp.id} style={{ padding:'14px 18px', borderTop:i>0?`1px solid ${C.gXL}`:'none', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{camp.campaign_name}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{camp.created_at?.slice(0,10)} • {camp.campaign_type}</div>
                  <div style={{ fontSize:12, color:C.text, marginTop:4, maxWidth:400, lineHeight:1.4 }}>{camp.message?.slice(0,80)}...</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:C.g }}>{camp.sent_to}</div>
                  <div style={{ fontSize:11, color:C.muted }}>customers ko bheja</div>
                  <button onClick={()=>{setGeneratedMsg(camp.message);setActiveTab('send')}} style={{ marginTop:6, background:C.gXL, color:C.g, border:'none', borderRadius:8, padding:'4px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>🔁 Dobara Send</button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}