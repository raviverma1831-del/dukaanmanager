import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

// ── Aging bucket helper ─────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return 999
  const d = new Date(dateStr)
  if (isNaN(d)) return 999
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

const BUCKETS = [
  { key: '0-15',  label: '0–15 days',  color: C.g,       bg: '#f0fdf4', min: 0,  max: 15  },
  { key: '16-30', label: '16–30 days', color: '#f59e0b', bg: '#fffbeb', min: 16, max: 30  },
  { key: '31-60', label: '31–60 days', color: '#ef4444', bg: '#fff5f5', min: 31, max: 60  },
  { key: '60+',   label: '60+ days',   color: '#7c3aed', bg: '#fdf4ff', min: 61, max: 9999 },
]

// ── WhatsApp message templates ──────────────────────────────────
const MSG = {
  soft: (name, amt, shop) =>
`Namaste ${name} ji! 🙏
Yeh ${shop.name} ki taraf se ek chota sa yaad dila raha hoon.
Aapka ₹${amt} ka balance baaki hai.
Jab bhi suvidha ho, clear kar dena. Dhanyawad! 😊
— ${shop.name}`,
  firm: (name, amt, shop) =>
`Namaste ${name} ji,
${shop.name} se reminder — aapka ₹${amt} outstanding hai.
Kripya is hafte payment clear karein (Cash/UPI/Bank).
Koi problem ho toh seedha baat karein.
Dhanyawad, ${shop.name} 🏪`,
  final: (name, amt, shop) =>
`${name} ji — FINAL NOTICE ⚠️
${shop.name} ki taraf se — aapka ₹${amt} bahut dino se baaki hai.
Kripya kal tak payment karein.
📞 ${shop.phone || 'Dukaan pe aayein'}
— ${shop.name}`,
}

export default function AgingRecovery({ shop }) {
  const [customers, setCustomers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('aging')
  const [rules, setRules] = useState({ softDays: 15, firmDays: 30, finalDays: 60, minAmount: 100, autoMode: false })
  const [sending, setSending] = useState(null)

  useEffect(() => { load() }, [shop.id])

  const load = async () => {
    setLoading(true)
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from('customers').select('*').eq('shop_id', shop.id).gt('balance', 0).order('balance', { ascending: false }),
      supabase.from('ai_call_logs').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(100),
    ])
    setCustomers(c || [])
    setLogs(l || [])
    setLoading(false)
  }

  const getScript = (cust) => {
    const days = daysSince(cust.last_transaction_date || cust.created_at)
    if (days >= rules.finalDays) return 'final'
    if (days >= rules.firmDays) return 'firm'
    return 'soft'
  }

  const sendMsg = async (cust, scriptKey) => {
    const msg = MSG[scriptKey](cust.name, cust.balance, shop)
    setSending(cust.id)
    await supabase.from('ai_call_logs').insert({
      shop_id: shop.id, customer_id: cust.id, customer_name: cust.name,
      phone: cust.phone, call_type: scriptKey, script: msg, status: 'sent', amount: cust.balance,
    })
    window.open(`https://wa.me/91${cust.phone}?text=${encodeURIComponent(msg)}`, '_blank')
    setSending(null)
    load()
  }

  // Bucket totals
  const bucketed = BUCKETS.map(b => ({
    ...b,
    customers: customers.filter(c => {
      const d = daysSince(c.last_transaction_date || c.created_at)
      return d >= b.min && d <= b.max && c.balance >= rules.minAmount
    })
  }))

  const totalUdhar = customers.reduce((s, c) => s + (c.balance || 0), 0)
  const atRisk = customers.filter(c => daysSince(c.last_transaction_date || c.created_at) >= rules.firmDays)

  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '7px 10px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif" }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>⏳ Loading...</div>

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 4 }}>📊 Aging Report & Recovery</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Kitne purane payment hain — aur kab, kaise mangna hai</div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          ['💰', 'Total Udhar', `₹${totalUdhar.toFixed(0)}`, '#dc2626'],
          ['👥', 'Customers', customers.length, C.g],
          ['⚠️', 'At Risk (30d+)', atRisk.length, '#f59e0b'],
          ['📤', 'Reminders Sent', logs.length, '#7c3aed'],
        ].map(([ic, lb, val, col]) => (
          <div key={lb} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', flex: '1 1 130px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${col}` }}>
            <div style={{ fontSize: 20 }}>{ic}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: col }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{lb}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['aging', '📊 Aging Report'], ['list', '📋 Customer List'], ['rules', '⚙️ Recovery Rules'], ['history', '📜 History']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ background: tab === v ? C.g : '#fff', color: tab === v ? '#fff' : C.text, border: `1.5px solid ${tab === v ? C.g : C.border}`, borderRadius: 20, padding: '7px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* AGING REPORT */}
      {tab === 'aging' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {bucketed.map(b => (
            <div key={b.key} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${b.bg}` }}>
              <div style={{ padding: '12px 18px', background: b.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, color: b.color }}>
                  🕒 {b.label} — {b.customers.length} customers
                </div>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, color: b.color }}>
                  ₹{b.customers.reduce((s, c) => s + (c.balance || 0), 0).toFixed(0)}
                </div>
              </div>
              {b.customers.length === 0 ? (
                <div style={{ padding: '12px 18px', fontSize: 13, color: C.muted }}>✅ Koi customer nahi is bucket mein</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Customer', 'Balance', 'Days Old', 'Action'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: C.muted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.customers.map((c, i) => {
                      const days = daysSince(c.last_transaction_date || c.created_at)
                      const script = getScript(c)
                      return (
                        <tr key={c.id} style={{ borderTop: `1px solid ${C.gXL}` }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{c.phone ? `📞 ${c.phone}` : '❌ Phone nahi'}</div>
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, color: '#dc2626' }}>₹{c.balance}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: b.bg, color: b.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{days}d</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {c.phone ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => sendMsg(c, script)} disabled={sending === c.id}
                                  style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                  {sending === c.id ? '⏳' : '💬 ' + (script === 'soft' ? 'Reminder' : script === 'firm' ? 'Firm' : 'Final')}
                                </button>
                                <a href={`tel:+91${c.phone}`} style={{ background: '#f0f9ff', color: '#0369a1', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>📞 Call</a>
                              </div>
                            ) : <span style={{ fontSize: 12, color: C.muted }}>No phone</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CUSTOMER LIST with bulk send */}
      {tab === 'list' && (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.gXL}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15 }}>💰 All Udhar ({customers.length})</div>
            <button onClick={async () => {
              const eligible = customers.filter(c => c.phone && c.balance >= rules.minAmount)
              if (!eligible.length) return alert('Koi eligible nahi!')
              if (!confirm(`${eligible.length} customers ko WhatsApp bhejein?`)) return
              for (const c of eligible) { await sendMsg(c, getScript(c)); await new Promise(r => setTimeout(r, 600)) }
              alert('✅ Sab bhej diya!')
            }} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              📤 Bulk WhatsApp Bhejo
            </button>
          </div>
          {customers.map((c, i) => {
            const days = daysSince(c.last_transaction_date || c.created_at)
            const bucket = BUCKETS.find(b => days >= b.min && days <= b.max) || BUCKETS[3]
            return (
              <div key={c.id} style={{ padding: '14px 18px', borderTop: i > 0 ? `1px solid ${C.gXL}` : 'none', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{c.phone ? `📞 ${c.phone}` : '❌ Phone nahi'} • {c.type}</div>
                </div>
                <span style={{ background: bucket.bg, color: bucket.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{days}d old</span>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 18, color: '#dc2626', minWidth: 70, textAlign: 'right' }}>₹{c.balance}</div>
                {c.phone && (
                  <button onClick={() => sendMsg(c, getScript(c))} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    💬 Send
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* RULES */}
      {tab === 'rules' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16, color: C.gD, marginBottom: 16 }}>⚙️ Recovery Rules</div>
          <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0369a1' }}>
            💡 Ye rules set karo — system automatically right script bhejega.<br />
            WhatsApp Bot bhi yahi rules follow karta hai.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['softDays', '😊 Soft Reminder (days)', 'Kitne din baad soft reminder bhejo', C.g],
              ['firmDays', '💼 Firm Reminder (days)', 'Kitne din baad firm reminder bhejo', '#f59e0b'],
              ['finalDays', '⚠️ Final Notice (days)', 'Kitne din baad final notice bhejo', '#dc2626'],
              ['minAmount', '₹ Min Amount', 'Isse kam balance wale ignore karo', '#7c3aed'],
            ].map(([k, label, hint, color]) => (
              <div key={k}>
                <label style={{ fontWeight: 700, fontSize: 12, color, display: 'block', marginBottom: 5 }}>{label}</label>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{hint}</div>
                <input type="number" value={rules[k]}
                  onChange={e => setRules(r => ({ ...r, [k]: +e.target.value }))}
                  style={{ ...inp, borderColor: color }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '16px', background: C.gXL, borderRadius: 12, fontSize: 13, color: C.gD }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>📋 Current Rules Summary:</div>
            <div>• {rules.softDays}+ days → 😊 Soft Reminder bhejega</div>
            <div>• {rules.firmDays}+ days → 💼 Firm Reminder bhejega</div>
            <div>• {rules.finalDays}+ days → ⚠️ Final Notice bhejega</div>
            <div>• ₹{rules.minAmount} se kam balance wale skip honge</div>
          </div>
          <div style={{ marginTop: 16, background: '#fdf4ff', borderRadius: 12, padding: '14px 16px', fontSize: 12, color: '#7c3aed' }}>
            🤖 <b>WhatsApp Bot Integration:</b> Apne bot ko type karo:
            <div style={{ fontFamily: 'monospace', background: '#fff', borderRadius: 8, padding: '8px 10px', marginTop: 8, lineHeight: 1.8 }}>
              "15 din se purane ko reminder bhejo"<br />
              "30 din walo ko call schedule karo"<br />
              "Sab pending udhar ki list bhejo"
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15 }}>
            📜 Reminder History ({logs.length})
          </div>
          {logs.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Abhi koi reminder nahi bheja</div>
            : logs.map((log, i) => (
              <div key={log.id} style={{ padding: '12px 18px', borderTop: i > 0 ? `1px solid ${C.gXL}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{log.customer_name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>📞 {log.phone} • {log.created_at?.slice(0, 10)} • {log.call_type}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: '#dc2626' }}>₹{log.amount}</span>
                  <span style={{ background: C.gXL, color: C.g, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>✅ Sent</span>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
