import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const DEFAULT_CATEGORIES = [
  { name: 'Rent', icon: '🏠' },
  { name: 'Salary', icon: '💰' },
  { name: 'Utilities', icon: '⚡' },
  { name: 'Marketing', icon: '📢' },
  { name: 'Transport', icon: '🚚' },
  { name: 'Repairs', icon: '🔧' },
  { name: 'Delivery', icon: '📦' },
  { name: 'Insurance', icon: '🛡️' },
  { name: 'Other', icon: '📊' },
]

export default function Expenses({ shop }) {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterCategory, setFilterCategory] = useState('all')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    category: '',
    amount: '',
    payment_mode: 'cash',
    expense_date: new Date().toISOString().slice(0, 10),
    note: '',
  })

  useEffect(() => {
    if (shop?.id) {
      loadCategories()
      loadExpenses()
    }
  }, [shop?.id, selectedMonth, filterCategory])

  const loadCategories = async () => {
    if (!shop?.id) return
    const { data } = await supabase.from('expense_categories').select('*').eq('shop_id', shop.id)
    if (data && data.length === 0) {
      const defaults = DEFAULT_CATEGORIES.map(d => ({ ...d, shop_id: shop.id }))
      await supabase.from('expense_categories').insert(defaults)
      setCategories(defaults)
    } else {
      setCategories(data || [])
    }
  }

  const loadExpenses = async () => {
    if (!shop?.id) return
    const [year, month] = selectedMonth.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)
    
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('shop_id', shop.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })
    
    if (filterCategory !== 'all') {
      query = query.eq('category', filterCategory)
    }
    
    const { data } = await query
    setExpenses(data || [])
  }

  const save = async () => {
    if (!form.category || !form.amount) {
      alert('Category and Amount are required!')
      return
    }
    
    setSaving(true)
    const payload = {
      shop_id: shop.id,
      category: form.category,
      amount: parseFloat(form.amount),
      payment_mode: form.payment_mode,
      expense_date: form.expense_date,
      note: form.note,
    }

    try {
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
      loadExpenses()
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  const deleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return
    try {
      await supabase.from('expenses').delete().eq('id', id)
      loadExpenses()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const stats = {
    total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    byCategory: categories.map(c => ({
      ...c,
      amount: expenses.filter(e => e.category === c.name).reduce((sum, e) => sum + (e.amount || 0), 0)
    }))
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">💸 Expense Management</h1>

        {/* Month & Filter */}
        <div className="flex gap-4 mb-6 flex-wrap items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition">
            + Add Expense
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-green-500">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Edit' : 'New'} Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <select value={form.payment_mode} onChange={(e) => setForm({...form, payment_mode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="check">Check</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" value={form.expense_date} onChange={(e) => setForm({...form, expense_date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <input type="text" value={form.note} onChange={(e) => setForm({...form, note: e.target.value})} placeholder="Optional notes" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
              <button onClick={() => setShowForm(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-3xl font-bold text-green-600">₹{stats.total.toLocaleString('en-IN')}</p>
          </div>
          {stats.byCategory.slice(0, 3).map(cat => (
            <div key={cat.name} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600">{cat.icon} {cat.name}</p>
              <p className="text-3xl font-bold text-blue-600">₹{cat.amount.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 rounded-lg font-medium transition ${filterCategory === 'all' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setFilterCategory(cat.name)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterCategory === cat.name ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Mode</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Note</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500">No expenses found</td>
                  </tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{exp.category}</td>
                      <td className="px-4 py-3 font-bold text-green-600">₹{(exp.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(exp.expense_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600">{exp.payment_mode}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{exp.note}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteExpense(exp.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs transition">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
