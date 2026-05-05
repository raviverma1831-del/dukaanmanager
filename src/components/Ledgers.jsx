import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const LEDGERS = [
  { id: 'sales',    emoji: '💰', label: 'Sales Ledger' },
  { id: 'purchase', emoji: '🛒', label: 'Purchase Ledger' },
  { id: 'cash',     emoji: '💵', label: 'Cash Ledger' },
  { id: 'party',    emoji: '👥', label: 'Party Ledger' },
]

export default function Ledgers({ shop }) {
  const [ledger, setLedger] = useState('sales')
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) })
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedParty, setSelectedParty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLedger() }, [ledger, from, to, shop.id, selectedParty])

  const loadLedger = async () => {
    setLoading(true)
    try {
      if (ledger === 'sales') {
        const { data: inv } = await supabase.from('invoices').select('*')
          .eq('shop_id', shop.id).gte('bill_date', from).lte('bill_date', to).order('bill_date')
        setData(inv || [])
      } else if (ledger === 'purchase') {
        const { data: pur } = await supabase.from('purchases').select('*')
          .eq('shop_id', shop.id).gte('purchase_date', from).lte('purchase_date', to).order('purchase_date')
        setData(pur || [])
      } else if (ledger === 'cash') {
        const [{ data: inv }, { data: vou }, { data: exp }] = await Promise.all([
          supabase.from('invoices').select('*').eq('shop_id', shop.id).eq('pay_mode', 'cash').gte('bill_date', from).lte('bill_date', to),
          supabase.from('vouchers').select('*').eq('shop_id', shop.id).gte('voucher_date', from).lte('voucher_date', to),
          supabase.from('expenses').select('*').eq('shop_id', shop.id).gte('created_at', from).lte('created_at', to + 'T23:59:59'),
        ])
        const entries = [
          ...(inv || []).map(i => ({ date: i.bill_date, label: `Sale — ${i.customer_name || 'Walk-in'}`, dr: i.total, cr: 0, ref: i.invoice_number || i.id?.slice(0, 8), type: 'sale' })),
          ...(vou || []).filter(v => ['receipt', 'payment'].includes(v.voucher_type)).map(v => ({ date: v.voucher_date, label: `${v.voucher_type} — ${v.party_name || ''}`, dr: v.voucher_type === 'receipt' ? v.total_amount : 0, cr: v.voucher_type === 'payment' ? v.total_amount : 0, ref: v.voucher_no, type: v.voucher_type })),
          ...(exp || []).map(e => ({ date: e.created_at?.slice(0, 10), label: `Expense — ${e.category || ''}`, dr: 0, cr: e.amount, ref: e.id?.slice(0, 8), type: 'expense' })),
        ].sort((a, b) => a.date?.localeCompare(b.date))
        setData(entries)
      } else if (ledger === 'party') {
        const { data: c } = await supabase.from('customers').select('*').eq('shop_id', shop.id).order('name')
        setCustomers(c || [])
        if (selectedParty) {
          const { data: inv } = await supabase.from('invoices').select('*')
            .eq('shop_id', shop.id).ilike('customer_name', selectedParty).gte('bill_date', from).lte('bill_date', to).order('bill_date')
          setData(inv || [])
        }
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const totals = data.reduce((s, r) => ({ dr: s.dr + (r.dr || r.total || 0), cr: s.cr + (r.cr || 0) }), { dr: 0, cr: 0 })
  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', background: '#fafffe' }
  const modeColor = { cash: C.g, upi: '#0369a1', bank: '#7c3aed', udhar: '#f59e0b', credit: '#f59e0b' }

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 16 }}>📒 Ledgers</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', background: '#fff', padding: 8, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {LEDGERS.map(l => (
          <button key={l.id} onClick={() => setLedger(l.id)} style={{ flex: 1, minWidth: 100, background: ledger === l.id ? C.g : 'transparent', color: ledger === l.id ? '#fff' : C.muted, border: 'none', borderRadius: 9, padding: '9px 8px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Baloo 2',cursive" }}>
            {l.emoji} {l.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
        <span style={{ color: C.muted }}>to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
        {[['This Month', () => { const d = new Date(); d.setDate(1); setFrom(d.toISOString().slice(0,10)); setTo(new Date().toISOString().slice(0,10)) }],
          ['This FY', () => { const y = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear()-1; setFrom(`${y}-04-01`); setTo(`${y+1}-03-31`) }],
        ].map(([l, fn]) => (
          <button key={l} onClick={fn} style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* Party selector */}
      {ledger === 'party' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {customers.map(c => (
            <button key={c.id} onClick={() => setSelectedParty(c.name)} style={{ background: selectedParty === c.name ? C.g : '#fff', color: selectedParty === c.name ? '#fff' : C.text, border: `1.5px solid ${selectedParty === c.name ? C.g : C.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {c.name} {c.balance > 0 ? `(₹${c.balance} baaki)` : ''}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>⏳ Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {/* Header */}
          <div style={{ padding: '14px 18px', background: C.gXL, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.gD }}>
              {LEDGERS.find(l => l.id === ledger)?.emoji} {LEDGERS.find(l => l.id === ledger)?.label} — {from} to {to}
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>{data.length} entries</div>
          </div>

          {data.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 36 }}>📭</div>
              {ledger === 'party' && !selectedParty ? 'Upar se customer select karo' : 'Is period mein koi entry nahi'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['#', 'Date', 'Particulars', 'Ref / Mode', 'Dr (₹)', 'Cr (₹)'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: h.includes('₹') ? 'right' : 'left', fontWeight: 800, fontSize: 11, color: C.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => {
                    const dr = row.dr ?? (ledger === 'sales' ? row.total : 0)
                    const cr = row.cr ?? (ledger === 'purchase' ? row.total : 0)
                    const date = row.date || row.bill_date || row.purchase_date || ''
                    const label = row.label || (ledger === 'sales' ? `Sale — ${row.customer_name || 'Walk-in'}` : `Purchase — ${row.supplier_name || 'Direct'}`)
                    const ref = row.ref || row.invoice_number || (row.id || '').slice(0, 8)
                    const mode = row.type || row.pay_mode || ''
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${C.gXL}`, background: i % 2 === 0 ? '#fafffe' : '#fff' }}>
                        <td style={{ padding: '9px 14px', color: C.muted, width: 30 }}>{i + 1}</td>
                        <td style={{ padding: '9px 14px', color: C.muted, whiteSpace: 'nowrap' }}>{date}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 600 }}>{label}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: modeColor[mode] || C.muted }}>{ref} {mode ? `• ${mode}` : ''}</span>
                        </td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: dr > 0 ? 800 : 400, color: dr > 0 ? C.g : C.muted }}>{dr > 0 ? `₹${dr.toFixed(0)}` : '—'}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: cr > 0 ? 800 : 400, color: cr > 0 ? '#dc2626' : C.muted }}>{cr > 0 ? `₹${cr.toFixed(0)}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: C.gXL, borderTop: `2px solid ${C.g}` }}>
                    <td colSpan={4} style={{ padding: '10px 14px', fontWeight: 900 }}>TOTAL</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: 900, color: C.gD }}>₹{(totals.dr || (ledger === 'sales' ? data.reduce((s, r) => s + (r.total || 0), 0) : 0)).toFixed(0)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'Baloo 2',cursive", fontWeight: 900, color: '#dc2626' }}>₹{(totals.cr || (ledger === 'purchase' ? data.reduce((s, r) => s + (r.total || 0), 0) : 0)).toFixed(0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
