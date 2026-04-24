import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function SalesReport({ shop }) {
  const [period, setPeriod] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadReport() }, [period, shop.id])

  const getRange = () => {
    const today = new Date()
    const todayStr = today.toISOString().slice(0,10)
    if (period === 'today') return [todayStr, todayStr]
    if (period === 'week') { const d = new Date(); d.setDate(d.getDate()-7); return [d.toISOString().slice(0,10), todayStr] }
    if (period === 'month') { const d = new Date(); d.setDate(1); return [d.toISOString().slice(0,10), todayStr] }
    return [todayStr, todayStr]
  }

  const loadReport = async () => {
    setLoading(true)
    const [from, to] = getRange()
    const [{ data: sales }, { data: purchases }, { data: customers }, { data: products }] = await Promise.all([
      supabase.from('invoices').select('total,pay_mode,bill_date').eq('shop_id', shop.id).gte('bill_date', from).lte('bill_date', to),
      supabase.from('purchases').select('total,purchase_date').eq('shop_id', shop.id).gte('purchase_date', from).lte('purchase_date', to),
      supabase.from('customers').select('balance').eq('shop_id', shop.id),
      supabase.from('products').select('name,stock,min_stock,retail_price,is_service').eq('shop_id', shop.id)
    ])
    const totalSales = sales?.reduce((s,i)=>s+i.total,0)||0
    const cashSales = sales?.filter(s=>s.pay_mode==='cash').reduce((s,i)=>s+i.total,0)||0
    const upiSales = sales?.filter(s=>['upi','bank'].includes(s.pay_mode)).reduce((s,i)=>s+i.total,0)||0
    const udharSales = sales?.filter(s=>s.pay_mode==='udhar').reduce((s,i)=>s+i.total,0)||0
    const totalPurchases = purchases?.reduce((s,i)=>s+i.total,0)||0
    const totalUdhar = customers?.reduce((s,c)=>s+(c.balance||0),0)||0
    const lowStock = products?.filter(p=>!p.is_service&&p.stock<=p.min_stock)||[]
    const outOfStock = products?.filter(p=>!p.is_service&&p.stock===0)||[]
    const grossProfit = totalSales - totalPurchases
    setData({ totalSales, cashSales, upiSales, udharSales, totalPurchases, grossProfit, totalUdhar, lowStock, outOfStock, billCount: sales?.length||0, purchaseCount: purchases?.length||0 })
    setLoading(false)
  }

  const StatBox = ({ icon, label, value, accent, sub }) => (
    <div style={{ background:'#fff', borderRadius:14, padding:'16px 18px', flex:'1 1 130px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${accent}` }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.text, marginTop:4 }}>{value}</div>
      <div style={{ fontWeight:700, fontSize:12, color:C.text }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.muted }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {[['today','Aaj'],['week','7 Din'],['month','Is Mahine']].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriod(v)} style={{ background:period===v?C.g:'#fff', color:period===v?'#fff':C.text, border:`1.5px solid ${period===v?C.g:C.border}`, borderRadius:20, padding:'6px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign:'center', padding:60, color:C.muted }}>⏳ Loading...</div> : data && (
        <>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
            <StatBox icon="💰" label="Kul Kamai" value={`₹${data.totalSales.toFixed(0)}`} sub={`${data.billCount} bills`} accent={C.g}/>
            <StatBox icon="💵" label="Cash" value={`₹${data.cashSales.toFixed(0)}`} accent={C.g}/>
            <StatBox icon="📱" label="UPI/Bank" value={`₹${data.upiSales.toFixed(0)}`} accent='#1d4ed8'/>
            <StatBox icon="📒" label="Udhar" value={`₹${data.udharSales.toFixed(0)}`} accent={C.gold}/>
            <StatBox icon="🛒" label="Purchases" value={`₹${data.totalPurchases.toFixed(0)}`} sub={`${data.purchaseCount} orders`} accent='#7c3aed'/>
            <StatBox icon="📈" label="Gross Profit" value={`₹${data.grossProfit.toFixed(0)}`} accent={data.grossProfit>=0?C.g:'#dc2626'}/>
            <StatBox icon="🔴" label="Total Udhar" value={`₹${data.totalUdhar.toFixed(0)}`} accent='#dc2626'/>
          </div>

          <div style={{ background:'#fff', borderRadius:16, padding:20, marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:16, color:C.text, marginBottom:16 }}>📋 Profit & Loss</div>
            {[['Total Sales (Revenue)', data.totalSales, C.g, false],['Total Purchases (Cost)', data.totalPurchases, '#dc2626', false],['Gross Profit', data.grossProfit, data.grossProfit>=0?C.g:'#dc2626', true]].map(([label,val,color,bold])=>(
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:bold?C.gXL:'#fafafa', borderRadius:10, marginBottom:8, borderLeft:`3px solid ${color}` }}>
                <span style={{ fontWeight:bold?900:700, fontSize:14 }}>{label}</span>
                <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color }}>{val>=0?'+':''}{val.toFixed(0)}</span>
              </div>
            ))}
          </div>

          {(data.lowStock.length>0||data.outOfStock.length>0) && (
            <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:15, marginBottom:12 }}>⚠️ Stock Alerts</div>
              {data.outOfStock.length>0 && <div style={{ background:C.redL, borderRadius:12, padding:'10px 14px', marginBottom:8 }}><div style={{ fontWeight:800, color:C.red, marginBottom:4 }}>❌ Out of Stock</div><div style={{ fontSize:12 }}>{data.outOfStock.map(p=>p.name).join(' • ')}</div></div>}
              {data.lowStock.filter(p=>p.stock>0).length>0 && <div style={{ background:C.goldL, borderRadius:12, padding:'10px 14px' }}><div style={{ fontWeight:800, color:C.gold, marginBottom:4 }}>⚠️ Low Stock</div><div style={{ fontSize:12 }}>{data.lowStock.filter(p=>p.stock>0).map(p=>p.name+' ('+p.stock+')').join(' • ')}</div></div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
