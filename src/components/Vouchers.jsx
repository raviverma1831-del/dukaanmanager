import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const VOUCHER_TYPES = [
  { id: 'receipt', emoji: '✅', label: 'Receipt Voucher', color: C.g, bgColor: '#f0fdf4', desc: 'Paisa mila (customer se, sale se, koi bhi inflow)' },
  { id: 'payment', emoji: '💸', label: 'Payment Voucher', color: '#dc2626', bgColor: '#fff5f5', desc: 'Paisa diya (supplier, expense, koi bhi outflow)' },
  { id: 'contra', emoji: '🔄', label: 'Contra Voucher', color: '#7c3aed', bgColor: '#fdf4ff', desc: 'Cash to Bank ya Bank to Cash transfer' },
  { id: 'journal', emoji: '📋', label: 'Journal Voucher', color: '#0369a1', bgColor: '#f0f9ff', desc: 'Adjustment, correction, depreciation entries' },
]

const LEDGERS = {
  cash: { label: 'Cash in Hand', type: 'cash', icon: '💵' },
  bank: { label: 'Bank Account', type: 'bank', icon: '🏦' },
  sales: { label: 'Sales Account', type: 'income', icon: '🧾' },
  purchase: { label: 'Purchase Account', type: 'expense', icon: '🛒' },
  debtor: { label: 'Sundry Debtors', type: 'asset', icon: '📤' },
  creditor: { label: 'Sundry Creditors', type: 'liability', icon: '📥' },
  expense: { label: 'Operating Expense', type: 'expense', icon: '💸' },
  capital: { label: 'Capital Account', type: 'equity', icon: '🏦' },
  custom: { label: 'Custom Ledger', type: 'other', icon: '📋' },
}

export default function Vouchers({ shop }) {
  const [vouchers, setVouchers] = useState([])
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [activeType, setActiveType] = useState('receipt')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    voucher_date: new Date().toISOString().slice(0, 10),
    narration: '',
    party_name: '',
    amount: '',
    dr_ledger: 'cash',
    cr_ledger: 'debtor',
    dr_custom: '',
    cr_custom: '',
  })
  const [expandedId, setExpandedId] = useState(null)
  const [expandedEntries, setExpandedEntries] = useState([])

  useEffect(() => { loadAll() }, [shop.id, activeType])

  const loadAll = async () => {
    const [{ data: v }, { data: c }, { data: s }] = await Promise.all([
      supabase.from('vouchers').select('*').eq('shop_id', shop.id).eq('voucher_type', activeType).order('created_at', { ascending: false }),
      supabase.from('customers').select('id,name,phone').eq('shop_id', shop.id).order('name'),
      supabase.from('suppliers').select('id,name').eq('shop_id', shop.id).order('name'),
    ])
    setVouchers(v || [])
    setCustomers(c || [])
    setSuppliers(s || [])
  }

  // Set default Dr/Cr based on voucher type
  const handleTypeSwitch = (type) => {
    setActiveType(type)
    setShowForm(false)
    const defaults = {
      receipt: { dr_ledger: 'cash', cr_ledger: 'debtor' },
      payment: { dr_ledger: 'creditor', cr_ledger: 'cash' },
      contra:  { dr_ledger: 'bank',   cr_ledger: 'cash' },
      journal: { dr_ledger: 'custom', cr_ledger: 'custom' },
    }
    setForm(f => ({ ...f, ...defaults[type], party_name: '', narration: '', amount: '', dr_custom: '', cr_custom: '' }))
  }

  const saveVoucher = async () => {
    if (!form.amount || +form.amount <= 0) return alert('Amount daalna zaroori hai!')
    if (!form.narration && !form.party_name) return alert('Narration ya party naam daalna zaroori hai!')
    setSaving(true)
    const voucherNo = `${activeType.toUpperCase().slice(0, 2)}V-${Date.now().toString().slice(-6)}`
    const amt = +form.amount

    // Dr/Cr ledger names
    const drName = form.dr_ledger === 'custom' ? form.dr_custom : LEDGERS[form.dr_ledger]?.label || form.dr_ledger
    const crName = form.cr_ledger === 'custom' ? form.cr_custom : LEDGERS[form.cr_ledger]?.label || form.cr_ledger
    const drType = form.dr_ledger === 'custom' ? 'other' : LEDGERS[form.dr_ledger]?.type || 'other'
    const crType = form.cr_ledger === 'custom' ? 'other' : LEDGERS[form.cr_ledger]?.type || 'other'

    const { data: voucher, error } = await supabase.from('vouchers').insert({
      shop_id: shop.id,
      voucher_type: activeType,
      voucher_no: voucherNo,
      voucher_date: form.voucher_date,
      narration: form.narration || `${form.party_name} - ${activeType}`,
      party_name: form.party_name || null,
      total_amount: amt,
    }).select().single()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    await supabase.from('voucher_entries').insert([
      { voucher_id: voucher.id, ledger_name: drName, ledger_type: drType, dr_amount: amt, cr_amount: 0 },
      { voucher_id: voucher.id, ledger_name: crName, ledger_type: crType, dr_amount: 0, cr_amount: amt },
    ])

    setForm(f => ({ ...f, narration: '', party_name: '', amount: '', dr_custom: '', cr_custom: '' }))
    setShowForm(false)
    setSaving(false)
    loadAll()
    alert(`✅ ${voucherNo} saved!`)
  }

  const loadEntries = async (voucherId) => {
    if (expandedId === voucherId) { setExpandedId(null); return }
    const { data } = await supabase.from('voucher_entries').select('*').eq('voucher_id', voucherId)
    setExpandedEntries(data || [])
    setExpandedId(voucherId)
  }

  const deleteVoucher = async (id) => {
    if (!window.confirm('Ye voucher delete karein?')) return
    await supabase.from('voucher_entries').delete().eq('voucher_id', id)
    await supabase.from('vouchers').delete().eq('id', id)
    loadAll()
  }

  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fafffe', width: '100%', boxSizing: 'border-box' }
  const activeVT = VOUCHER_TYPES.find(v => v.id === activeType)

  const LedgerSelect = ({ value, onChange, label, side }) => (
    <div style={{ flex: 1 }}>
      <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: side === 'dr' ? '#dc2626' : C.g }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp }}>
        {Object.entries(LEDGERS).map(([k, v]) => (
          <option key={k} value={k}>{v.icon} {v.label}</option>
        ))}
      </select>
      {value === 'custom' && (
        <input
          placeholder="Custom ledger naam..."
          value={side === 'dr' ? form.dr_custom : form.cr_custom}
          onChange={e => setForm(f => side === 'dr' ? { ...f, dr_custom: e.target.value } : { ...f, cr_custom: e.target.value })}
          style={{ ...inp, marginTop: 6 }}
        />
      )}
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 16 }}>📒 Vouchers</div>

      {/* Voucher Type Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {VOUCHER_TYPES.map(vt => (
          <div key={vt.id} onClick={() => handleTypeSwitch(vt.id)}
            style={{ background: activeType === vt.id ? vt.bgColor : '#fff', border: `2px solid ${activeType === vt.id ? vt.color : C.border}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ fontSize: 20 }}>{vt.emoji}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 13, color: activeType === vt.id ? vt.color : C.text, marginTop: 4 }}>{vt.label}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{vt.desc}</div>
          </div>
        ))}
      </div>

      {/* New Voucher Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16, color: activeVT?.color }}>
          {activeVT?.emoji} {activeVT?.label}
        </div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          {showForm ? '✕ Band Karo' : `+ Naya ${activeVT?.label}`}
        </button>
      </div>

      {/* Voucher Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `2px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" value={form.voucher_date} onChange={e => setForm(f => ({ ...f, voucher_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4 }}>Amount ₹ *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={{ ...inp, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16 }} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4 }}>Party Name</label>
              <input list={`party-${activeType}`} value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} placeholder="Customer/Supplier..." style={inp} />
              <datalist id={`party-${activeType}`}>
                {(activeType === 'receipt' ? customers : suppliers).map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
          </div>

          {/* Dr / Cr Ledgers */}
          <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 10 }}>📊 Double Entry (Dr / Cr)</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <LedgerSelect value={form.dr_ledger} onChange={v => setForm(f => ({ ...f, dr_ledger: v }))} label="Dr (Debit)" side="dr" />
              <div style={{ fontSize: 20, paddingTop: 24 }}>⇄</div>
              <LedgerSelect value={form.cr_ledger} onChange={v => setForm(f => ({ ...f, cr_ledger: v }))} label="Cr (Credit)" side="cr" />
            </div>
            {form.amount && (
              <div style={{ marginTop: 12, background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.text }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>Dr: {form.dr_ledger === 'custom' ? form.dr_custom : LEDGERS[form.dr_ledger]?.label}</span>
                  <span style={{ fontWeight: 800 }}>₹{form.amount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: C.g, fontWeight: 700 }}>Cr: {form.cr_ledger === 'custom' ? form.cr_custom : LEDGERS[form.cr_ledger]?.label}</span>
                  <span style={{ fontWeight: 800 }}>₹{form.amount}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4 }}>Narration (Note) *</label>
            <input value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} placeholder="Jaise: Customer se udhaar ki payment mili..." style={inp} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveVoucher} disabled={saving || !form.amount}
              style={{ background: saving || !form.amount ? C.muted : `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 15, cursor: saving || !form.amount ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Saving...' : `✅ ${activeVT?.label} Save Karo`}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: '#f3f4f6', color: C.text, border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Voucher List */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, display: 'flex', justifyContent: 'space-between' }}>
          <span>{activeVT?.emoji} {activeVT?.label} History</span>
          <span style={{ fontSize: 13, color: C.muted }}>{vouchers.length} vouchers</span>
        </div>
        {vouchers.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Koi {activeVT?.label} nahi — upar se add karein</div>
          : vouchers.map(v => (
            <div key={v.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.gXL}` }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => loadEntries(v.id)}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ background: activeVT?.bgColor, color: activeVT?.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{v.voucher_no}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{v.party_name || '—'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{v.voucher_date} • {v.narration}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 18, color: activeVT?.color }}>₹{v.total_amount}</span>
                  <button onClick={() => deleteVoucher(v.id)} style={{ background: C.redL, border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: C.red, fontSize: 11, fontWeight: 700 }}>🗑️</button>
                  <span style={{ color: C.muted, fontSize: 12 }}>{expandedId === v.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedId === v.id && expandedEntries.length > 0 && (
                <div style={{ background: '#f8f9fa', padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 6 }}>LEDGER ENTRIES (Double Entry)</div>
                  {expandedEntries.map((e, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: i < expandedEntries.length - 1 ? `1px solid ${C.gXL}` : 'none' }}>
                      <span style={{ fontWeight: 700 }}>{e.ledger_name}</span>
                      <div style={{ display: 'flex', gap: 24 }}>
                        <span style={{ color: '#dc2626', fontWeight: e.dr_amount > 0 ? 800 : 400 }}>{e.dr_amount > 0 ? `Dr ₹${e.dr_amount}` : '—'}</span>
                        <span style={{ color: C.g, fontWeight: e.cr_amount > 0 ? 800 : 400 }}>{e.cr_amount > 0 ? `Cr ₹${e.cr_amount}` : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  )
}
