import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function Purchases({ shop }) {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    supplier_id: '',
    supplier_name: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    pay_mode: 'cash',
    items: [],
    note: ''
  })
  const [searchProd, setSearchProd] = useState('')
  const [viewId, setViewId] = useState(null)
  const [viewItems, setViewItems] = useState([])

  useEffect(() => { loadAll() }, [shop.id])

  const loadAll = async () => {
    const [{ data: pur }, { data: sup }, { data: prod }] = await Promise.all([
      supabase.from('purchases').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('shop_id', shop.id),
      supabase.from('products').select('*').eq('shop_id', shop.id).order('name')
    ])
    setPurchases(pur || [])
    setSuppliers(sup || [])
    setProducts(prod || [])
  }

  const addItem = (prod) => {
    setForm(f => {
      const exists = f.items.find(i => i.product_id === prod.id)
      if (exists) return { ...f, items: f.items.map(i => i.product_id === prod.id ? { ...i, qty: i.qty + 1 } : i) }
      return { ...f, items: [...f.items, { product_id: prod.id, product_name: prod.name, qty: 1, price: prod.retail_price || 0, unit: prod.unit }] }
    })
    setSearchProd('')
  }

  const updateItem = (pid, field, val) => {
    setForm(f => ({ ...f, items: f.items.map(i => i.product_id === pid ? { ...i, [field]: val } : i) }))
  }

  const removeItem = (pid) => setForm(f => ({ ...f, items: f.items.filter(i => i.product_id !== pid) }))

  const total = form.items.reduce((s, i) => s + (i.qty * i.price), 0)

  const savePurchase = async () => {
    if (!form.items.length) return alert('Koi item nahi daala!')
    setSaving(true)

    const supplierName = suppliers.find(s => s.id === form.supplier_id)?.name || form.supplier_name || 'Direct Purchase'

    // Step 1: Save purchase
    const { data: pur, error } = await supabase.from('purchases').insert({
      shop_id: shop.id,
      supplier_id: form.supplier_id || null,
      supplier_name: supplierName,
      total,
      purchase_date: form.purchase_date,
      pay_mode: form.pay_mode,
      status: 'received',
      note: form.note || null
    }).select().single()

    if (error) {
      console.error('Purchase error:', error)
      alert('Error saving purchase: ' + error.message)
      setSaving(false)
      return
    }

    // Step 2: Save purchase items
    const { error: itemsErr } = await supabase.from('purchase_items').insert(
      form.items.map(i => ({
        purchase_id: pur.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.qty,
        price: i.price
      }))
    )

    if (itemsErr) {
      console.error('Purchase items error:', itemsErr)
    }

    // Step 3: Update stock
    for (const item of form.items) {
      const prod = products.find(p => p.id === item.product_id)
      if (prod) {
        await supabase.from('products')
          .update({ stock: (prod.stock || 0) + item.qty })
          .eq('id', prod.id)
      }
    }

    // Step 4: Auto-create Payment Voucher if cash/bank payment
    if (form.pay_mode !== 'credit' && supplierName !== 'Direct Purchase') {
      const voucherNo = `PV-${Date.now().toString().slice(-6)}`
      const { data: voucher } = await supabase.from('vouchers').insert({
        shop_id: shop.id,
        voucher_type: 'payment',
        voucher_no: voucherNo,
        voucher_date: form.purchase_date,
        narration: `Purchase payment to ${supplierName} - ${form.items.map(i => i.product_name).join(', ')}`,
        party_name: supplierName,
        total_amount: total
      }).select().single()

      if (voucher) {
        await supabase.from('voucher_entries').insert([
          { voucher_id: voucher.id, ledger_name: supplierName, ledger_type: 'creditor', dr_amount: total, cr_amount: 0 },
          { voucher_id: voucher.id, ledger_name: form.pay_mode === 'bank' ? 'Bank Account' : 'Cash in Hand', ledger_type: form.pay_mode === 'bank' ? 'bank' : 'cash', dr_amount: 0, cr_amount: total }
        ])
      }
    }

    setForm({ supplier_id: '', supplier_name: '', purchase_date: new Date().toISOString().slice(0, 10), pay_mode: 'cash', items: [], note: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
    alert('✅ Purchase saved! Stock update ho gaya.')
  }

  const loadPurchaseItems = async (purId) => {
    const { data } = await supabase.from('purchase_items').select('*').eq('purchase_id', purId)
    setViewItems(data || [])
    setViewId(purId)
  }

  const filteredProds = products.filter(p =>
    p.name.toLowerCase().includes(searchProd.toLowerCase()) && !p.is_service
  )
  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fafffe' }

  const payModeLabel = { cash: '💵 Cash', bank: '🏦 Bank', credit: '📒 Credit (Baaki)' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD }}>🛒 Purchase / Stock Aana</div>
        <button onClick={() => setShowForm(s => !s)} style={{ background: `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          {showForm ? '✕ Band Karo' : '+ Naya Purchase'}
        </button>
      </div>

      {/* Purchase Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `2px solid ${C.border}` }}>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16, color: C.g, marginBottom: 16 }}>📦 Naya Purchase Darj Karein</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Supplier Chunein</label>
              <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} style={{ ...inp, width: '100%' }}>
                <option value="">-- Direct Purchase --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} style={{ ...inp, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Note (optional)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Koi note..." style={{ ...inp, width: '100%' }} />
            </div>
          </div>

          {/* Payment Mode */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 8, color: C.text }}>💳 Payment Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['cash', '💵 Cash'], ['bank', '🏦 Bank'], ['credit', '📒 Credit (Baaki)']].map(([k, l]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, pay_mode: k }))}
                  style={{ flex: 1, background: form.pay_mode === k ? (k === 'credit' ? C.gold : C.g) : '#fff', color: form.pay_mode === k ? '#fff' : C.text, border: `1.5px solid ${form.pay_mode === k ? (k === 'credit' ? C.gold : C.g) : C.border}`, borderRadius: 9, padding: '8px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
            {form.pay_mode === 'credit' && (
              <div style={{ marginTop: 8, background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
                ⚠️ Credit purchase — supplier ko baad mein paisa dena hoga. Payment Voucher se settle karein.
              </div>
            )}
            {form.pay_mode !== 'credit' && (
              <div style={{ marginTop: 8, background: C.gXL, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.gD }}>
                ✅ {form.pay_mode === 'cash' ? 'Cash' : 'Bank'} se payment hogi — Payment Voucher auto-create hoga.
              </div>
            )}
          </div>

          {/* Product Search */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input value={searchProd} onChange={e => setSearchProd(e.target.value)} placeholder="🔍 Product search karke add karein..." style={{ ...inp, width: '100%', boxSizing: 'border-box', padding: '10px 14px' }} />
            {searchProd && filteredProds.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                {filteredProds.slice(0, 8).map(p => (
                  <div key={p.id} onClick={() => addItem(p)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${C.gXL}`, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{p.name}</span>
                    <span style={{ color: C.muted, fontWeight: 500 }}>Stock: {p.stock} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Table */}
          {form.items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.gXL }}>
                    {['Product', 'Qty', 'Unit', 'Rate (₹)', 'Total', ''].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: C.gD, fontSize: 11 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {form.items.map(item => (
                    <tr key={item.product_id} style={{ borderBottom: `1px solid ${C.gXL}` }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{item.product_name}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <input type="number" value={item.qty} min={1} onChange={e => updateItem(item.product_id, 'qty', +e.target.value)} style={{ ...inp, width: 70, textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '8px 10px', color: C.muted }}>{item.unit}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <input type="number" value={item.price} min={0} onChange={e => updateItem(item.product_id, 'price', +e.target.value)} style={{ ...inp, width: 90 }} />
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g }}>₹{(item.qty * item.price).toFixed(0)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => removeItem(item.product_id)} style={{ background: C.redL, border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', padding: '10px 10px 0', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 18, color: C.gD }}>
                Total: ₹{total.toFixed(0)} &nbsp;
                <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>({payModeLabel[form.pay_mode]})</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={savePurchase} disabled={saving || !form.items.length}
              style={{ background: saving || !form.items.length ? C.muted : `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 15, cursor: saving || !form.items.length ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Saving...' : '✅ Purchase Save Karo (Stock Update Hogi)'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: '#f3f4f6', color: C.text, border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Purchase History */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, color: C.text, display: 'flex', justifyContent: 'space-between' }}>
          <span>📋 Purchase History</span>
          <span style={{ fontSize: 13, color: C.muted }}>{purchases.length} purchases</span>
        </div>
        {purchases.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Koi purchase nahi — "+ Naya Purchase" se add karein</div>
          : purchases.map(p => (
            <div key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.gXL}`, cursor: 'pointer' }} onClick={() => viewId === p.id ? setViewId(null) : loadPurchaseItems(p.id)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.supplier_name || 'Direct Purchase'}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {p.purchase_date}
                    {p.note && ` • ${p.note}`}
                    {p.pay_mode && <span style={{ marginLeft: 8, background: p.pay_mode === 'cash' ? C.gXL : p.pay_mode === 'bank' ? '#dbeafe' : '#fef9c3', color: p.pay_mode === 'cash' ? C.gD : p.pay_mode === 'bank' ? '#1d4ed8' : '#92400e', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{payModeLabel[p.pay_mode] || p.pay_mode}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 18, color: C.g }}>₹{p.total}</span>
                  <span style={{ background: C.gXL, color: C.g, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>✅ Received</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{viewId === p.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {viewId === p.id && viewItems.length > 0 && (
                <div style={{ background: C.gXL, padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
                  {viewItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                      <span style={{ fontWeight: 700 }}>{item.product_name}</span>
                      <span style={{ color: C.muted }}>{item.quantity} × ₹{item.price} = <b style={{ color: C.gD }}>₹{item.quantity * item.price}</b></span>
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
