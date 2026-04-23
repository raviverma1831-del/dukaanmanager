import { C } from '../lib/constants.js'

const TABS = [
  { id:'dashboard', emoji:'🏠', label:'Dashboard' },
  { id:'ai',        emoji:'🤖', label:'AI Chat' },
  { id:'billing',   emoji:'🧾', label:'Billing' },
  { id:'inventory', emoji:'📦', label:'Inventory' },
  { id:'khata',     emoji:'📒', label:'Khata' },
  { id:'suppliers', emoji:'🚚', label:'Suppliers' },
]

export default function Layout({ shop, tab, setTab, onSignOut, children }) {
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:'100vh', background:C.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <header style={{ background:`linear-gradient(135deg,${C.gD} 0%,${C.g} 100%)`, padding:'0 20px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:22 }}>{shop.biz_emoji||'🏪'}</span>
            <div>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:17, color:'#fff', lineHeight:1.1 }}>{shop.name}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>{shop.biz_label} {shop.city?`• ${shop.city}`:''}</div>
            </div>
          </div>
          <nav style={{ display:'flex', gap:3, flexWrap:'wrap', alignItems:'center' }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?'rgba(255,255,255,0.2)':'transparent', color:tab===t.id?'#fff':'rgba(255,255,255,0.7)', border:`1px solid ${tab===t.id?'rgba(255,255,255,0.35)':'transparent'}`, borderRadius:9, padding:'6px 12px', fontWeight:tab===t.id?800:600, fontSize:12, cursor:'pointer', fontFamily:"'Baloo 2',cursive", display:'flex', alignItems:'center', gap:4 }}>
                {t.emoji} {t.label}
              </button>
            ))}
            <button onClick={onSignOut} title="Sign Out" style={{ background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', border:'none', borderRadius:9, padding:'6px 10px', fontSize:12, cursor:'pointer', marginLeft:4 }}>⏏️</button>
          </nav>
        </div>
      </header>
      <main style={{ maxWidth:1200, margin:'0 auto', padding:'24px 16px' }}>
        {children}
      </main>
    </div>
  )
}
