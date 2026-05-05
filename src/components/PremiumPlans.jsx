import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'
import { PayPalCheckout } from './PayPalPayment.jsx'

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, emoji: '🆓', color: C.muted,
    features: [
      ['✅', 'Unlimited Bills'],['✅', 'Khata Book'],['✅', 'Inventory (50 products)'],
      ['✅', 'Basic Dashboard'],['✅', 'WhatsApp Bill Share'],
      ['❌', 'AI WhatsApp Bot'],['❌', 'GST Reports'],['❌', 'Purchase Management'],
      ['❌', 'AI Marketing'],['❌', 'B2B Network'],['❌', 'Udhar Recovery'],
    ]
  },
  {
    id: 'standard', name: 'Standard', price: 199, emoji: '⭐', color: C.blue,
    features: [
      ['✅', 'Everything in Free'],['✅', 'Unlimited Products'],['✅', 'Purchase Management'],
      ['✅', 'GST Reports (B2B+B2C)'],['✅', 'P&L + Balance Sheet'],['✅', 'Expense Management'],
      ['✅', 'Print Invoice'],['❌', 'AI WhatsApp Bot'],['❌', 'AI Marketing'],
      ['❌', 'B2B Network'],['❌', 'Udhar Recovery Calls'],
    ]
  },
  {
    id: 'pro', name: 'Pro', price: 399, emoji: '🚀', color: C.g, popular: true,
    features: [
      ['✅', 'Everything in Standard'],['✅', 'AI WhatsApp Bot (1000 msgs)'],
      ['✅', 'AI Marketing + Bulk Send'],['✅', 'B2B Network Access'],
      ['✅', 'Udhar Recovery (500 msgs)'],['✅', 'Campaign History'],
      ['✅', 'Priority Support'],['❌', 'Multi-branch'],['❌', 'Staff Login'],
      ['❌', 'Festival Poster Generator'],
    ]
  },
  {
    id: 'business', name: 'Business', price: 799, emoji: '💎', color: '#7c3aed',
    features: [
      ['✅', 'Everything in Pro'],['✅', '3 Branches'],['✅', 'Staff Login (3 users)'],
      ['✅', 'AI WhatsApp Bot (5000 msgs)'],['✅', 'Bulk Marketing (2000 msgs)'],
      ['✅', 'Festival Poster Generator'],['✅', 'B2B Premium Network'],
      ['✅', 'Advanced Analytics'],['✅', 'Custom Domain'],['✅', 'Dedicated Support'],
    ]
  },
]

const COMPARE = [
  ['Products', '50', 'Unlimited', 'Unlimited', 'Unlimited'],
  ['Bills/month', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
  ['GST Reports', '❌', '✅', '✅', '✅'],
  ['Purchase Mgmt', '❌', '✅', '✅', '✅'],
  ['P&L / Balance Sheet', '❌', '✅', '✅', '✅'],
  ['Expense Management', '❌', '✅', '✅', '✅'],
  ['AI WhatsApp Bot', '❌', '❌', '1000 msgs', '5000 msgs'],
  ['AI Marketing', '❌', '❌', '500 msgs', '2000 msgs'],
  ['B2B Network', '❌', '❌', '✅ Basic', '✅ Premium'],
  ['Udhar Recovery', '❌', '❌', '✅', '✅'],
  ['Branches', '1', '1', '1', '3'],
  ['Staff Login', '❌', '❌', '❌', '3 users'],
  ['Support', 'Community', 'Email', 'Priority', 'Dedicated'],
]

export default function PremiumPlans({ currentPlan = 'free', shop }) {
  const [billing, setBilling] = useState('monthly')
  const [checkoutPlan, setCheckoutPlan] = useState(null)

  const handleSuccess = async (details, planId) => {
    // Update shop subscription status in Supabase
    await supabase.from('shops').update({ subscription_status: planId }).eq('id', shop.id)
    alert("Payment successful! Welcome to premium.")
    window.location.reload()
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 28, color: C.gD }}>💎 DukaanManager Plans</div>
        
        {currentPlan === 'pro' && shop?.created_at && ((new Date().getTime() - new Date(shop.created_at).getTime()) / (1000 * 60 * 60 * 24)) <= 7 && !shop?.subscription_status && (
            <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px', color: '#b45309', fontWeight: 700, margin: '12px auto', maxWidth: '400px' }}>
              🎉 Aapka 7-Day Full Access Trial active hai! Baad mein plan select karein.
            </div>
        )}

        <div style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>Apni dukaan ke liye sahi plan chunein</div>
        <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 20, padding: 4, marginTop: 16, gap: 4 }}>
          {[['monthly', 'Monthly'], ['yearly', '🎁 Yearly (2 mahine free!)']].map(([v, l]) => (
            <button key={v} onClick={() => setBilling(v)} style={{ background: billing === v ? C.g : 'transparent', color: billing === v ? '#fff' : C.text, border: 'none', borderRadius: 16, padding: '7px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 16, marginBottom: 32 }}>
        {PLANS.map(plan => {
          const price = billing === 'yearly' ? Math.floor(plan.price * 0.83) : plan.price
          const isCurrent = plan.id === currentPlan
          return (
            <div key={plan.id} style={{ background: plan.popular ? `linear-gradient(135deg,#14532d,#16a34a)` : '#fff', borderRadius: 20, padding: 24, boxShadow: plan.popular ? '0 8px 32px rgba(22,163,74,0.25)' : '0 2px 16px rgba(0,0,0,0.06)', border: `2px solid ${isCurrent ? plan.color : plan.popular ? C.g : plan.color + '33'}`, position: 'relative', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#78350f', borderRadius: 20, padding: '3px 14px', fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' }}>⭐ Most Popular</div>}
              {isCurrent && <div style={{ position: 'absolute', top: -12, right: 16, background: plan.color, color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 900 }}>✓ Current</div>}

              <div style={{ fontSize: 32, marginBottom: 8 }}>{plan.emoji}</div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 20, color: plan.popular ? '#fff' : plan.color }}>{plan.name}</div>

              <div style={{ margin: '12px 0 16px' }}>
                {plan.price === 0
                  ? <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 28, color: plan.popular ? '#86efac' : plan.color }}>Free</span>
                  : <>
                    <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 28, color: plan.popular ? '#86efac' : plan.color }}>₹{price}</span>
                    <span style={{ fontSize: 13, color: plan.popular ? 'rgba(255,255,255,0.7)' : C.muted }}>/month</span>
                    {billing === 'yearly' && plan.price > 0 && <div style={{ fontSize: 11, color: plan.popular ? '#86efac' : C.g, fontWeight: 700 }}>💰 ₹{plan.price - price}/month bachao!</div>}
                  </>
                }
              </div>

              <div style={{ marginBottom: 20 }}>
                {plan.features.map(([icon, feat], i) => (
                  <div key={i} style={{ fontSize: 12, padding: '3px 0', color: plan.popular ? (icon === '✅' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)') : (icon === '✅' ? C.text : '#9ca3af') }}>
                    {icon} {feat}
                  </div>
                ))}
              </div>

              {!isCurrent && plan.price > 0 && (
                checkoutPlan === plan.id ? (
                  <div style={{ marginTop: 10, background: '#fff', padding: 8, borderRadius: 12 }}>
                    <PayPalCheckout 
                      amount={(price / 80).toFixed(2)} // Approximate USD conversion for PayPal
                      currency="USD" 
                      description={`DukaanManager ${plan.name} Plan`} 
                      shop={shop} 
                      onSuccess={(details) => handleSuccess(details, plan.id)} 
                    />
                    <button onClick={() => setCheckoutPlan(null)} style={{ background: 'transparent', color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12, width: '100%', marginTop: 8 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setCheckoutPlan(plan.id)}
                    style={{ width: '100%', background: plan.popular ? 'rgba(255,255,255,0.2)' : plan.color, color: '#fff', border: plan.popular ? '2px solid rgba(255,255,255,0.4)' : 'none', borderRadius: 12, padding: 11, fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                    Pay ₹{price} & Upgrade →
                  </button>
                )
              )}
              {isCurrent && (
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, fontWeight: 700, fontSize: 13, color: plan.popular ? '#fff' : plan.color }}>
                  ✅ Current Plan
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Feature Comparison Table */}
      <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, color: C.gD, marginBottom: 20 }}>📊 Full Comparison</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.gXL}` }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, color: C.text, width: '35%' }}>Feature</th>
                {PLANS.map(p => <th key={p.id} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: p.color }}>{p.emoji} {p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([feat, ...vals]) => (
                <tr key={feat} style={{ borderBottom: `1px solid ${C.gXL}` }}>
                  <td style={{ padding: '9px 14px', fontWeight: 700, color: C.text }}>{feat}</td>
                  {vals.map((v, i) => (
                    <td key={i} style={{ padding: '9px 14px', textAlign: 'center', color: v === '✅' ? C.g : v === '❌' ? '#9ca3af' : C.text, fontWeight: v === '✅' || v === '❌' ? 700 : 500 }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}