import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function DayBook({ shop }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openingCash, setOpeningCash] = useState(0)

  useEffect(() => { loadDayBook() }, [date, shop.id])

  const loadDayBook = async () => {
    setLoading(true)

    // Load all transactions for the day
    const [
      { data: invoices },
      { data: purchases },
      { data: vouchers },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('invoices').select('*').eq('shop_id', shop.id).eq('bill_date', date),
      supabase.from('purchases').select('*').eq('shop_id', shop.id).eq('purchase_date', date),
      supabase.from('vouchers').select('*').eq('shop_id', shop.id).eq('voucher_date', date),
      supabase.from('expenses').select('*').eq('shop_id', shop.id).eq('expense_date', date).catch(() => ({ data: [] })),
    ])

    // Receipts (Cash/Bank coming in)
    const cashSales = invoices?.filter(i => i.pay_mode === 'cash').reduce((s, i) => s + (i.total || 0), 0) || 0
    const upiSales = invoices?.filter(i => ['upi', 'bank'].includes(i.pay_mode)).reduce((s, i) => s + (i.total || 0), 0) || 0
    const udharSales = invoices?.filter(i => i.pay_mode === 'udhar').reduce((s, i) => s + (i.total || 0), 0) || 0
    const totalSales = invoices?.reduce((s, i) => s + (i.total || 0), 0) || 0

    // Receipt Vouchers (cash/bank inflow)
    const receiptVouchers = vouchers?.filter(v => v.voucher_type === 'receipt') || []
    const receiptTotal = receiptVouchers.reduce((s, v) => s + (v.total_amount || 0), 0)

    // Payments (Cash/Bank going out)
    const cashPurchases = purchases?.filter(p => p.pay_mode === 'cash').reduce((s, p) => s + (p.total || 0), 0) || 0
    const bankPurchases = purchases?.filter(p => p.pay_mode === 'bank').reduce((s, p) => s + (p.total || 0), 0) || 0
    const totalPurchases = purchases?.reduce((s, p) => s + (p.total || 0), 0) || 0

    // Payment Vouchers (cash/bank outflow)
    const paymentVouchers = vouchers?.filter(v => v.voucher_type === 'payment') || []
    const paymentTotal = paymentVouchers.reduce((s, v) => s + (v.total_amount || 0), 0)

    // Expenses
    const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0

    // Cash calculations
    const totalCashIn = cashSales + receiptTotal
    const totalCashOut = cashPurchases + paymentTotal + totalExpenses
    const closingCash = openingCash + totalCashIn - totalCashOut

    // All entries combined for day book register
    const entries = []

    invoices?.forEach(inv => {
      entries.push({
        time: inv.created_at,
        type: 'sale',
        label: `Sale — ${inv.customer_name || 'Walk-in'}`,
        ref: inv.invoice_number || inv.id?.slice(0, 8),
        mode: inv.pay_mode,
        dr: ['cash', 'upi', 'bank'].includes(inv.pay_mode) ? inv.total : 0,
        cr: inv.pay_mode === 'udhar' ? inv.total : 0,
        amount: inv.total,
        color: C.g,
      })
    })

    purchases?.forEach(p => {
      entries.push({
        time: p.created_at,
        type: 'purchase',
        label: `Purchase — ${p.supplier_name || 'Direct'}`,
        ref: p.id?.slice(0, 8),
        mode: p.pay_mode || 'cash',
        dr: 0,
        cr: p.total,
        amount: p.total,
        color: '#7c3aed',
      })
    })

    vouchers?.forEach(v => {
      entries.push({
        time: v.created_at,
        type: v.voucher_type,
        label: `${v.voucher_type.charAt(0).toUpperCase() + v.voucher_type.slice(1)} — ${v.party_name || v.narration?.slice(0, 30) || ''}`,
        ref: v.voucher_no,
        mode: v.voucher_type,
        dr: v.voucher_type === 'receipt' ? v.total_amount : 0,
        cr: v.voucher_type === 'payment' ? v.total_amount : 0,
        amount: v.total_amount,
        color: v.voucher_type === 'receipt' ? C.g : v.voucher_type === 'payment' ? '#dc2626' : '#7c3aed',
      })
    })

    expenses?.forEach(e => {
      entries.push({
        time: e.created_at,
        type: 'expense',
        label: `Expense — ${e.category || 'General'}`,
        ref: e.id?.slice(0, 8),
        mode: e.payment_mode || 'cash',
        dr: 0,
        cr: e.amount,
        amount: e.amount,
        color: '#dc2626',
      })
    })

    entries.sort((a, b) => new Date(a.time) - new Date(b.time))

    setData({
      date,
      cashSales, upiSales, udharSales, totalSales,
      totalPurchases, cashPurchases, bankPurchases,
      receiptTotal, paymentTotal,
      totalExpenses,
      totalCashIn, totalCashOut, closingCash,
      entries,
      invoicesCount: invoices?.length || 0,
      purchasesCount: purchases?.length || 0,
    })
    setLoading(false)
  }

  const changeDate = (days) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const printDayBook = () => {
    window.print()
  }

  const modeLabel = { cash: '💵', upi: '📱', bank: '🏦', udhar: '📒', receipt: '✅', payment: '💸', contra: '🔄', journal: '📋', expense: '💸' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>⏳ Loading Day Book...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD }}>📅 Day Book</div>
          <div style={{ fontSize: 12, color: C.muted }}>Daily cash & account summary</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => changeDate(-1)} style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>◀</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', fontWeight: 700, color: C.text }} />
          <button onClick={() => changeDate(1)} style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>▶</button>
          <button onClick={() => setDate(new Date().toISOString().slice(0, 10))} style={{ background: C.g, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Aaj</button>
        </div>
      </div>

      {/* Opening Cash Input */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 20 }}>💵</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Opening Cash Balance</div>
          <div style={{ fontSize: 11, color: C.muted }}>Is din ka shuru ka cash (kal ka closing)</div>
        </div>
        <input type="number" value={openingCash} onChange={e => { setOpeningCash(+e.target.value); }} placeholder="0"
          style={{ border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', fontSize: 16, outline: 'none', fontFamily: "'Baloo 2',cursive", fontWeight: 800, width: 140, textAlign: 'right', color: C.gD }}
          onBlur={loadDayBook}
        />
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${C.g}` }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: C.muted, marginBottom: 8 }}>💰 TOTAL RECEIPTS (Aaya)</div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 24, color: C.g }}>₹{data.totalCashIn.toFixed(0)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Cash Sales: ₹{data.cashSales.toFixed(0)} • Receipts: ₹{data.receiptTotal.toFixed(0)}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: C.muted, marginBottom: 8 }}>💸 TOTAL PAYMENTS (Gaya)</div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 24, color: '#dc2626' }}>₹{data.totalCashOut.toFixed(0)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Purchases: ₹{data.cashPurchases.toFixed(0)} • Expenses: ₹{data.totalExpenses.toFixed(0)}
          </div>
        </div>
        <div style={{ background: data.closingCash >= 0 ? '#f0fdf4' : '#fff5f5', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${data.closingCash >= 0 ? C.g : '#dc2626'}` }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: C.muted, marginBottom: 8 }}>🏁 CLOSING CASH BALANCE</div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 24, color: data.closingCash >= 0 ? C.gD : '#dc2626' }}>₹{data.closingCash.toFixed(0)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>= Opening + Receipts − Payments</div>
          <div style={{ fontSize: 11, color: C.g, fontWeight: 700, marginTop: 2 }}>→ Kal ka Opening Balance</div>
        </div>
      </div>

      {/* Business Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          ['🧾', 'Total Sales', data.totalSales, C.g],
          ['📒', 'Udhar Sales', data.udharSales, C.gold],
          ['🛒', 'Purchases', data.totalPurchases, '#7c3aed'],
          ['💸', 'Expenses', data.totalExpenses, '#dc2626'],
        ].map(([icon, label, val, color]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 18, color }}> ₹{val.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Day Book Register */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📋 Day Book Register — {date}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>{data.entries.length} entries</span>
            <button onClick={printDayBook} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🖨️ Print</button>
          </div>
        </div>

        {/* Opening Balance Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#f0f9ff', borderBottom: `1px solid ${C.gXL}`, fontSize: 13 }}>
          <span style={{ fontWeight: 800, color: '#0369a1' }}>Opening Balance (Cash)</span>
          <div style={{ display: 'flex', gap: 60 }}>
            <span style={{ color: C.g, fontWeight: 800, width: 80, textAlign: 'right' }}>₹{openingCash.toFixed(0)}</span>
            <span style={{ color: C.muted, width: 80, textAlign: 'right' }}>—</span>
          </div>
        </div>

        {data.entries.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Is din koi entry nahi</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.gXL }}>
                  {['#', 'Particulars', 'Voucher/Ref', 'Mode', 'Dr (₹)', 'Cr (₹)'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: h.includes('₹') ? 'right' : 'left', fontWeight: 800, color: C.gD, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.gXL}`, background: i % 2 === 0 ? '#fafffe' : '#fff' }}>
                    <td style={{ padding: '8px 14px', color: C.muted }}>{i + 1}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ fontWeight: 700, color: e.color }}>{e.label}</div>
                    </td>
                    <td style={{ padding: '8px 14px', color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>{e.ref || '—'}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ fontSize: 14 }}>{modeLabel[e.mode] || '—'}</span>
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: e.dr > 0 ? 800 : 400, color: e.dr > 0 ? C.g : C.muted }}>
                      {e.dr > 0 ? `₹${e.dr.toFixed(0)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: e.cr > 0 ? 800 : 400, color: e.cr > 0 ? '#dc2626' : C.muted }}>
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
          )
        }
      </div>
    </div>
  )
}
