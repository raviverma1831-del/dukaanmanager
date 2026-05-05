import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test'

/**
 * PayPal Checkout Button
 * Props:
 *   amount     - string, e.g. "500.00"
 *   currency   - "USD" | "INR" (default INR — check PayPal account support)
 *   description - string, order description
 *   onSuccess  - callback(details) after payment
 *   onError    - callback(err)
 *   shop       - shop object (for logging)
 *   invoiceId  - optional, link payment to invoice
 */
export function PayPalCheckout({ amount, currency = 'INR', description = 'DukaanManager Payment', onSuccess, onError, shop, invoiceId }) {
  const [status, setStatus] = useState('idle') // idle | processing | success | error
  const [orderId, setOrderId] = useState(null)

  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: { value: String(Number(amount).toFixed(2)), currency_code: currency },
        description,
        custom_id: invoiceId || shop?.id || '',
      }]
    })
  }

  const onApprove = async (data, actions) => {
    setStatus('processing')
    try {
      const details = await actions.order.capture()
      setOrderId(details.id)
      // Log to Supabase
      if (shop?.id) {
        await supabase.from('payment_logs').insert({
          shop_id: shop.id,
          invoice_id: invoiceId || null,
          payment_method: 'paypal',
          paypal_order_id: details.id,
          amount: Number(amount),
          currency,
          status: 'completed',
          payer_name: details.payer?.name?.given_name + ' ' + (details.payer?.name?.surname || ''),
          payer_email: details.payer?.email_address,
          raw_response: JSON.stringify(details),
        }).catch(() => {}) // Non-blocking
      }
      setStatus('success')
      onSuccess && onSuccess(details)
    } catch (err) {
      setStatus('error')
      onError && onError(err)
    }
  }

  const onErr = (err) => {
    setStatus('error')
    onError && onError(err)
  }

  if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === 'test') {
    return (
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#92400e' }}>
        ⚠️ PayPal Client ID set nahi hua. <code>.env</code> mein <code>VITE_PAYPAL_CLIENT_ID</code> daalo.
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
        <div style={{ fontWeight: 800, color: '#15803d', fontSize: 15 }}>Payment Successful!</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Order ID: {orderId}</div>
      </div>
    )
  }

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency, intent: 'capture' }}>
      <div>
        {status === 'processing' && (
          <div style={{ textAlign: 'center', padding: '12px', fontSize: 13, color: '#6b7280' }}>⏳ Processing payment...</div>
        )}
        {status === 'error' && (
          <div style={{ background: '#fff5f5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 10 }}>
            ❌ Payment failed. Please try again.
          </div>
        )}
        <PayPalButtons
          style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onErr}
          disabled={status === 'processing'}
        />
      </div>
    </PayPalScriptProvider>
  )
}

/**
 * PayPal Settings Panel (shown in Settings page)
 */
export function PayPalSettings() {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 28 }}>🅿️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>PayPal Integration</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>International payments accept karo</div>
        </div>
        <div style={{ marginLeft: 'auto', background: clientId && clientId !== 'your_paypal_client_id_here' ? '#f0fdf4' : '#f3f4f6', color: clientId && clientId !== 'your_paypal_client_id_here' ? '#15803d' : '#6b7280', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
          {clientId && clientId !== 'your_paypal_client_id_here' ? '✅ Connected' : '⚙️ Not Set'}
        </div>
      </div>

      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', fontSize: 13, lineHeight: 1.9 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Setup Steps:</div>
        <div>1. <a href="https://developer.paypal.com/dashboard" target="_blank" rel="noreferrer" style={{ color: '#0369a1' }}>developer.paypal.com</a> pe jao</div>
        <div>2. My Apps & Credentials → Create App</div>
        <div>3. <b>Client ID</b> copy karo (Live mode ke liye)</div>
        <div>4. <code style={{ background: '#e5e7eb', borderRadius: 4, padding: '1px 6px' }}>.env</code> file mein daalo:</div>
        <div style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, marginTop: 6 }}>
          VITE_PAYPAL_CLIENT_ID=<span style={{ color: '#86efac' }}>AaXxYy...</span>
        </div>
      </div>

      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#991b1b', marginTop: 12 }}>
        🔒 <b>Security:</b> Secret Key <b>kabhi bhi</b> .env ya code mein mat daalo.<br />
        Secret key sirf Supabase Edge Function (server-side) mein use hoti hai — order capture ke liye.
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#1d4ed8', marginTop: 10 }}>
        💡 <b>India mein PayPal:</b> Indian business accounts ke liye PayPal pe INR currency support limited hai.<br />
        Alternative: <b>Razorpay</b> ya <b>PhonePe</b> better option hain India ke liye.
      </div>
    </div>
  )
}
