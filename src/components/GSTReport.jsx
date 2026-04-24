import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function GSTReport({ shop }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadGSTData() }, [month, shop.id])

  const loadGSTData = async () => {
    setLoading(true)
    const from = month + '-01'
    const lastDay = new Date(month.split('-')[0], month.split('-')[1], 0).getDate()
    const to = month + '-' + String(lastDay).padStart(2,'0')

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('shop_id', shop.id)
      .gte('bill_date', from)
      .lte('bill_date', to)
      .order('bill_date')

    const inv = invoices || []

    const b2b = inv.filter(i => i.invoice_type === 'B2B')
    const b2c = inv.filter(i => i.invoice_type !== 'B2B')

    const totalTaxable = inv.reduce((s,i) => s+(i.subtotal||0), 0)
    const totalCgst    = inv.reduce((s,i) => s+(i.cgst||0), 0)
    const totalSgst    = inv.reduce((s,i) => s+(i.sgst||0), 0)
    const totalIgst    = inv.reduce((s,i) => s+(i.igst||0), 0)
    const totalGst     = inv.reduce((s,i) => s+(i.total_gst||0), 0)
    const totalSales   = inv.reduce((s,i) => s+(i.total||0), 0)

    // Rate-wise breakup
    const rateWise = {}
    inv.forEach(inv => {
      (inv.invoice_items||[]).forEach(item => {
        const rate = item.gst_rate || 0
        if (!rateWise[rate]) rateWise[rate] = { taxable:0, cgst:0, sgst:0, igst:0, count:0 }
        rateWise[rate].taxable += item.taxable_amount||0
        rateWise[rate].cgst    += item.cgst_amount||0
        rateWise[rate].sgst    += item.sgst_amount||0
        rateWise[rate].igst    += item.igst_amount||0
        rateWise[rate].count   += 1
      })
    })

    setData({ inv, b2b, b2c, totalTaxable, totalCgst, totalSgst, totalIgst, totalGst, totalSales, rateWise })
    setLoading(false)
  }

  const Row = ({ label, val, accent, bold }) => (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom:`1px solid ${C.gXL}`, background: bold ? C.gXL : 'transparent' }}>
      <span style={{ fontWeight: bold?800:600, fontSize:13 }}>{label}</span>
      <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:accent||C.text }}>₹{val.toFixed(2)}</span>
    </div>
  )

  if (!shop.gst_type || shop.gst_type === 'unregistered') return (
    <div style={{ background:'#fff', borderRadius:16, padding:32, textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:18, color:C.gD }}>GST Report Available Nahi</div>
      <div style={{ color:C.muted, marginTop:8, fontSize:14 }}>Settings mein GST Registration enable karein</div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD }}>📋 GST Report</div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{ border:`1.5px solid ${C.border}`, borderRadius:10, padding:'8px 12px', fontSize:13, outline:'none' }}/>
          <button onClick={()=>window.print()} style={{ background:'#1d4ed8', color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>🖨️ Print</button>
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:60, color:C.muted }}>⏳ Loading...</div> : data && (
        <>
          {/* Summary Cards */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
            {[
              ['💰','Total Sales', data.totalSales, C.g],
              ['📊','Taxable Amount', data.totalTaxable, C.blue],
              ['🏛️','Total GST', data.totalGst, '#7c3aed'],
              ['📄','B2B Invoices', data.b2b.length+' bills', '#0891b2'],
              ['🛒','B2C Invoices', data.b2c.length+' bills', C.gold],
            ].map(([ic,lb,val,col])=>(
              <div key={lb} style={{ background:'#fff', borderRadius:14, padding:'16px 18px', flex:'1 1 130px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${col}` }}>
                <div style={{ fontSize:20 }}>{ic}</div>
                <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:C.text, marginTop:4 }}>{typeof val==='number'?`₹${val.toFixed(0)}`:val}</div>
                <div style={{ fontWeight:700, fontSize:11, color:C.muted }}>{lb}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            {/* GSTR-1 Summary */}
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ padding:'14px 16px', background:C.gXL, fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.gD }}>📤 Output Tax (GSTR-1)</div>
              <Row label="Taxable Amount" val={data.totalTaxable} accent={C.g}/>
              <Row label="CGST (Output)" val={data.totalCgst} accent='#0369a1'/>
              <Row label="SGST (Output)" val={data.totalSgst} accent='#0369a1'/>
              <Row label="IGST (Output)" val={data.totalIgst} accent='#7c3aed'/>
              <Row label="Total Output Tax" val={data.totalGst} accent='#dc2626' bold/>
            </div>

            {/* Rate-wise Breakup */}
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ padding:'14px 16px', background:'#f0f9ff', fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#0369a1' }}>📊 Rate-wise Breakup</div>
              {Object.entries(data.rateWise).sort(([a],[b])=>+a-+b).map(([rate, vals])=>(
                <div key={rate} style={{ padding:'10px 14px', borderBottom:`1px solid ${C.gXL}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontWeight:800, fontSize:13 }}>{rate==='0'?'Nil/Exempt':rate+'% GST'}</span>
                    <span style={{ fontWeight:700, fontSize:12, color:C.muted }}>{vals.count} items</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#0369a1' }}>
                    <span>Taxable: ₹{vals.taxable.toFixed(0)}</span>
                    <span>GST: ₹{(vals.cgst+vals.sgst+vals.igst).toFixed(0)}</span>
                  </div>
                </div>
              ))}
              {Object.keys(data.rateWise).length===0 && <div style={{ padding:20, textAlign:'center', color:C.muted, fontSize:13 }}>Is mahine koi GST bill nahi</div>}
            </div>
          </div>

          {/* Invoice List */}
          <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.gXL}`, fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.text, fontSize:15 }}>
              📋 Invoice List ({data.inv.length})
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:C.gXL }}>
                    {['Invoice No','Date','Customer','Type','Taxable','CGST','SGST','IGST','Total'].map(h=>(
                      <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:800, color:C.gD, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.inv.map((inv,i)=>(
                    <tr key={inv.id} style={{ borderTop:`1px solid ${C.gXL}`, background:i%2===0?'#fafffe':'#fff' }}>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:'#0369a1', fontWeight:700 }}>{inv.invoice_number||'—'}</td>
                      <td style={{ padding:'9px 12px' }}>{inv.bill_date}</td>
                      <td style={{ padding:'9px 12px', fontWeight:700 }}>{inv.customer_name}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ background:inv.invoice_type==='B2B'?C.blueL:C.gXL, color:inv.invoice_type==='B2B'?C.blue:C.g, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{inv.invoice_type||'B2C'}</span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>₹{(inv.subtotal||0).toFixed(0)}</td>
                      <td style={{ padding:'9px 12px', color:'#0369a1' }}>₹{(inv.cgst||0).toFixed(0)}</td>
                      <td style={{ padding:'9px 12px', color:'#0369a1' }}>₹{(inv.sgst||0).toFixed(0)}</td>
                      <td style={{ padding:'9px 12px', color:'#7c3aed' }}>₹{(inv.igst||0).toFixed(0)}</td>
                      <td style={{ padding:'9px 12px', fontFamily:"'Baloo 2',cursive", fontWeight:900, color:C.gD }}>₹{(inv.total||0).toFixed(0)}</td>
                    </tr>
                  ))}
                  {data.inv.length===0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:30, color:C.muted }}>Is mahine koi invoice nahi</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
