import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function Dashboard({ shop }) {
  const [stats, setStats] = useState({ cash:0, upi:0, udhar:0, total:0, bills:0 })
  const [lowStock, setLowStock] = useState([])
  const [totalUdhar, setTotalUdhar] = useState(0)
  const [chart, setChart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [shop.id])

  const loadAll = async () => {
    const today = new Date().toISOString().slice(0,10)
    // Today's invoices
    const { data: inv } = await supabase.from('invoices').select('total,pay_mode').eq('shop_id', shop.id).eq('bill_date', today)
    if (inv) {
      const s = inv.reduce((acc,i)=>{ acc.total+=i.total; acc.bills++; acc[i.pay_mode]=(acc[i.pay_mode]||0)+i.total; return acc },{ cash:0, upi:0, bank:0, udhar:0, total:0, bills:0 })
      setStats(s)
    }
    // Low stock products
    const { data: prods } = await supabase.from('products').select('id,name,stock,min_stock,unit').eq('shop_id', shop.id).lte('stock', supabase.raw ? 10 : 10)
    if (prods) setLowStock(prods.filter(p => !p.is_service && p.stock <= p.min_stock))
    // Total udhar
    const { data: custs } = await supabase.from('customers').select('balance').eq('shop_id', shop.id)
    if (custs) setTotalUdhar(custs.reduce((s,c)=>s+(c.balance||0),0))
    // 7 day chart
    const days = []
    for (let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i)
      const dateStr = d.toISOString().slice(0,10)
      const label = d.toLocaleDateString('en-IN',{weekday:'short'})
      const { data: dayInv } = await supabase.from('invoices').select('total').eq('shop_id', shop.id).eq('bill_date', dateStr)
      days.push({ label, total: dayInv ? dayInv.reduce((s,x)=>s+x.total,0) : 0, isToday: i===0 })
    }
    setChart(days)
    setLoading(false)
  }

  if (loading) return <div style={{ textAlign:'center', padding:60, color:C.muted }}>⏳ Loading...</div>

  const maxBar = Math.max(...chart.map(d=>d.total), 1)
  const Stat = ({icon,label,value,sub,accent}) => (
    <div style={{ background:C.card, borderRadius:14, padding:'16px 18px', flex:'1 1 140px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${accent}` }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.text, marginTop:4 }}>{value}</div>
      <div style={{ fontWeight:700, fontSize:12, color:C.text }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.muted }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:20 }}>🏠 Dashboard</div>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:24 }}>
        <Stat icon="💵" label="Aaj Cash" value={`₹${stats.cash||0}`} sub={`${stats.bills} bills`} accent={C.g} />
        <Stat icon="📱" label="Aaj UPI/Bank" value={`₹${(stats.upi||0)+(stats.bank||0)}`} sub="Digital payment" accent={C.blue} />
        <Stat icon="📒" label="Aaj Udhar" value={`₹${stats.udhar||0}`} sub="Khate mein" accent={C.gold} />
        <Stat icon="💰" label="Aaj Total" value={`₹${stats.total||0}`} sub="Kul kamai" accent='#7c3aed' />
        <Stat icon="🔴" label="Total Baaki" value={`₹${totalUdhar}`} sub="Sab customers" accent={C.red} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
        <div style={{ background:C.card, borderRadius:16, padding:22, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:16, marginBottom:18, color:C.text }}>📈 Pichle 7 Din ki Kamai</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:140 }}>
            {chart.map((d,i)=>(
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                {d.total>0 && <div style={{ fontSize:9, fontWeight:700, color:C.g }}>₹{d.total}</div>}
                <div style={{ width:'100%', borderRadius:'6px 6px 0 0', background:d.isToday?C.g:`rgba(22,163,74,${0.25+0.6*(d.total/maxBar)})`, height:`${Math.max(6,(d.total/maxBar)*120)}px`, transition:'height 0.3s' }} />
                <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:C.card, borderRadius:16, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:14, marginBottom:12, color:C.text }}>⚠️ Low Stock Alert</div>
          {lowStock.length===0
            ? <div style={{ textAlign:'center', padding:20, color:C.g, fontWeight:700 }}>✅ Sab OK!</div>
            : lowStock.map(p=>(
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.gXL}`, alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{p.name}</span>
                <span style={{ background:p.stock===0?C.redL:C.goldL, color:p.stock===0?C.red:C.gold, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>
                  {p.stock===0 ? 'Out!' : `${p.stock} left`}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
