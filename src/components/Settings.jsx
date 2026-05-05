import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { C, BIZ_TYPES } from '../lib/constants.js'
import { PayPalSettings } from './PayPalPayment.jsx'

export default function Settings({ shop, onUpdate, onSignOut }) {
  const [form, setForm] = useState({
    name: shop.name || '',
    owner_name: shop.owner_name || '',
    phone: shop.phone || '',
    city: shop.city || '',
    biz_label: shop.biz_label || '',
    biz_emoji: shop.biz_emoji || '🏪',
    gst_number: shop.gst_number || '',
    gst_type: shop.gst_type || 'unregistered',
    gst_scheme: shop.gst_scheme || 'regular',
    address: shop.address || '',
    pay_modes: shop.pay_modes || { cash: true, upi: true, bank: false },
    cust_types: shop.cust_types || { retail: true, wholesale: false },
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('basic')
  const [fy, setFy] = useState({ label: '2024-25', start: '2024-04-01', end: '2025-03-31', openingCash: '', openingBank: '' })
  const [fySaving, setFySaving] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: "'DM Sans',sans-serif", width: '100%', boxSizing: 'border-box', background: '#fafffe' }

  const save = async () => {
    setSaving(true)
    const { data, error } = await supabase.from('shops').update({
      name: form.name, owner_name: form.owner_name, phone: form.phone,
      city: form.city, biz_label: form.biz_label, biz_emoji: form.biz_emoji,
      gst_number: form.gst_number, gst_type: form.gst_type, gst_scheme: form.gst_scheme,
      address: form.address, pay_modes: form.pay_modes, cust_types: form.cust_types,
    }).eq('id', shop.id).select().single()
    setSaving(false)
    if (!error && data) { setSaved(true); onUpdate(data); setTimeout(() => setSaved(false), 3000) }
    else alert('Error: ' + error?.message)
  }

  // FY Management
  const saveFY = async () => {
    setFySaving(true)
    // Deactivate existing active FY
    await supabase.from('financial_years').update({ is_active: false }).eq('shop_id', shop.id).eq('is_active', true)
    // Create new FY
    const { error } = await supabase.from('financial_years').insert({
      shop_id: shop.id,
      fy_label: fy.label,
      start_date: fy.start,
      end_date: fy.end,
      is_active: true,
      opening_cash: +fy.openingCash || 0,
      opening_bank: +fy.openingBank || 0,
    })
    setFySaving(false)
    if (!error) alert(`✅ FY ${fy.label} set ho gaya! Opening Cash: ₹${fy.openingCash || 0}, Bank: ₹${fy.openingBank || 0}`)
    else alert('Error: ' + error.message)
  }

  // Backup / Export
  const exportBackup = async () => {
    setBackupLoading(true)
    try {
      const [
        { data: shopData },
        { data: customers },
        { data: products },
        { data: suppliers },
        { data: invoices },
        { data: invoice_items },
        { data: transactions },
        { data: purchases },
        { data: purchase_items },
        { data: fixed_assets },
        { data: capital_accounts },
        { data: vouchers },
      ] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shop.id).single(),
        supabase.from('customers').select('*').eq('shop_id', shop.id),
        supabase.from('products').select('*').eq('shop_id', shop.id),
        supabase.from('suppliers').select('*').eq('shop_id', shop.id),
        supabase.from('invoices').select('*').eq('shop_id', shop.id),
        supabase.from('invoice_items').select('*'),
        supabase.from('transactions').select('*').eq('shop_id', shop.id),
        supabase.from('purchases').select('*').eq('shop_id', shop.id),
        supabase.from('purchase_items').select('*'),
        supabase.from('fixed_assets').select('*').eq('shop_id', shop.id).catch(() => ({ data: [] })),
        supabase.from('capital_accounts').select('*').eq('shop_id', shop.id).catch(() => ({ data: [] })),
        supabase.from('vouchers').select('*').eq('shop_id', shop.id).catch(() => ({ data: [] })),
      ])

      const backup = {
        exportedAt: new Date().toISOString(),
        version: '2.0',
        shop: shopData,
        customers, products, suppliers,
        invoices, invoice_items,
        transactions, purchases, purchase_items,
        fixed_assets, capital_accounts, vouchers,
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${shop.name.replace(/\s+/g, '_')}_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      alert('✅ Backup downloaded!')
    } catch (err) {
      alert('Backup error: ' + err.message)
    }
    setBackupLoading(false)
  }

  // CSV Export of invoices
  const exportCSV = async () => {
    const { data: invoices } = await supabase.from('invoices').select('*').eq('shop_id', shop.id).order('bill_date')
    if (!invoices?.length) return alert('Koi invoice nahi')
    const header = ['Invoice No', 'Date', 'Customer', 'Total', 'Pay Mode', 'GST']
    const rows = invoices.map(i => [i.invoice_number || i.id, i.bill_date, i.customer_name, i.total, i.pay_mode, i.total_gst || 0])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${shop.name}_invoices_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Delete Company
  const deleteCompany = async () => {
    if (deleteConfirm !== shop.name) return alert('Naam bilkul match nahi hua!')
    if (!window.confirm('⚠️ POORA DATA DELETE HOGA! Are you absolutely sure?')) return
    setDeleteLoading(true)
    try {
      // Delete in order (FK constraints)
      await supabase.from('voucher_entries').delete().in('voucher_id', (await supabase.from('vouchers').select('id').eq('shop_id', shop.id)).data?.map(v => v.id) || [])
      await supabase.from('vouchers').delete().eq('shop_id', shop.id)
      await supabase.from('capital_accounts').delete().eq('shop_id', shop.id)
      await supabase.from('fixed_assets').delete().eq('shop_id', shop.id)
      await supabase.from('financial_years').delete().eq('shop_id', shop.id)
      await supabase.from('transactions').delete().eq('shop_id', shop.id)
      const invIds = (await supabase.from('invoices').select('id').eq('shop_id', shop.id)).data?.map(i => i.id) || []
      if (invIds.length) await supabase.from('invoice_items').delete().in('invoice_id', invIds)
      await supabase.from('invoices').delete().eq('shop_id', shop.id)
      const purIds = (await supabase.from('purchases').select('id').eq('shop_id', shop.id)).data?.map(p => p.id) || []
      if (purIds.length) await supabase.from('purchase_items').delete().in('purchase_id', purIds)
      await supabase.from('purchases').delete().eq('shop_id', shop.id)
      await supabase.from('customers').delete().eq('shop_id', shop.id)
      await supabase.from('products').delete().eq('shop_id', shop.id)
      await supabase.from('suppliers').delete().eq('shop_id', shop.id)
      await supabase.from('shops').delete().eq('id', shop.id)
      alert('Shop delete ho gaya. Logout ho raha hai...')
      onSignOut()
    } catch (err) {
      alert('Delete error: ' + err.message)
      setDeleteLoading(false)
    }
  }

  const Section = ({ id, label, emoji }) => (
    <button onClick={() => setActiveSection(id)} style={{
      background: activeSection === id ? C.g : '#fff', color: activeSection === id ? '#fff' : C.text,
      border: `1.5px solid ${activeSection === id ? C.g : C.border}`,
      borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
    }}>{emoji} {label}</button>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 20 }}>⚙️ Shop Settings</div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Section id="basic"   emoji="🏪" label="Basic Info" />
        <Section id="gst"     emoji="📋" label="GST Settings" />
        <Section id="payment" emoji="💳" label="Payment & Customers" />
        <Section id="fy"      emoji="📅" label="Financial Year" />
        <Section id="backup"  emoji="💾" label="Backup & Export" />
        <Section id="paypal"  emoji="🅿️" label="PayPal" />
        <Section id="danger"  emoji="⚠️" label="Danger Zone" />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

        {/* BASIC INFO */}
        {activeSection === 'basic' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g, marginBottom: 4 }}>🏪 Dukaan ki Basic Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>Dukaan ka Naam *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sharma General Store" style={inp} />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>Malik ka Naam *</label>
                <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Ramesh Sharma" style={inp} />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>WhatsApp Number</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" style={inp} />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>Shehar</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Lucknow" style={inp} />
              </div>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>Poora Address</label>
              <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Shop no., Street, Area, City, State - PIN" rows={3} style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>Emoji</label>
                <input value={form.biz_emoji} onChange={e => setForm(f => ({ ...f, biz_emoji: e.target.value }))} style={{ ...inp, textAlign: 'center', fontSize: 22 }} />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>Business Type</label>
                <input value={form.biz_label} onChange={e => setForm(f => ({ ...f, biz_label: e.target.value }))} placeholder="Kirana Store" style={inp} />
              </div>
            </div>
          </div>
        )}

        {/* GST SETTINGS */}
        {activeSection === 'gst' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g, marginBottom: 4 }}>📋 GST Settings</div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 13, color: C.text, display: 'block', marginBottom: 8 }}>GST Registration Status</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['unregistered', '❌ Unregistered'], ['registered', '✅ Registered']].map(([v, l]) => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, gst_type: v }))} style={{ flex: 1, background: form.gst_type === v ? C.g : '#fff', color: form.gst_type === v ? '#fff' : C.text, border: `1.5px solid ${form.gst_type === v ? C.g : C.border}`, borderRadius: 10, padding: '10px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
            {form.gst_type === 'registered' && (
              <>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 12, color: C.text, display: 'block', marginBottom: 5 }}>GSTIN Number</label>
                  <input value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value.toUpperCase() }))} placeholder="22AAAAA0000A1Z5" style={inp} />
                </div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 13, color: C.text, display: 'block', marginBottom: 8 }}>GST Scheme</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[['regular', '📊 Regular Scheme'], ['composition', '💡 Composition Scheme']].map(([v, l]) => (
                      <button key={v} onClick={() => setForm(f => ({ ...f, gst_scheme: v }))} style={{ flex: 1, background: form.gst_scheme === v ? C.blue : '#fff', color: form.gst_scheme === v ? '#fff' : C.text, border: `1.5px solid ${form.gst_scheme === v ? C.blue : C.border}`, borderRadius: 10, padding: '10px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PAYMENT & CUSTOMERS */}
        {activeSection === 'payment' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g }}>💳 Payment Modes</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[['cash', '💵 Cash'], ['upi', '📱 UPI/QR'], ['bank', '🏦 Bank Transfer']].map(([k, l]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, pay_modes: { ...f.pay_modes, [k]: !f.pay_modes[k] } }))} style={{ background: form.pay_modes[k] ? C.g : '#fff', color: form.pay_modes[k] ? '#fff' : C.text, border: `1.5px solid ${form.pay_modes[k] ? C.g : C.border}`, borderRadius: 20, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g }}>👥 Customer Types</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['retail', '🛒 Retail'], ['wholesale', '📦 Wholesale']].map(([k, l]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, cust_types: { ...f.cust_types, [k]: !f.cust_types[k] } }))} style={{ background: form.cust_types[k] ? C.g : '#fff', color: form.cust_types[k] ? '#fff' : C.text, border: `1.5px solid ${form.cust_types[k] ? C.g : C.border}`, borderRadius: 20, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {/* FINANCIAL YEAR */}
        {activeSection === 'fy' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g }}>📅 Financial Year Setup</div>
            <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#0369a1' }}>
              💡 India mein FY: 1 April to 31 March hoti hai. Nayi FY shuru karne par opening balances daalo.
              <br />Purani FY ka data safe rahega — sirf active FY change hoga.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 5 }}>FY Label</label>
                <input value={fy.label} onChange={e => setFy(f => ({ ...f, label: e.target.value }))} placeholder="2025-26" style={inp} />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 5 }}>Start Date</label>
                <input type="date" value={fy.start} onChange={e => setFy(f => ({ ...f, start: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 5 }}>End Date</label>
                <input type="date" value={fy.end} onChange={e => setFy(f => ({ ...f, end: e.target.value }))} style={inp} />
              </div>
              <div></div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 5 }}>Opening Cash Balance ₹</label>
                <input type="number" value={fy.openingCash} onChange={e => setFy(f => ({ ...f, openingCash: e.target.value }))} placeholder="Kal ka closing cash" style={inp} />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 5 }}>Opening Bank Balance ₹</label>
                <input type="number" value={fy.openingBank} onChange={e => setFy(f => ({ ...f, openingBank: e.target.value }))} placeholder="Bank mein kitna hai" style={inp} />
              </div>
            </div>
            <button onClick={saveFY} disabled={fySaving} style={{ background: fySaving ? C.muted : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 15, cursor: fySaving ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}>
              {fySaving ? '⏳ Saving...' : '📅 New FY Set Karo'}
            </button>
          </div>
        )}

        {/* BACKUP */}
        {activeSection === 'backup' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g }}>💾 Backup & Export</div>
            <div style={{ background: C.gXL, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.gD }}>
              ✅ Apna poora data export karo — JSON (complete backup) ya CSV (invoices only)
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={exportBackup} disabled={backupLoading}
                style={{ background: backupLoading ? C.muted : `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, cursor: backupLoading ? 'not-allowed' : 'pointer' }}>
                {backupLoading ? '⏳ Exporting...' : '💾 Full Backup (JSON)'}
              </button>
              <button onClick={exportCSV}
                style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                📊 Invoices Export (CSV)
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              💡 JSON backup se aap baad mein data restore kar sakte hain. Har hafte backup lena recommended hai.
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        {activeSection === 'danger' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: '#dc2626' }}>⚠️ Danger Zone</div>
            <div style={{ background: '#fff5f5', border: '2px solid #fca5a5', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#dc2626', marginBottom: 8 }}>🗑️ Company Delete Karo</div>
              <div style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 16, lineHeight: 1.7 }}>
                ⚠️ <b>CAUTION:</b> Ye action irreversible hai! Saara data permanently delete hoga:
                <br />Customers, Products, Invoices, Purchases, Transactions, Vouchers, Fixed Assets — sab.
                <br /><br />
                Confirm karne ke liye <b>dukaan ka naam type karo: "{shop.name}"</b>
              </div>
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={`"${shop.name}" type karo confirm karne ke liye`}
                style={{ ...inp, border: '2px solid #fca5a5', marginBottom: 12, color: '#dc2626', fontWeight: 700 }} />
              <button onClick={deleteCompany} disabled={deleteConfirm !== shop.name || deleteLoading}
                style={{ background: deleteConfirm === shop.name ? '#dc2626' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 14, cursor: deleteConfirm === shop.name ? 'pointer' : 'not-allowed' }}>
                {deleteLoading ? '⏳ Deleting...' : '🗑️ PERMANENTLY DELETE'}
              </button>
            </div>
          </div>
        )}

        {/* PAYPAL */}
        {activeSection === 'paypal' && <PayPalSettings />}
      </div>

      {/* Save Button — only for basic/gst/payment sections */}
      {['basic', 'gst', 'payment'].includes(activeSection) && (
        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={save} disabled={saving} style={{ background: saving ? C.muted : `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 32px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
            {saving ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
          {saved && <span style={{ color: C.g, fontWeight: 700, fontSize: 14 }}>✅ Saved successfully!</span>}
        </div>
      )}
    </div>
  )
}
