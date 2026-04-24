import { C } from '../lib/constants.js'

const TABS = [
  { id:'dashboard', emoji:'🏠', label:'Dashboard' },
  { id:'ai',        emoji:'🤖', label:'AI Chat' },
  { id:'billing',   emoji:'🧾', label:'Billing' },
  { id:'inventory', emoji:'📦', label:'Inventory' },
  { id:'purchases', emoji:'🛒', label:'Purchases' },
  { id:'khata',     emoji:'📒', label:'Khata' },
  { id:'suppliers', emoji:'🚚', label:'Suppliers' },
  { id:'expenses',  emoji:'💸', label:'Expenses' },
  { id:'reports',   emoji:'📊', label:'Reports' },
  { id:'promo',     emoji:'🔥', label:'Promos' },
  { id:'whatsapp',  emoji:'💬', label:'WhatsApp' },
  { id:'b2b',       emoji:'🤝', label:'B2B' },
  { id:'recovery',  emoji:'📞', label:'Recovery' },
  { id:'settings',  emoji:'⚙️', label:'Settings' },
]

export default function Layout({ shop, tab, setTab, onSignOut, children }) {
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:'100vh', background:'#f0fdf4' }}>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <header style={{ background:`linear-gradient(135deg,#14532d 0%,#16a34a 100%)`, padding:'0 20px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1300, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ fontSize:22 }}>{shop.biz_emoji||'🏪'}</span>
            <div>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:16, color:'#fff', lineHeight:1.1 }}>{shop.name}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>{shop.biz_label}{shop.city?` • ${shop.city}`:''}</div>
            </div>
          </div>

          <nav style={{ display:'flex', gap:2, flexWrap:'wrap', alignItems:'center', flex:1, justifyContent:'center' }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                background:tab===t.id?'rgba(255,255,255,0.2)':'transparent',
                color:tab===t.id?'#fff':'rgba(255,255,255,0.7)',
                border:`1px solid ${tab===t.id?'rgba(255,255,255,0.35)':'transparent'}`,
                borderRadius:9, padding:'5px 10px',
                fontWeight:tab===t.id?800:600, fontSize:11,
                cursor:'pointer', fontFamily:"'Baloo 2',cursive",
                display:'flex', alignItems:'center', gap:4
              }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </nav>

          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={()=>setTab('settings')} title="Shop Settings" style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:9, padding:'6px 12px', fontSize:12, cursor:'pointer', fontWeight:700 }}>
              ⚙️ Edit Shop
            </button>
            <button onClick={onSignOut} title="Logout" style={{ background:'rgba(220,38,38,0.3)', color:'#fff', border:'1px solid rgba(220,38,38,0.5)', borderRadius:9, padding:'6px 12px', fontSize:12, cursor:'pointer', fontWeight:700 }}>
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1300, margin:'0 auto', padding:'24px 16px' }}>
        {children}
      </main>
    </div>
  )
}
