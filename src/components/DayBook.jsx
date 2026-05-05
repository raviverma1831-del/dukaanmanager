import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function DayBook({ shop }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openingCash, setOpeningCash] = useState(0)

  useEffect(() => { loadDayBook() }, [date, shop.id])

  const loadDayBook = async () => {
    setLoading(true)
    setError(null)
    try {
      // Each query individually with error handling
      const { data: invoices } = await supabase
        .from('invoices').select('*').eq('shop_id', shop.id).eq('bill_date', date)

      const { data: purchases } = await supabase
        .from('purchases').select('*').eq('shop_id', shop.id).eq('purchase_date', date)

      const { data: vouchers } = await supabase
        .from('vouchers').select('*').eq('shop_id', shop.id).eq('voucher_date', date)

      // Expenses — try expense_date, fallback to created_at date
      let expenses = []
      const { data: expData, error: expError } = await supabase
        .from('expenses').select('*').eq('shop_id', shop.id).gte('created_at', date + 'T00:00:00').lte('created_at', date + 'T23:59:59')
      if (!expError) expenses = expData || []

      // ── Calculations ────────────────────────────────────────────
      const inv = invoices || []
      const pur = purchases || []
      const vou = vouchers || []

      const cashSales     = inv.filter(i => i.pay_mode === 'cash').reduce((s, i) => s + (i.total || 0), 0)
      const upiSales      = inv.filter(i => ['upi', 'bank'].includes(i.pay_mode)).reduce((s, i) => s + (i.total || 0), 0)
      const udharSales    = inv.filter(i => i.pay_mode === 'udhar').reduce((s, i) => s + (i.total || 0), 0)
      const totalSales    = inv.reduce((s, i) => s + (i.total || 0), 0)

      const receiptVouchers = vou.filter(v => v.voucher_type === 'receipt')
      const receiptTotal    = receiptVouchers.reduce((s, v) => s + (v.total_amount || 0), 0)

      const cashPurchases   = pur.filter(p => p.pay_mode === 'cash').reduce((s, p) => s + (p.total || 0), 0)
      const bankPurchases   = pur.filter(p => p.pay_mode === 'bank').reduce((s, p) => s + (p.total || 0), 0)
      const totalPurchases  = pur.reduce((s, p) => s + (p.total || 0), 0)

      const paymentVouchers = vou.filter(v => v.voucher_type === 'payment')
      const paymentTotal    = paymentVouchers.reduce((s, v) => s + (v.total_amount || 0), 0)

      const totalExpenses   = expenses.reduce((s, e) => s + (e.amount || 0), 0)

      const totalCashIn  = cashSales + upiSales + receiptTotal
      const totalCashOut = cashPurchases + bankPurchases + paymentTotal + totalExpenses
      const closingCash  = openingCash + totalCashIn - totalCashOut

      // ── Build entries ─────────────────────────────────────────
      const entries = []

      inv.forEach(inv => entries.push({
        time: inv.created_at || date,
        type: 'sale',
        label: `Sale — ${inv.customer_name || 'Walk-in'}`,
        ref: inv.invoice_number || (inv.id || '').slice(0, 8),
        mode: inv.pay_mode,
        dr: ['cash', 'upi', 'bank'].includes(inv.pay_mode) ? (inv.total || 0) : 0,
        cr: inv.pay_mode === 'udhar' ? (inv.total || 0) : 0,
        amount: inv.total || 0,
        color: C.g,
      }))

      pur.forEach(p => entries.push({
        time: p.created_at || date,
        type: 'purchase',
        label: `Purchase — ${p.supplier_name || 'Direct'}`,
        ref: (p.id || '').slice(0, 8),
        mode: p.pay_mode || 'cash',
        dr: 0,
        cr: p.total || 0,
        amount: p.total || 0,
        color: '#7c3aed',
      }))

      vou.forEach(v => entries.push({
        time: v.created_at || date,
        type: v.voucher_type,
        label: `${(v.voucher_type || '').charAt(0).toUpperCase() + (v.voucher_type || '').slice(1)} — ${v.party_name || (v.narration || '').slice(0, 30) || ''}`,
        ref: v.voucher_no || '',
        mode: v.voucher_type,
        dr: v.voucher_type === 'receipt' ? (v.total_amount || 0) : 0,
        cr: v.voucher_type === 'payment' ? (v.total_amount || 0) : 0,
        amount: v.total_amount || 0,
        color: v.voucher_type === 'receipt' ? C.g : v.voucher_type === 'payment' ? '#dc2626' : '#7c3aed',
      }))

      expenses.forEach(e => entries.push({
        time: e.created_at || date,
        type: 'expense',
        label: `Expense — ${e.category || 'General'}`,
        ref: (e.id || '').slice(0, 8),
        mode: e.payment_mode || 'cash',
        dr: 0,
        cr: e.amount || 0,
        amount: e.amount || 0,
        color: '#dc2626',
      }))

      entries.sort((a, b) => {
        const ta = new Date(a.time).getTime()
        const tb = new Date(b.time).getTime()
        if (isNaN(ta) || isNaN(tb)) return 0
        return ta - tb
      })

      setData({
        date, cashSales, upiSales, udharSales, totalSales,
        totalPurchases, cashPurchases, bankPurchases,
        receiptTotal, paymentTotal, totalExpenses,
        totalCashIn, totalCashOut, closingCash,
        entries,
        invoicesCount: inv.length,
        purchasesCount: pur.length,
      })
    } catch (err) {
      console.error('DayBook error:', err)
      setError('Data load karne mein error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const changeDate = (days) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const modeLabel = {
    cash: '💵 Cash', upi: '📱 UPI', bank: '🏦 Bank', udhar: '📒 Udhar',
    receipt: '✅ Receipt', payment: '💸 Payment', contra: '🔄 Contra', journal: '📋 Journal', expense: '💸 Expense'
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, color: C.gD, fontSize: 16 }}>Day Book load ho raha hai...</div>
      <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{date}</div>
    </div>
  )

  if (error) return (
    <div style={{ background: '#fff5f5', borderRadius: 14, padding: 24, border: '1.5px solid #fca5a5' }}>
      <div style={{ fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>❌ Error</div>
      <div style={{ fontSize: 13, color: '#7f1d1d' }}>{error}</div>
      <button onClick={loadDayBook} style={{ marginTop: 12, background: C.g, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>🔄 Retry</button>
    </div>
  )

  if (!data) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD }}>📅 Day Book</div>
          <div style={{ fontSize: 12, color: C.muted }}>Daily cash & account summary</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => changeDate(-1)} style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>◀</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', fontWeight: 700, color: C.text }} />
          <button onClick={() => changeDate(1)} style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>▶</button>
          <button onClick={() => setDate(new Date().toISOString().slice(0, 10))} style={{ background: C.g, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Aaj</button>
          <button onClick={() => window.print()} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🖨️ Print</button>
        </div>
      </div>

      {/* Opening Cash Input */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 22 }}>💵</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Opening Cash Balance</div>
          <div style={{ fontSize: 11, color: C.muted }}>Is din ka shuru ka cash (kal ka closing balance)</div>
        </div>
        <input type="number" value={openingCash}
          onChange={e => setOpeningCash(+e.target.value)}
          onBlur={loadDayBook}
          placeholder="0"
          style={{ border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', fontSize: 18, outline: 'none', fontFamily: "'Baloo 2',cursive", fontWeight: 800, width: 150, textAlign: 'right', color: C.gD }} />
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['💰 Receipts (Aaya)', data.totalCashIn, C.g, `Cash: ₹${data.cashSales.toFixed(0)} + UPI: ₹${data.upiSales.toFixed(0)} + Vouchers: ₹${data.receiptTotal.toFixed(0)}`],
          ['💸 Payments (Gaya)', data.totalCashOut, '#dc2626', `Purchases: ₹${data.cashPurchases.toFixed(0)} + Vouchers: ₹${data.paymentTotal.toFixed(0)} + Exp: ₹${data.totalExpenses.toFixed(0)}`],
          ['🏁 Closing Cash', data.closingCash, data.closingCash >= 0 ? C.gD : '#dc2626', 'Opening + Receipts − Payments'],
        ].map(([label, val, color, sub]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 26, color }}> ₹{Math.abs(val).toFixed(0)}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Business Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          ['🧾', 'Sales', data.totalSales, C.g],
          ['📒', 'Udhar Sales', data.udharSales, C.gold || '#f59e0b'],
          ['🛒', 'Purchases', data.totalPurchases, '#7c3aed'],
          ['💸', 'Expenses', data.totalExpenses, '#dc2626'],
        ].map(([icon, label, val, color]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 20, color }}>₹{val.toFixed(0)}</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Day Book Register Table */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📋 Day Book Register — {date}</span>
          <span style={{ fontSize: 13, color: C.muted }}>{data.entries.length} entries</span>
        </div>

        {/* Opening Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#f0f9ff', borderBottom: `1px solid ${C.gXL}`, fontSize: 13 }}>
          <span style={{ fontWeight: 800, color: '#0369a1' }}>Opening Balance (Cash)</span>
          <div style={{ display: 'flex', gap: 60 }}>
            <span style={{ color: C.g, fontWeight: 800, width: 90, textAlign: 'right' }}>₹{openingCash.toFixed(0)}</span>
            <span style={{ color: C.muted, width: 90, textAlign: 'right' }}>—</span>
          </div>
        </div>

        {data.entries.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              Is din koi entry nahi
            </div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.gXL }}>
                    {['#', 'Particulars', 'Voucher/Ref', 'Mode', 'Dr (₹)', 'Cr (₹)'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: h.includes('₹') ? 'right' : 'left', fontWeight: 800, color: C.gD, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.gXL}`, background: i % 2 === 0 ? '#fafffe' : '#fff' }}>
                      <td style={{ padding: '8px 14px', color: C.muted, width: 30 }}>{i + 1}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ fontWeight: 700, color: e.color }}>{e.label}</div>
                      </td>
                      <td style={{ padding: '8px 14px', color: C.muted, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{e.ref || '—'}</td>
                      <td style={{ padding: '8px 14px', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {modeLabel[e.mode] || e.mode || '—'}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: e.dr > 0 ? 800 : 400, color: e.dr > 0 ? C.g : C.muted, whiteSpace: 'nowrap' }}>
                        {e.dr > 0 ? `₹${e.dr.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: e.cr > 0 ? 800 : 400, color: e.cr > 0 ? '#dc2626' : C.muted, whiteSpace: 'nowrap' }}>
                        {e.cr > 0 ? `₹${e.cr.toFixed(0)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: C.gXL, borderTop: `2px solid ${C.g}` }}>
                    <td colSpan={4} style={{ padding: '10px 14px', fontWeight: 900, fontSize: 14 }}>CLOSING BALANCE (Cash)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 16, color: data.closingCash >= 0 ? C.gD : '#dc2626' }}>
                      ₹{data.closingCash.toFixed(0)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </div>
    </div>
  )
}
