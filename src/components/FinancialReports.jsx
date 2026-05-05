import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function FinancialReports({ shop }) {
  const [reportType, setReportType] = useState('pl')
  const [period, setPeriod] = useState('fy')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef(null)

  useEffect(() => { loadData() }, [period, shop.id])

  const getRange = () => {
    const today = new Date()
    const t = today.toISOString().slice(0,10)
    if (period === 'today') return [t, t]
    if (period === 'week') { const d = new Date(); d.setDate(d.getDate()-7); return [d.toISOString().slice(0,10), t] }
    if (period === 'month') { const d = new Date(); d.setDate(1); return [d.toISOString().slice(0,10), t] }
    if (period === 'year') { const d = new Date(); d.setMonth(0,1); return [d.toISOString().slice(0,10), t] }
    if (period === 'fy') {
      const m = today.getMonth() // 0=Jan, 3=Apr
      const y = m >= 3 ? today.getFullYear() : today.getFullYear() - 1
      return [`${y}-04-01`, `${y+1}-03-31`]
    }
    return [t, t]
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [from, to] = getRange()

      const [{ data: sales }, { data: purchases }, { data: expData }, { data: customers }, { data: products }] = await Promise.all([
        supabase.from('invoices').select('total,pay_mode,subtotal,total_gst,bill_date').eq('shop_id', shop.id).gte('bill_date', from).lte('bill_date', to),
        supabase.from('purchases').select('total,purchase_date').eq('shop_id', shop.id).gte('purchase_date', from).lte('purchase_date', to),
        supabase.from('expenses').select('amount,category').eq('shop_id', shop.id).gte('created_at', from).lte('created_at', to+'T23:59:59'),
        supabase.from('customers').select('balance,type').eq('shop_id', shop.id),
        supabase.from('products').select('retail_price,stock,is_service').eq('shop_id', shop.id),
      ])

      // Load ERP tables (may not exist yet)
      const { data: assets } = await supabase.from('fixed_assets').select('current_value,purchase_value,asset_name').eq('shop_id', shop.id).catch(()=>({data:[]}))
      const { data: capitalRows } = await supabase.from('capital_accounts').select('amount,account_type').eq('shop_id', shop.id).catch(()=>({data:[]}))
      const { data: activeFY } = await supabase.from('financial_years').select('*').eq('shop_id', shop.id).eq('is_active', true).single().catch(()=>({data:null}))
      const { data: suppliers } = await supabase.from('suppliers').select('balance').eq('shop_id', shop.id).catch(()=>({data:[]}))

      const expenses = expData || []
      const totalSales     = (sales||[]).reduce((s,i)=>s+(i.total||0),0)
      const totalGstColl   = (sales||[]).reduce((s,i)=>s+(i.total_gst||0),0)
      const cashSales      = (sales||[]).filter(s=>s.pay_mode==='cash').reduce((s,i)=>s+(i.total||0),0)
      const digitalSales   = (sales||[]).filter(s=>['upi','bank'].includes(s.pay_mode)).reduce((s,i)=>s+(i.total||0),0)
      const udharSales     = (sales||[]).filter(s=>s.pay_mode==='udhar').reduce((s,i)=>s+(i.total||0),0)
      const totalPurchases = (purchases||[]).reduce((s,i)=>s+(i.total||0),0)
      const totalExpenses  = expenses.reduce((s,i)=>s+(i.amount||0),0)
      const expByCat       = expenses.reduce((acc,e)=>{acc[e.category]=(acc[e.category]||0)+(e.amount||0);return acc},{})
      const grossProfit    = totalSales - totalPurchases
      const grossMargin    = totalSales > 0 ? (grossProfit/totalSales*100) : 0
      const netProfit      = grossProfit - totalExpenses
      const netMargin      = totalSales > 0 ? (netProfit/totalSales*100) : 0

      // Balance Sheet — Real Data
      const totalUdhar       = (customers||[]).reduce((s,c)=>s+(c.balance||0),0)
      const inventoryValue   = (products||[]).filter(p=>!p.is_service).reduce((s,p)=>s+((p.stock||0)*(p.retail_price||0)),0)
      const fixedAssetsTotal = (assets||[]).reduce((s,a)=>s+(a.current_value||a.purchase_value||0),0)
      const openingCash      = activeFY?.opening_cash || 0
      const openingBank      = activeFY?.opening_bank || 0
      // Capital breakdown
      const ownerCapital     = (capitalRows||[]).filter(r=>r.account_type==='capital').reduce((s,r)=>s+(r.amount||0),0)
      const securedLoans     = (capitalRows||[]).filter(r=>r.account_type==='secured_loan').reduce((s,r)=>s+(r.amount||0),0)
      const unsecuredLoans   = (capitalRows||[]).filter(r=>r.account_type==='unsecured_loan').reduce((s,r)=>s+(r.amount||0),0)
      const creditorDues     = (suppliers||[]).reduce((s,sup)=>s+(sup.balance||0),0)

      // Cash in hand estimate = opening + cash sales + digital - purchases - expenses
      const estimatedCash = openingCash + cashSales - totalPurchases * 0.5

      const trialBalance = [
        { account:'Sales Revenue',         debit:0,              credit:totalSales,    type:'income' },
        { account:'Cost of Goods',         debit:totalPurchases, credit:0,             type:'expense' },
        { account:'Operating Expenses',    debit:totalExpenses,  credit:0,             type:'expense' },
        { account:'Cash & Bank Received',  debit:cashSales+digitalSales, credit:0,    type:'asset' },
        { account:'Debtors (Udhar)',       debit:totalUdhar,     credit:0,             type:'asset' },
        { account:'GST Collected',         debit:0,              credit:totalGstColl,  type:'liability' },
        { account:'Inventory',             debit:inventoryValue, credit:0,             type:'asset' },
        { account:'Fixed Assets',          debit:fixedAssetsTotal, credit:0,          type:'asset' },
        { account:'Owner Capital',         debit:0,              credit:ownerCapital,  type:'equity' },
        { account:'Loans (Secured)',        debit:0,              credit:securedLoans,  type:'liability' },
      ]
      const totalDebit  = trialBalance.reduce((s,t)=>s+t.debit,0)
      const totalCredit = trialBalance.reduce((s,t)=>s+t.credit,0)

      setData({
        from, to,
        totalSales, totalGstColl, cashSales, digitalSales, udharSales,
        totalPurchases, totalExpenses, expByCat,
        grossProfit, grossMargin, netProfit, netMargin,
        totalUdhar, inventoryValue, fixedAssetsTotal,
        openingCash, openingBank, estimatedCash,
        ownerCapital, securedLoans, unsecuredLoans, creditorDues,
        trialBalance, totalDebit, totalCredit,
        fyLabel: activeFY?.fy_label || '',
        assets: assets || [],
        billCount: (sales||[]).length, purchaseCount: (purchases||[]).length, expCount: expenses.length,
      })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const printReport = () => {
    const content = printRef.current?.innerHTML
    const win = window.open('','_blank')
    win.document.write(`<html><head><title>${shop.name} - Financial Report</title>
    <style>body{font-family:Arial;padding:24px;font-size:12px}h1,h2{color:#14532d}table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f0fdf4;font-weight:bold}.positive{color:#16a34a;font-weight:bold}.negative{color:#dc2626;font-weight:bold}.total-row{background:#f0fdf4;font-weight:bold}@media print{.no-print{display:none}}</style>
    </head><body>${content}</body></html>`)
    win.document.close(); win.print()
  }

  if (loading) return <div style={{ textAlign:'center', padding:60, color:C.muted }}>⏳ Loading...</div>
  if (!data) return null

  const REPORTS = [
    { id:'pl',       emoji:'📈', label:'P&L Statement' },
    { id:'balance',  emoji:'⚖️', label:'Balance Sheet' },
    { id:'trial',    emoji:'📋', label:'Trial Balance' },
    { id:'cashflow', emoji:'💵', label:'Cash Flow' },
  ]

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:C.gD }}>📊 Financial Reports</div>
          <div style={{ fontSize:12, color:C.muted }}>Period: {data.from} to {data.to}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[['fy','📅 FY (Apr-Mar)'],['today','Aaj'],['week','Week'],['month','Mahina'],['year','Cal Year']].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)} style={{ background:period===v?C.g:'#fff', color:period===v?'#fff':C.text, border:`1.5px solid ${period===v?C.g:C.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{l}</button>
            ))}
          </div>
          <button onClick={printReport} style={{ background:'#1d4ed8', color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:12, cursor:'pointer' }}>🖨️ Print</button>
        </div>
      </div>

      {/* Report Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {REPORTS.map(r=>(
          <button key={r.id} onClick={()=>setReportType(r.id)} style={{ background:reportType===r.id?C.g:'#fff', color:reportType===r.id?'#fff':C.text, border:`1.5px solid ${reportType===r.id?C.g:C.border}`, borderRadius:20, padding:'7px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{r.emoji} {r.label}</button>
        ))}
      </div>

      <div ref={printRef}>
        {/* Shop Header for Print */}
        <div style={{ display:'none' }} className="print-header">
          <h1>{shop.name}</h1>
          <p>{shop.address || shop.city} {shop.gst_number ? `| GSTIN: ${shop.gst_number}` : ''}</p>
        </div>

        {/* P&L STATEMENT */}
        {reportType === 'pl' && (
          <div style={{ display:'grid', gap:16 }}>
            {/* Summary Bar */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {[
                ['💰','Total Revenue',data.totalSales,C.g],
                ['🛒','Cost of Goods',data.totalPurchases,'#7c3aed'],
                ['💸','Total Expenses',data.totalExpenses,'#dc2626'],
                ['📈','Gross Profit',data.grossProfit,data.grossProfit>=0?C.g:'#dc2626'],
                ['🏆','Net Profit',data.netProfit,data.netProfit>=0?C.g:'#dc2626'],
              ].map(([ic,lb,val,col])=>(
                <div key={lb} style={{ background:'#fff', borderRadius:14, padding:'14px 16px', flex:'1 1 140px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${col}` }}>
                  <div style={{ fontSize:20 }}>{ic}</div>
                  <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:col, marginTop:4 }}>₹{Math.abs(val).toFixed(0)}</div>
                  <div style={{ fontWeight:700, fontSize:11, color:C.text }}>{lb}</div>
                  {lb.includes('Profit') && <div style={{ fontSize:10, color:C.muted }}>{val>=0?'+':'-'}{Math.abs(data[lb.includes('Net')?'netMargin':'grossMargin']).toFixed(1)}% margin</div>}
                </div>
              ))}
            </div>

            {/* P&L Table */}
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ padding:'14px 18px', background:C.gXL, fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.gD, fontSize:16 }}>
                📈 Profit & Loss Statement — {data.from} to {data.to}
              </div>

              {/* INCOME */}
              <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.gXL}`, background:'#f8fffe' }}>
                <div style={{ fontWeight:800, color:C.g, fontSize:14, marginBottom:10 }}>INCOME (Revenue)</div>
                {[
                  ['Sales Revenue (Gross)', data.totalSales],
                  ['  ├ Cash Sales', data.cashSales],
                  ['  ├ Digital/UPI Sales', data.digitalSales],
                  ['  └ Udhar (Credit Sales)', data.udharSales],
                  ['GST Collected (Liability)', data.totalGstColl],
                ].map(([label,val])=>(
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', fontSize:13, borderBottom:`1px solid #f0fdf4` }}>
                    <span style={{ color:label.includes('  ')?C.muted:C.text, fontWeight:label.includes('  ')?500:700 }}>{label}</span>
                    <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:700, color:C.g }}>₹{val.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 8px', borderTop:`2px solid ${C.gXL}`, marginTop:4 }}>
                  <span style={{ fontWeight:800, fontSize:14 }}>TOTAL INCOME</span>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:C.g }}>₹{data.totalSales.toFixed(2)}</span>
                </div>
              </div>

              {/* COST OF GOODS */}
              <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.gXL}` }}>
                <div style={{ fontWeight:800, color:'#7c3aed', fontSize:14, marginBottom:10 }}>COST OF GOODS SOLD</div>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', fontSize:13 }}>
                  <span style={{ fontWeight:700 }}>Purchases ({data.purchaseCount} orders)</span>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:700, color:'#7c3aed' }}>₹{data.totalPurchases.toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 8px', borderTop:`2px solid ${C.gXL}`, marginTop:4 }}>
                  <span style={{ fontWeight:800, fontSize:14 }}>GROSS PROFIT</span>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:data.grossProfit>=0?C.g:'#dc2626' }}>
                    {data.grossProfit>=0?'+':''}₹{data.grossProfit.toFixed(2)} ({data.grossMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* OPERATING EXPENSES */}
              <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.gXL}` }}>
                <div style={{ fontWeight:800, color:'#dc2626', fontSize:14, marginBottom:10 }}>OPERATING EXPENSES ({data.expCount} entries)</div>
                {Object.entries(data.expByCat||{}).sort(([,a],[,b])=>b-a).map(([cat,amt])=>(
                  <div key={cat} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', fontSize:13, borderBottom:`1px solid #fff5f5` }}>
                    <span style={{ color:C.muted }}>{cat.split(' ').slice(1).join(' ')||cat}</span>
                    <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:700, color:'#dc2626' }}>₹{amt.toFixed(2)}</span>
                  </div>
                ))}
                {!data.expByCat||Object.keys(data.expByCat).length===0 && (
                  <div style={{ fontSize:12, color:C.muted, padding:'6px 8px' }}>Koi expense record nahi</div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 8px', borderTop:`1px solid #fecaca`, marginTop:4 }}>
                  <span style={{ fontWeight:700 }}>Total Expenses</span>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#dc2626' }}>₹{data.totalExpenses.toFixed(2)}</span>
                </div>
              </div>

              {/* NET PROFIT */}
              <div style={{ padding:'16px 18px', background:data.netProfit>=0?'#f0fdf4':'#fff5f5' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:C.text }}>NET PROFIT / (LOSS)</span>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:28, color:data.netProfit>=0?C.g:'#dc2626' }}>
                    {data.netProfit>=0?'+':''}₹{data.netProfit.toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize:12, color:C.muted, marginTop:4, textAlign:'right' }}>Net Margin: {data.netMargin.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        {/* BALANCE SHEET */}
        {reportType === 'balance' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* ASSETS */}
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ padding:'14px 18px', background:'#f0f9ff', fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#0369a1', fontSize:15 }}>
                📦 ASSETS {data.fyLabel && <span style={{fontSize:12,fontWeight:600}}>— FY {data.fyLabel}</span>}
              </div>
              {[
                { label:'Current Assets', isHeader:true },
                { label:'Opening Cash (FY Start)', val: data.openingCash },
                { label:'Opening Bank (FY Start)', val: data.openingBank },
                { label:'Cash Sales (This Period)', val: data.cashSales },
                { label:'Digital / UPI Received',  val: data.digitalSales },
                { label:'Debtors (Udhar Baaki)',    val: data.totalUdhar },
                { label:'Inventory (Stock Value)',  val: data.inventoryValue },
                { label:'Fixed Assets', isHeader:true },
                ...( data.assets.length > 0
                  ? data.assets.map(a => ({ label: a.asset_name, val: a.current_value || a.purchase_value || 0 }))
                  : [{ label:'No fixed assets added yet', val:0, muted:true }]
                ),
              ].map((item,i)=>(
                item.isHeader
                  ? <div key={i} style={{ padding:'8px 18px 4px', fontWeight:800, fontSize:12, color:'#0369a1', background:'#f8fbff' }}>{item.label}</div>
                  : <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 18px', borderBottom:`1px solid #f0f9ff`, fontSize:13 }}>
                      <span style={{ color: item.muted ? C.muted : C.text }}>{item.label}</span>
                      <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:700, color: item.muted ? C.muted : '#0369a1' }}>₹{(item.val||0).toFixed(0)}</span>
                    </div>
              ))}
              <div style={{ padding:'12px 18px', background:'#f0f9ff', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:900, fontSize:15 }}>TOTAL ASSETS</span>
                <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:'#0369a1' }}>
                  ₹{(data.openingCash + data.openingBank + data.cashSales + data.digitalSales + data.totalUdhar + data.inventoryValue + data.fixedAssetsTotal).toFixed(0)}
                </span>
              </div>
            </div>

            {/* LIABILITIES + EQUITY */}
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ padding:'14px 18px', background:'#fdf4ff', fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#7c3aed', fontSize:15 }}>
                📋 LIABILITIES & EQUITY
              </div>
              {[
                { label:'Current Liabilities', isHeader:true },
                { label:'GST Payable (Collected)', val: data.totalGstColl },
                { label:'Creditors (Supplier Dues)', val: data.creditorDues },
                { label:'Long-term Liabilities', isHeader:true },
                { label:'Secured Loans',   val: data.securedLoans },
                { label:'Unsecured Loans', val: data.unsecuredLoans },
                { label:"Owner's Equity", isHeader:true },
                { label:'Capital Invested', val: data.ownerCapital },
                { label:'Net Profit (This Period)', val: data.netProfit },
              ].map((item,i)=>(
                item.isHeader
                  ? <div key={i} style={{ padding:'8px 18px 4px', fontWeight:800, fontSize:12, color:'#7c3aed', background:'#fdf4ff' }}>{item.label}</div>
                  : <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 18px', borderBottom:`1px solid #fdf4ff`, fontSize:13 }}>
                      <span style={{ color:C.text }}>{item.label}</span>
                      <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:700, color: item.val < 0 ? '#dc2626' : '#7c3aed' }}>
                        {item.val < 0 ? '-' : ''}₹{Math.abs(item.val||0).toFixed(0)}
                      </span>
                    </div>
              ))}
              <div style={{ padding:'12px 18px', background:'#fdf4ff', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:900, fontSize:15 }}>TOTAL L + E</span>
                <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:'#7c3aed' }}>
                  ₹{(data.totalGstColl + data.creditorDues + data.securedLoans + data.unsecuredLoans + data.ownerCapital + data.netProfit).toFixed(0)}
                </span>
              </div>
            </div>

            {data.fixedAssetsTotal > 0 && (
              <div style={{ gridColumn:'1/-1', background:'#f0fdf4', borderRadius:12, padding:'12px 18px', fontSize:12, color:C.gD }}>
                📦 <b>Fixed Assets Total: ₹{data.fixedAssetsTotal.toFixed(0)}</b> — {data.assets.length} assets tracked
              </div>
            )}
            {data.ownerCapital === 0 && data.securedLoans === 0 && (
              <div style={{ gridColumn:'1/-1', background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:12, padding:'12px 16px', fontSize:12, color:'#92400e' }}>
                💡 <b>Tip:</b> Capital tab mein apna invested capital, secured loan aur unsecured loan add karo — tab Balance Sheet bilkul accurate rahegi.
              </div>
            )}
          </div>
        )}

        {/* TRIAL BALANCE */}
        {reportType === 'trial' && (
          <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'14px 18px', background:'#f8f9fa', fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.text, fontSize:16 }}>
              📋 Trial Balance — {data.from} to {data.to}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:C.gXL }}>
                  {['Account','Type','Debit (₹)','Credit (₹)'].map(h=><th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:800, color:C.gD, fontSize:12 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.trialBalance.map((row,i)=>(
                  <tr key={i} style={{ borderTop:`1px solid ${C.gXL}`, background:i%2===0?'#fafffe':'#fff' }}>
                    <td style={{ padding:'10px 16px', fontWeight:700 }}>{row.account}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ background:row.type==='income'?C.gXL:row.type==='expense'?C.redL:row.type==='asset'?C.blueL:C.goldL, color:row.type==='income'?C.g:row.type==='expense'?C.red:row.type==='asset'?C.blue:C.gold, borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700, textTransform:'capitalize' }}>{row.type}</span>
                    </td>
                    <td style={{ padding:'10px 16px', fontFamily:"'Baloo 2',cursive", fontWeight:row.debit>0?800:400, color:row.debit>0?'#dc2626':C.muted }}>
                      {row.debit > 0 ? `₹${row.debit.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding:'10px 16px', fontFamily:"'Baloo 2',cursive", fontWeight:row.credit>0?800:400, color:row.credit>0?C.g:C.muted }}>
                      {row.credit > 0 ? `₹${row.credit.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:C.gXL, borderTop:`2px solid ${C.g}` }}>
                  <td colSpan={2} style={{ padding:'12px 16px', fontWeight:900, fontSize:15 }}>TOTAL</td>
                  <td style={{ padding:'12px 16px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:'#dc2626' }}>₹{data.totalDebit.toFixed(2)}</td>
                  <td style={{ padding:'12px 16px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:C.g }}>₹{data.totalCredit.toFixed(2)}</td>
                </tr>
                <tr style={{ background: Math.abs(data.totalDebit-data.totalCredit)<0.01?'#f0fdf4':'#fff5f5' }}>
                  <td colSpan={4} style={{ padding:'10px 16px', fontSize:13, fontWeight:800, color:Math.abs(data.totalDebit-data.totalCredit)<0.01?C.g:'#dc2626', textAlign:'center' }}>
                    {Math.abs(data.totalDebit-data.totalCredit)<0.01 ? '✅ Balanced!' : `⚠️ Difference: ₹${Math.abs(data.totalDebit-data.totalCredit).toFixed(2)}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* CASH FLOW */}
        {reportType === 'cashflow' && (
          <div style={{ display:'grid', gap:16 }}>
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ padding:'14px 18px', background:'#f0fdf4', fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.gD, fontSize:16 }}>
                💵 Cash Flow Statement
              </div>

              {/* Operating Activities */}
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.gXL}` }}>
                <div style={{ fontWeight:800, color:C.g, marginBottom:10, fontSize:14 }}>A. Operating Activities (Cash Inflow)</div>
                {[['Cash Sales',data.cashSales],['Digital/UPI Collections',data.digitalSales]].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', fontSize:13, borderBottom:`1px solid ${C.gXL}` }}>
                    <span>{l}</span><span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:700, color:C.g }}>+₹{v.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 8px', fontWeight:800, fontSize:14 }}>
                  <span>Total Inflow</span><span style={{ fontFamily:"'Baloo 2',cursive", color:C.g }}>+₹{(data.cashSales+data.digitalSales).toFixed(2)}</span>
                </div>
              </div>

              {/* Cash Outflow */}
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.gXL}` }}>
                <div style={{ fontWeight:800, color:'#dc2626', marginBottom:10, fontSize:14 }}>B. Operating Activities (Cash Outflow)</div>
                {[['Purchases',data.totalPurchases],['Operating Expenses',data.totalExpenses]].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', fontSize:13, borderBottom:`1px solid #fff5f5` }}>
                    <span>{l}</span><span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:700, color:'#dc2626' }}>-₹{v.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 8px', fontWeight:800, fontSize:14 }}>
                  <span>Total Outflow</span><span style={{ fontFamily:"'Baloo 2',cursive", color:'#dc2626' }}>-₹{(data.totalPurchases+data.totalExpenses).toFixed(2)}</span>
                </div>
              </div>

              {/* Net Cash Flow */}
              <div style={{ padding:'16px 18px', background:data.netProfit>=0?C.gXL:'#fff5f5' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:16 }}>NET CASH FLOW</span>
                  <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:26, color:data.netProfit>=0?C.g:'#dc2626' }}>
                    {data.netProfit>=0?'+':''}₹{data.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
