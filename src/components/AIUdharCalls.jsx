import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const CALL_SCRIPTS = {
  soft: {
    label: '😊 Soft Reminder',
    color: C.g,
    generate: (name, amount, shop) =>
`Namaste ${name} ji! 🙏

Yeh ${shop.name} ki taraf se ek chota sa yaad dila raha hoon.

Aapka ₹${amount} ka balance baaki hai. Jab bhi aapki suvidha ho, clear kar dena. 

Koi bhi madad chahiye toh zaroor batayein. Dhanyawad! 😊

- ${shop.name}`
  },
  firm: {
    label: '💼 Firm Reminder',
    color: C.gold,
    generate: (name, amount, shop) =>
`Namaste ${name} ji,

${shop.name} se reminder de raha hoon ki aapka ₹${amount} ka outstanding balance hai.

Kripya is week mein payment clear karein. Aap cash, UPI, ya bank transfer se de sakte hain.

Koi problem hai toh seedha baat karein.

Dhanyawad,
${shop.name} 🏪`
  },
  final: {
    label: '⚠️ Final Notice',
    color: C.red,
    generate: (name, amount, shop) =>
`${name} ji,

Yeh ${shop.name} ki taraf se FINAL NOTICE hai.

Aapka ₹${amount} bahut dino se baaki hai. 

Kripya kal tak payment karein warna hum aapka khata band karne par majboor honge.

Seedha contact karein: ${shop.phone || 'Dukaan pe aayein'}

- ${shop.name}`
  }
}

export default function AIUdharCalls({ shop }) {
  const [customers, setCustomers] = useState([])
  const [callLogs, setCallLogs] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [scriptType, setScriptType] = useState('soft')
  const [selectedCust, setSelectedCust] = useState(null)
  const [previewMsg, setPreviewMsg] = useState('')
  const [minAmount, setMinAmount] = useState(100)
  const [sending, setSending] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkCount, setBulkCount] = useState(0)

  useEffect(() => { loadData() }, [shop.id])

  const loadData = async () => {
    const [{ data: c }, { data: logs }] = await Promise.all([
      supabase.from('customers').select('*').eq('shop_id', shop.id).gt('balance', 0).order('balance', { ascending: false }),
      supabase.from('ai_call_logs').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(50),
    ])
    setCustomers(c || [])
    setCallLogs(logs || [])
  }

  const generatePreview = (cust, type) => {
    const script = CALL_SCRIPTS[type || scriptType]
    return script.generate(cust.name, cust.balance, shop)
  }

  const sendReminder = async (cust, type) => {
    if (!cust.phone) return alert('Is customer ka phone number nahi hai!')
    const msg = generatePreview(cust, type)
    window.open(`https://wa.me/91${cust.phone}?text=${encodeURIComponent(msg)}`, '_blank')
    // Log it
    await supabase.from('ai_call_logs').insert({
      shop_id: shop.id,
      customer_id: cust.id,
      customer_name: cust.name,
      phone: cust.phone,
      call_type: 'udhar_recovery',
      script: msg,
      status: 'sent',
      amount: cust.balance,
    })
    loadData()
  }

  const sendBulkReminders = async () => {
    const eligible = customers.filter(c => c.phone && c.balance >= minAmount)
    if (!eligible.length) return alert('Koi eligible customer nahi!')
    if (!confirm(`${eligible.length} customers ko reminder bhejein?`)) return
    setBulkSending(true); setBulkCount(0)
    for (let i = 0; i < eligible.length; i++) {
      await sendReminder(eligible[i], scriptType)
      setBulkCount(i + 1)
      await new Promise(r => setTimeout(r, 800))
    }
    setBulkSending(false)
    alert(`✅ ${eligible.length} customers ko reminder bhej diya!`)
  }

  const totalUdhar = customers.reduce((s, c) => s + (c.balance || 0), 0)
  const eligibleCount = customers.filter(c => c.phone && c.balance >= minAmount).length
  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fafffe', fontFamily: "'DM Sans',sans-serif" }

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 4 }}>📞 AI Udhar Recovery</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>WhatsApp pe automated payment reminders bhejo — ek click mein!</div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          ['💰', 'Total Udhar Baaki', `₹${totalUdhar.toFixed(0)}`, C.red],
          ['👥', 'Udhar Customers', `${customers.length}`, C.gold],
          ['📱', 'Phone wale', `${customers.filter(c => c.phone).length}`, C.g],
          ['📤', 'Reminders Bheje', `${callLogs.length}`, C.blue],
        ].map(([ic, lb, val, col]) => (
          <div key={lb} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', flex: '1 1 140px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${col}` }}>
            <div style={{ fontSize: 22 }}>{ic}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: col, marginTop: 4 }}>{val}</div>
            <div style={{ fontWeight: 700, fontSize: 11, color: C.text }}>{lb}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['pending', '💰 Pending Udhar'], ['logs', '📋 Sent History']].map(([v, l]) => (
          <button key={v} onClick={() => setActiveTab(v)} style={{ background: activeTab === v ? C.red : '#fff', color: activeTab === v ? '#fff' : C.text, border: `1.5px solid ${activeTab === v ? C.red : C.border}`, borderRadius: 20, padding: '7px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {activeTab === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          {/* Customer List */}
          <div>
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.gXL}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15 }}>💰 Udhar Customers ({customers.length})</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Min ₹</span>
                  <input type="number" value={minAmount} onChange={e => setMinAmount(+e.target.value)} style={{ ...inp, width: 80, padding: '5px 8px' }} />
                </div>
              </div>

              {customers.length === 0
                ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                  Koi udhar nahi! Sab clear hai.
                </div>
                : customers.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i > 0 ? `1px solid ${C.gXL}` : 'none', background: selectedCust?.id === c.id ? '#fff5f5' : '#fff' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{c.phone ? `📞 ${c.phone}` : '❌ Phone nahi'} • {c.type}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 18, color: C.red }}>₹{c.balance}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>baaki</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setSelectedCust(c); setPreviewMsg(generatePreview(c, scriptType)) }}
                        style={{ background: '#f0f9ff', color: '#0369a1', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        👁️ Preview
                      </button>
                      {c.phone && (
                        <button onClick={() => sendReminder(c, scriptType)}
                          style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          📱 Send
                        </button>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Script Type */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📝 Script Type</div>
              {Object.entries(CALL_SCRIPTS).map(([key, script]) => (
                <button key={key} onClick={() => { setScriptType(key); if (selectedCust) setPreviewMsg(generatePreview(selectedCust, key)) }}
                  style={{ width: '100%', background: scriptType === key ? script.color : '#f9fafb', color: scriptType === key ? '#fff' : C.text, border: `1.5px solid ${scriptType === key ? script.color : C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{script.label}</span>
                  {scriptType === key && <span>✓</span>}
                </button>
              ))}
            </div>

            {/* Preview */}
            {selectedCust && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, marginBottom: 10 }}>👁️ {selectedCust.name} ka Message</div>
                <div style={{ background: '#dcf8c6', borderRadius: '4px 14px 14px 14px', padding: '12px 14px', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>{previewMsg}</div>
                {selectedCust.phone && (
                  <button onClick={() => sendReminder(selectedCust, scriptType)} style={{ width: '100%', marginTop: 12, background: '#25d366', color: '#fff', border: 'none', borderRadius: 12, padding: 11, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                    📱 {selectedCust.name} ko Bhejo
                  </button>
                )}
              </div>
            )}

            {/* Bulk Send */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📤 Bulk Reminder</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>₹{minAmount}+ balance wale <b>{eligibleCount} customers</b> ko ek saath reminder bhejo</div>
              {bulkSending && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: C.g, fontWeight: 700 }}>Bhej raha hoon {bulkCount}/{eligibleCount}...</div>
                  <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ background: C.g, height: '100%', width: `${(bulkCount / Math.max(eligibleCount, 1)) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
              <button onClick={sendBulkReminders} disabled={bulkSending || eligibleCount === 0}
                style={{ width: '100%', background: bulkSending || eligibleCount === 0 ? C.muted : C.red, color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 14, cursor: bulkSending || eligibleCount === 0 ? 'not-allowed' : 'pointer' }}>
                {bulkSending ? '⏳ Bhej raha hoon...' : `📞 ${eligibleCount} Customers ko Bulk Reminder`}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15 }}>
            📋 Reminder History ({callLogs.length})
          </div>
          {callLogs.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Abhi koi reminder nahi bheja</div>
            : callLogs.map((log, i) => (
              <div key={log.id} style={{ padding: '12px 18px', borderTop: i > 0 ? `1px solid ${C.gXL}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{log.customer_name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>📞 {log.phone} • {log.created_at?.slice(0, 10)}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.red }}>₹{log.amount}</span>
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