import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function Affiliate({ shop }) {
  const [stats, setStats] = useState({ clicks: 0, signups: 0, conversions: 0, earnings: 0 })
  const [loading, setLoading] = useState(true)

  const referralLink = `https://dukaanmanager.com/?ref=${shop.id.substring(0,8)}`
  const commission = 500 // ₹500 per sale

  const waMessage = `Bhai, main apni dukaan ka saara hisaab, bill aur stock DukaanManager se manage karta hoon. Ekdam mast AI WhatsApp bot hai! \n\nTu bhi try kar, is link se register karne par discount milega: ${referralLink}`

  useEffect(() => {
    // In future, fetch actual affiliate stats from backend
    // For now, simulate some data if they have referred
    setTimeout(() => {
      setStats({ clicks: 12, signups: 3, conversions: 1, earnings: 500 })
      setLoading(false)
    }, 500)
  }, [])

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    alert("Referral Link Copied! Ab ise dosto ko bhejein.")
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 28, color: C.gD }}>Refer & Earn Program</div>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 8, maxWidth: 500, margin: '8px auto' }}>
          DukaanManager ko doosre dukaandaaron ke sath share karein aur har successful Pro/Enterprise upgrade par <b>₹{commission}</b> commission paayein!
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        
        {/* Share Section */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>🔗 Aapka Referral Link</div>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input 
              readOnly 
              value={referralLink} 
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, background: '#f9fafb', color: C.text }} 
            />
            <button onClick={copyLink} style={{ background: C.gXL, color: C.g, border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 800, cursor: 'pointer' }}>
              Copy
            </button>
          </div>

          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📲 Smart WhatsApp Share</div>
          <div style={{ background: '#f0fdf4', border: `1px solid #bbf7d0`, borderRadius: 12, padding: 14, fontSize: 13, color: '#166534', marginBottom: 16, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {waMessage}
          </div>
          
          <a href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#25d366', color: '#fff', padding: '12px', borderRadius: 12, textDecoration: 'none', fontWeight: 800, fontSize: 15 }}>
            WhatsApp Par Bhejein
          </a>
        </div>

        {/* Stats Section */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📊 Aapki Kamai (Earnings)</div>
          
          {loading ? <div style={{ color: C.muted }}>Loading stats...</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>Total Clicks</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.text, marginTop: 4 }}>{stats.clicks}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>Free Signups</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.text, marginTop: 4 }}>{stats.signups}</div>
                </div>
                <div style={{ background: '#fdf4ff', padding: 16, borderRadius: 12, border: `1px solid #f3e8ff`, gridColumn: '1 / -1' }}>
                  <div style={{ color: '#7e22ce', fontSize: 12, fontWeight: 700 }}>Paid Conversions (Pro/Enterprise)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#6b21a8' }}>{stats.conversions} Sales</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#9333ea' }}>₹{stats.earnings}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fffbeb', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: 13, color: '#b45309', fontWeight: 700, marginBottom: 8 }}>Payout Info</div>
                <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                  Aapka balance ₹1000 hone par automatic aapke registered bank account ya UPI par bhej diya jayega.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Tips Section */}
      <div style={{ marginTop: 24, background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 Marketing Tips (Kaise zyada kamayein?)</div>
        <ul style={{ fontSize: 13, color: C.text, lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
          <li>Apne aas-paas ke dukaandaaron ko apna phone dikhayein aur bot chalake dikhayein.</li>
          <li>Apne wholesale market ke dosto ko WhatsApp list mein ek sath message bhejein.</li>
          <li>Samjhayein ki DukaanManager se din ke 2 ghante bachte hain aur hisaab pakka rehta hai.</li>
        </ul>
      </div>
    </div>
  )
}
