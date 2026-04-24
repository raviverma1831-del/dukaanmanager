import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const EXPENSE_CATEGORIES = [
  '🏪 Dukaan Kiraya', '💡 Bijli Bill', '💧 Paani Bill', '📱 Phone/Internet',
  '🚚 Transport/Delivery', '👷 Staff Salary', '🔧 Repair/Maintenance',
  '📦 Packaging', '🖨️ Printing/Stationery', '📣 Advertising',
  '🏥 Medical', '🍽️ Food/Tea', '🏦 Bank Charges', '📋 GST/Tax',
  '⚙️ Equipment', '🛒 Miscellaneous'
]

export default function Expenses({ shop }) {
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('month')
  const [catFilter, setCatFilter] = useState('All')
  const [editing, setEditing] = useState(null)

  const empty = {
    category: '🛒 Miscellaneous', description: '', amount: '',
    expense_date: new Date().toISOString().slice(0,10),
    payment_mode: 'cash', vendor: '', receipt_note: ''
  }
  const [form, setForm] = useState(empty)

  useEffect(() => { loadExpenses() }, [filter, shop.id])

  const getRange = () => {
    const today = new Date()
    const t = today.toISOString().slice(0,10)
    if (filter === 'today') return [t, t]
    if (filter === 'week') { const d = new Date(); d.setDate(d.getDate()-7); return [d.toISOString().slice(0,10), t] }
    if (filter === 'month') { const d = new Date(); d.setDate(1); return [d.toISOString().slice(0,10), t] }
    if (filter === 'year') { const d = new Date(); d.setMonth(0,1); return [d.toISOString().slice(0,10), t] }
    return [t, t]
  }

  const loadExpenses = async () => {
    const [from, to] = getRange()
    const { data } = await supabase.from('expenses').select('*')
      .eq('shop_id', shop.id).gte('expense_date', from).lte('expense_date', to)
      .order('expense_date', { ascending: false })
    setExpenses(data || [])
  }

  const save = async () => {
    if (!form.description || !form.amount) return
    setSaving(true)
    const payload = { ...form, amount: +form.amount, shop_id: shop.id }
    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing)
      setEditing(null)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    setForm(empty); setShowForm(false); setSaving(false)
    loadExpenses()
  }

  const deleteE = async (id) => {
    if (!confirm('Delete karein?')) return
    await supabase.from('expenses').delete().eq('id', id)
    loadExpenses()
  }

  const editE = (e) => {
    setEditing(e.id)
    setForm({ category:e.category, description:e.description, amount:String(e.amount), expense_date:e.expense_date, payment_mode:e.payment_mode, vendor:e.vendor||'', receipt_note:e.receipt_note||'' })
    setShowForm(true); window.scrollTo(0,0)
  }

  // Summary calculations
  const filtered = catFilter === 'All' ? expenses : expenses.filter(e => e.category === catFilter)
  const totalExp = filtered.reduce((s,e) => s+e.amount, 0)
  const byCat = expenses.reduce((acc,e) => { acc[e.category]=(acc[e.category]||0)+e.amount; return acc }, {})
  const topCat = Object.entries(byCat).sort(([,a],[,b])=>b-a).slice(0,5)
  const allCats = ['All', ...new Set(expenses.map(e=>e.category))]

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', background:'#fafffe', width:'100%', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD }}>💸 Expenses</div>
        <button onClick={()=>{setEditing(null);setForm(empty);setShowForm(s=>!s)}} style={{ background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:14, cursor:'pointer' }}>
          {showForm ? '✕ Band Karo' : '+ Naya Expense'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:18, padding:24, marginBottom:20, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', border:`2px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:16, color:C.red, marginBottom:16 }}>
            {editing ? '✏️ Expense Edit' : '➕ Naya Expense Darj Karein'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Category *</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp}>
                {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Description *</label>
              <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Jaise: July ka kiraya, Staff salary..." style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Amount ₹ *</label>
              <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0" style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Date</label>
              <input type="date" value={form.expense_date} onChange={e=>setForm(f=>({...f,expense_date:e.target.value}))} style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Payment Mode</label>
              <select value={form.payment_mode} onChange={e=>setForm(f=>({...f,payment_mode:e.target.value}))} style={inp}>
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="bank">🏦 Bank Transfer</option>
                <option value="card">💳 Card</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Vendor / Party Name</label>
              <input value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder="Optional" style={inp}/>
            </div>
            <div>
              <label style={{ fontWeight:700, fontSize:11, display:'block', marginBottom:4 }}>Note / Receipt No.</label>
              <input value={form.receipt_note} onChange={e=>setForm(f=>({...f,receipt_note:e.target.value}))} placeholder="Optional" style={inp}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={save} disabled={saving} style={{ background:saving?C.muted:'#dc2626', color:'#fff', border:'none', borderRadius:12, padding:'10px 28px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:14, cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving...':'💾 Save Expense'}
            </button>
            <button onClick={()=>{setShowForm(false);setEditing(null)}} style={{ background:'#f3f4f6', color:C.text, border:'none', borderRadius:12, padding:'10px 18px', fontWeight:700, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <div style={{ background:'#fff', borderRadius:14, padding:'16px 18px', flex:'1 1 180px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid #dc2626` }}>
          <div style={{ fontSize:22 }}>💸</div>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:24, color:'#dc2626', marginTop:4 }}>₹{totalExp.toFixed(0)}</div>
          <div style={{ fontWeight:700, fontSize:12, color:C.text }}>Total Expenses</div>
          <div style={{ fontSize:11, color:C.muted }}>{filtered.length} entries</div>
        </div>
        {topCat.slice(0,4).map(([cat,amt])=>(
          <div key={cat} style={{ background:'#fff', borderRadius:14, padding:'16px 18px', flex:'1 1 150px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${C.gold}` }}>
            <div style={{ fontSize:18 }}>{cat.split(' ')[0]}</div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:C.gold, marginTop:4 }}>₹{amt.toFixed(0)}</div>
            <div style={{ fontWeight:700, fontSize:11, color:C.text }}>{cat.split(' ').slice(1).join(' ')}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6 }}>
          {[['today','Aaj'],['week','7 Din'],['month','Mahina'],['year','Saal']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{ background:filter===v?'#dc2626':'#fff', color:filter===v?'#fff':C.text, border:`1.5px solid ${filter===v?'#dc2626':C.border}`, borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:700, cursor:'pointer' }}>{l}</button>
          ))}
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ ...inp, width:'auto', flex:'0 0 auto' }}>
          {allCats.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Expense Table */}
      <div style={{ background:'#fff', borderRadius:14, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#fff5f5' }}>
                {['Date','Category','Description','Vendor','Mode','Amount','Actions'].map(h=>(
                  <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:800, color:'#991b1b', fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,i)=>(
                <tr key={e.id} style={{ borderTop:`1px solid #fff5f5`, background:i%2===0?'#fffafa':'#fff' }}>
                  <td style={{ padding:'10px 14px', color:C.muted, fontSize:12 }}>{e.expense_date}</td>
                  <td style={{ padding:'10px 14px' }}><span style={{ background:'#fff5f5', color:'#dc2626', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{e.category.split(' ').slice(1).join(' ')}</span></td>
                  <td style={{ padding:'10px 14px', fontWeight:700 }}>{e.description}</td>
                  <td style={{ padding:'10px 14px', color:C.muted, fontSize:12 }}>{e.vendor||'—'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ background:C.gXL, color:C.g, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>
                      {e.payment_mode==='cash'?'💵':e.payment_mode==='upi'?'📱':e.payment_mode==='bank'?'🏦':'💳'} {e.payment_mode}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', fontFamily:"'Baloo 2',cursive", fontWeight:900, color:'#dc2626', fontSize:16 }}>₹{e.amount}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>editE(e)} style={{ background:C.goldL, border:'none', borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.gold }}>✏️</button>
                      <button onClick={()=>deleteE(e.id)} style={{ background:C.redL, border:'none', borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.red }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:C.muted }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💸</div>
                Is period mein koi expense nahi
              </td></tr>}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background:'#fff5f5', borderTop:`2px solid #fecaca` }}>
                  <td colSpan={5} style={{ padding:'12px 14px', fontWeight:800, color:'#991b1b' }}>TOTAL</td>
                  <td style={{ padding:'12px 14px', fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:'#dc2626' }}>₹{totalExp.toFixed(2)}</td>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
