import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const DEFAULT_CATEGORIES = [
  { name: 'Rent', icon: '🏠' },
  { name: 'Salary', icon: '💰' },
  { name: 'Utilities', icon: '⚡' },
  { name: 'Marketing', icon: '📢' },
  { name: 'Transport', icon: '🚚' },
  { name: 'Repairs', icon: '🔧' },
  { name: 'Office Supplies', icon: '📝' },
  { name: 'Insurance', icon: '🛡️' },
  { name: 'Other', icon: '📊' },
]

export default function Expenses({ shop }) {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterCategory, setFilterCategory] = useState('All')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    category: '',
    amount: '',
    payment_mode: 'cash',
    expense_date: new Date().toISOString().slice(0, 10),
    note: '',
  })

  useEffect(() => {
    loadCategories()
    loadExpenses()
  }, [shop.id, selectedMonth])

  const loadCategories = async () => {
    const { data } = await supabase.from('expense_categories').select('*').eq('shop_id', shop.id)
    if (data && data.length === 0) {
      // First time - create default categories
      const defaults = DEFAULT_CATEGORIES.map(d => ({ ...d, shop_id: shop.id }))
      await supabase.from('expense_categories').insert(defaults)
      setCategories(defaults)
    } else {
      setCategories(data || [])
    }
  }

  const loadExpenses = async () => {
    const [year, month] = selectedMonth.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)
    
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop_id', shop.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })
    
    setExpenses(data || [])
  }

  const save = async () => {
    if (!form.category || !form.amount) return alert('Category aur Amount zaroori hai!')
    
    setSaving(true)
    const payload = {
      shop_id: shop.id,
      category: form.category,
      amount: +form.amount,
      payment_mode: form.payment_mode,
      expense_date: form.expense_date,
      note: form.note,
    }

    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing)
    } else {
      await supabase.from('expenses').insert(payload)
    }

    setForm({
      category: '',
      amount: '',
      payment_mode: 'cash',
      expense_date: new Date().toISOString().slice(0, 10),
      note: '',
    })
    setEditing(null)
    setShowForm(false)
    setSaving(false)
    loadExpenses()
  }

  const deleteExpense = async (id) => {
    if (!confirm('Yeh expense delete karte ho?')) return
    await supabase.from('expenses').delete().eq('id', id)
    loadExpenses()
  }

  const editExpense = (exp) => {
    setEditing(exp.id)
    setForm({
      category: exp.category,
      amount: String(exp.amount),
      payment_mode: exp.payment_mode,
      expense_date: exp.expense_date,
      note: exp.note || '',
    })
    setShowForm(true)
  }

  const filtered = filterCategory === 'All' 
    ? expenses 
    : expenses.filter(e => e.category === filterCategory)

  const totalExpense = filtered.reduce((s, e) => s + e.amount, 0)
  const byCategory = {}
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })

  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: "'DM Sans',sans-serif", background: '#fafffe', width: '100%', boxSizing: 'border-box' }

  const categoryIcon = (cat) => categories.find(c => c.name === cat)?.icon || '📊'

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 16 }}>💸 Expenses</div>

      {/* Month & Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input 
          type="month" 
          value={selectedMonth} 
          onChange={e => setSelectedMonth(e.target.value)} 
          style={{ ...inp, flex: '0 0 150px' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All', ...categories.map(c => c.name)].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                background: filterCategory === cat ? C.g : '#fff',
                color: filterCategory === cat ? '#fff' : C.text,
                border: `1.5px solid ${filterCategory === cat ? C.g : C.border}`,
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {cat === 'All' ? 'All' : `${categoryIcon(cat)} ${cat}`}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ category: '', amount: '', payment_mode: 'cash', expense_date: new Date().toISOString().slice(0, 10), note: '' }); setShowForm(s => !s) }}
          style={{ background: `linear-gradient(135deg,#dc2626,#ef4444)`, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto' }}
        >
          + Add Expense
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, border: `2px solid ${C.border}`, boxShadow: '0 4px 16px rgba(220,38,38,0.08)' }}>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, marginBottom: 16, color: '#dc2626' }}>
            {editing ? '✏️ Edit Expense' : '➕ Naya Expense'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: C.text }}>Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                <option value="">-- Select Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{categoryIcon(c.name)} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: C.text }}>Amount ₹ *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: C.text }}>Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))} style={inp}>
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="bank">🏦 Bank</option>
                <option value="cheque">📄 Cheque</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: C.text }}>Date</label>
              <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: C.text }}>Note (optional)</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Details..." rows={2} style={{ ...inp, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} style={{ background: saving ? C.muted : 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 800, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Baloo 2',cursive" }}>
              {saving ? 'Saving...' : '💾 Save'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }} style={{ background: '#f3f4f6', color: C.text, border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fef2f2', borderRadius: 12, padding: 16, border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 12, color: '#7f1d1d', fontWeight: 700, marginBottom: 4 }}>Monthly Total</div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 24, color: '#dc2626' }}>₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700, marginBottom: 4 }}>Filtered Total</div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 24, color: C.g }}>₹{totalExpense.toLocaleString()}</div>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, border: '1px solid #bae6fd' }}>
          <div style={{ fontSize: 12, color: '#0c4a6e', fontWeight: 700, marginBottom: 4 }}>Count</div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 24, color: C.blue }}>
            {filtered.length} {filterCategory === 'All' ? 'items' : `${filterCategory}`}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 12 }}>📊 By Category</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
            {Object.entries(byCategory).map(([cat, amt]) => (
              <div key={cat} style={{ background: C.gXL, borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{categoryIcon(cat)} {cat}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.g, marginTop: 4 }}>₹{amt.toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>
                  {((amt / expenses.reduce((s, e) => s + e.amount, 0)) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.gXL}`, fontWeight: 800, color: C.text }}>📋 Expense History</div>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Koi expense nahi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Date', 'Category', 'Payment', 'Amount', 'Note', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: C.gD, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, i) => (
                  <tr key={exp.id} style={{ borderTop: `1px solid ${C.gXL}`, background: i % 2 === 0 ? '#fafffe' : '#fff' }}>
                    <td style={{ padding: '10px 12px' }}>{exp.expense_date}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{categoryIcon(exp.category)} {exp.category}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: C.gXL, color: C.gD, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
                        {exp.payment_mode === 'cash' ? '💵' : exp.payment_mode === 'upi' ? '📱' : exp.payment_mode === 'bank' ? '🏦' : '📄'} {exp.payment_mode}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, color: '#dc2626' }}>₹{exp.amount.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: C.muted, fontSize: 12, maxWidth: 150 }}>{exp.note || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => editExpense(exp)} style={{ background: C.goldL, border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.gold }}>✏️</button>
                        <button onClick={() => deleteExpense(exp.id)} style={{ background: C.redL, border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.red }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
