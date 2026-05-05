import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const ACCOUNT_TYPES = [
  {
    id: 'capital',
    emoji: '🏛️',
    label: "Owner's Capital",
    desc: 'Malik ka apna paisa jo business mein lagaya (equity)',
    color: C.g,
    bg: '#f0fdf4',
  },
  {
    id: 'unsecured_loan',
    emoji: '🤝',
    label: 'Unsecured Loan',
    desc: 'Family/friend ka paisa, malik ka personal loan — wapas karna hai (no collateral)',
    color: '#7c3aed',
    bg: '#fdf4ff',
  },
  {
    id: 'secured_loan',
    emoji: '🏦',
    label: 'Secured Loan',
    desc: 'Bank loan, vehicle loan, hypothecation — collateral diya gaya hai',
    color: '#1d4ed8',
    bg: '#f0f9ff',
  },
]

export default function CapitalAccounts({ shop }) {
  const [accounts, setAccounts] = useState([])
  const [activeType, setActiveType] = useState('capital')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  })

  useEffect(() => { loadAccounts() }, [shop.id])

  const loadAccounts = async () => {
    const { data } = await supabase.from('capital_accounts').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
    setAccounts(data || [])
  }

  const resetForm = () => {
    setForm({ name: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' })
    setEditId(null)
    setShowForm(false)
  }

  const saveAccount = async () => {
    if (!form.name || !form.amount) return alert('Naam aur amount zaroori hai!')
    setSaving(true)
    const payload = {
      shop_id: shop.id,
      account_type: activeType,
      name: form.name,
      amount: +form.amount,
      date: form.date,
      note: form.note || null,
    }
    if (editId) {
      const { error } = await supabase.from('capital_accounts').update(payload).eq('id', editId)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('capital_accounts').insert(payload)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    resetForm()
    loadAccounts()
  }

  const editAccount = (a) => {
    setActiveType(a.account_type)
    setForm({ name: a.name, amount: a.amount, date: a.date, note: a.note || '' })
    setEditId(a.id)
    setShowForm(true)
  }

  const deleteAccount = async (id) => {
    if (!window.confirm('Ye account entry delete karein?')) return
    await supabase.from('capital_accounts').delete().eq('id', id)
    loadAccounts()
  }

  const totalCapital = accounts.filter(a => a.account_type === 'capital').reduce((s, a) => s + a.amount, 0)
  const totalUnsecured = accounts.filter(a => a.account_type === 'unsecured_loan').reduce((s, a) => s + a.amount, 0)
  const totalSecured = accounts.filter(a => a.account_type === 'secured_loan').reduce((s, a) => s + a.amount, 0)
  const totalLiability = totalCapital + totalUnsecured + totalSecured

  const activeAT = ACCOUNT_TYPES.find(at => at.id === activeType)
  const filtered = accounts.filter(a => a.account_type === activeType)

  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fafffe', width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 6 }}>💰 Capital & Loans</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Malik ka invested capital, secured aur unsecured loans manage karo</div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ["Owner's Capital", totalCapital, C.g, '🏛️'],
          ['Unsecured Loans', totalUnsecured, '#7c3aed', '🤝'],
          ['Secured Loans', totalSecured, '#1d4ed8', '🏦'],
          ['Total Equity+Loans', totalLiability, '#0369a1', '📊'],
        ].map(([label, val, color, icon]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 20, color, marginTop: 4 }}>₹{val.toFixed(0)}</div>
            <div style={{ fontWeight: 700, fontSize: 10, color: C.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Account Type Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {ACCOUNT_TYPES.map(at => (
          <div key={at.id} onClick={() => { setActiveType(at.id); setShowForm(false); resetForm() }}
            style={{ background: activeType === at.id ? at.bg : '#fff', border: `2px solid ${activeType === at.id ? at.color : C.border}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ fontSize: 24 }}>{at.emoji}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 13, color: activeType === at.id ? at.color : C.text, marginTop: 6 }}>{at.label}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{at.desc}</div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, color: activeAT?.color }}>
          {activeAT?.emoji} {activeAT?.label}
          <span style={{ marginLeft: 10, background: activeAT?.bg, borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
            ₹{accounts.filter(a => a.account_type === activeType).reduce((s, a) => s + a.amount, 0).toFixed(0)}
          </span>
        </div>
        <button onClick={() => { resetForm(); setShowForm(s => !s) }}
          style={{ background: `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          {showForm && !editId ? '✕ Band Karo' : '+ Entry Add Karo'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `2px solid ${activeAT?.color || C.border}` }}>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16, color: activeAT?.color, marginBottom: 16 }}>
            {editId ? '✏️ Entry Edit Karo' : `${activeAT?.emoji} Naya ${activeAT?.label}`}
          </div>

          {activeType === 'capital' && (
            <div style={{ background: C.gXL, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: C.gD }}>
              💡 <b>Capital Entry kab hogi:</b> Jab malik apna personal paisa business mein daale. Ye liability hai kyunki business ko malik ka paisa wapas karna hai.
            </div>
          )}
          {activeType === 'unsecured_loan' && (
            <div style={{ background: '#fdf4ff', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#7c3aed' }}>
              💡 <b>Unsecured Loan:</b> Family, friends, ya malik ki personal savings se loan. Koi guarantee nahi, sirf trust pe. Jab wapas dena ho to Payment Voucher se entry ho.
            </div>
          )}
          {activeType === 'secured_loan' && (
            <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1d4ed8' }}>
              💡 <b>Secured Loan:</b> Bank, NBFC, vehicle hypothecation — collateral diya gaya hai. Har EMI payment Voucher se track karo.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>
                {activeType === 'capital' ? 'Investor/Partner Naam' : 'Lender Naam (Bank/Person)'} *
              </label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={activeType === 'capital' ? 'Jaise: Ramesh Sharma (Owner)' : activeType === 'secured_loan' ? 'Jaise: SBI Bank, HDFC' : 'Jaise: Suresh ji (Bhai)'}
                style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Amount ₹ *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Note</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder={activeType === 'secured_loan' ? 'Jaise: Vehicle loan @ 9% 3yr' : 'Additional details...'}
                style={inp} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveAccount} disabled={saving}
              style={{ background: saving ? C.muted : `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Saving...' : editId ? '✅ Update Karo' : '✅ Entry Save Karo'}
            </button>
            <button onClick={resetForm} style={{ background: '#f3f4f6', color: C.text, border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Account List */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span>{activeAT?.emoji} {activeAT?.label} ({filtered.length} entries)</span>
          <span style={{ color: activeAT?.color, fontWeight: 900, fontSize: 16 }}>
            Total: ₹{filtered.reduce((s, a) => s + a.amount, 0).toFixed(0)}
          </span>
        </div>
        {filtered.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Koi entry nahi — "+ Entry Add Karo" se daalo</div>
          : filtered.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: `1px solid ${C.gXL}`, background: i % 2 === 0 ? '#fafffe' : '#fff' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {a.date}
                  {a.note && <span> • {a.note}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 18, color: activeAT?.color }}>₹{a.amount.toFixed(0)}</span>
                <button onClick={() => editAccount(a)} style={{ background: '#dbeafe', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: '#1d4ed8', fontSize: 11, fontWeight: 700 }}>✏️</button>
                <button onClick={() => deleteAccount(a.id)} style={{ background: C.redL, border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: C.red, fontSize: 11, fontWeight: 700 }}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
