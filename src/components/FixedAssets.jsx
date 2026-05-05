import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const FA_CATEGORIES = ['Equipment', 'Furniture', 'Vehicle', 'Computer', 'Land', 'Building', 'Machinery', 'Other']

export default function FixedAssets({ shop }) {
  const [assets, setAssets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    category: 'Equipment',
    purchase_date: new Date().toISOString().slice(0, 10),
    cost: '',
    current_value: '',
    depreciation_rate: '',
    description: '',
  })

  useEffect(() => { loadAssets() }, [shop.id])

  const loadAssets = async () => {
    const { data } = await supabase.from('fixed_assets').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
    setAssets(data || [])
  }

  const resetForm = () => {
    setForm({ name: '', category: 'Equipment', purchase_date: new Date().toISOString().slice(0, 10), cost: '', current_value: '', depreciation_rate: '', description: '' })
    setEditId(null)
    setShowForm(false)
  }

  const saveAsset = async () => {
    if (!form.name || !form.cost) return alert('Naam aur cost zaroori hai!')
    setSaving(true)
    const payload = {
      shop_id: shop.id,
      name: form.name,
      category: form.category,
      purchase_date: form.purchase_date,
      cost: +form.cost,
      current_value: form.current_value !== '' ? +form.current_value : +form.cost,
      depreciation_rate: form.depreciation_rate !== '' ? +form.depreciation_rate : 0,
      description: form.description || null,
    }

    if (editId) {
      const { error } = await supabase.from('fixed_assets').update(payload).eq('id', editId)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('fixed_assets').insert(payload)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    }

    setSaving(false)
    resetForm()
    loadAssets()
  }

  const editAsset = (a) => {
    setForm({ name: a.name, category: a.category, purchase_date: a.purchase_date, cost: a.cost, current_value: a.current_value, depreciation_rate: a.depreciation_rate || '', description: a.description || '' })
    setEditId(a.id)
    setShowForm(true)
  }

  const deleteAsset = async (id) => {
    if (!window.confirm('Ye fixed asset delete karein?')) return
    await supabase.from('fixed_assets').delete().eq('id', id)
    loadAssets()
  }

  const totalCost = assets.reduce((s, a) => s + (a.cost || 0), 0)
  const totalValue = assets.reduce((s, a) => s + (a.current_value || 0), 0)
  const totalDepreciation = totalCost - totalValue

  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fafffe', width: '100%', boxSizing: 'border-box' }

  const catColors = {
    Equipment: '#dbeafe', Furniture: '#fef9c3', Vehicle: '#f0fdf4', Computer: '#ede9fe',
    Land: '#dcfce7', Building: '#e0f2fe', Machinery: '#fce7f3', Other: '#f3f4f6'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD }}>🏢 Fixed Assets</div>
          <div style={{ fontSize: 12, color: C.muted }}>Machinery, furniture, vehicle, equipment etc.</div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(s => !s) }}
          style={{ background: `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          {showForm && !editId ? '✕ Band Karo' : '+ Naya Asset'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['💰', 'Total Cost', totalCost, '#1d4ed8'],
          ['📈', 'Current Value', totalValue, C.g],
          ['📉', 'Total Depreciation', totalDepreciation, '#dc2626'],
        ].map(([icon, label, val, color]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color, marginTop: 4 }}>₹{val.toFixed(0)}</div>
            <div style={{ fontWeight: 700, fontSize: 11, color: C.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `2px solid ${C.border}` }}>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16, color: C.g, marginBottom: 16 }}>
            {editId ? '✏️ Asset Edit Karo' : '🏢 Naya Fixed Asset Add Karo'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Asset ka Naam *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jaise: Mahindra Pickup, Weighing Machine..." style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                {FA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Original Cost ₹ *</label>
              <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Current Value ₹</label>
              <input type="number" value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} placeholder="(same as cost if new)" style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Depreciation Rate % (per year)</label>
              <input type="number" value={form.depreciation_rate} onChange={e => setForm(f => ({ ...f, depreciation_rate: e.target.value }))} placeholder="Jaise: 15 (for vehicle)" style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 4 }}>Description (optional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Registration no., model, etc." style={inp} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveAsset} disabled={saving}
              style={{ background: saving ? C.muted : `linear-gradient(135deg,#14532d,#16a34a)`, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Saving...' : editId ? '✅ Update Karo' : '✅ Asset Add Karo'}
            </button>
            <button onClick={resetForm} style={{ background: '#f3f4f6', color: C.text, border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Asset List */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.gXL}`, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, display: 'flex', justifyContent: 'space-between' }}>
          <span>🏢 Fixed Assets Register</span>
          <span style={{ fontSize: 13, color: C.muted }}>{assets.length} assets</span>
        </div>
        {assets.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Koi fixed asset nahi — "+ Naya Asset" se add karein</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.gXL }}>
                  {['Asset', 'Category', 'Purchase Date', 'Cost', 'Current Value', 'Depreciation', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, color: C.gD, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => {
                  const depr = (a.cost || 0) - (a.current_value || 0)
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${C.gXL}`, background: i % 2 === 0 ? '#fafffe' : '#fff' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{a.name}</div>
                        {a.description && <div style={{ fontSize: 11, color: C.muted }}>{a.description}</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: catColors[a.category] || '#f3f4f6', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{a.category}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: C.muted }}>{a.purchase_date}</td>
                      <td style={{ padding: '10px 14px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: '#1d4ed8' }}>₹{(a.cost || 0).toFixed(0)}</td>
                      <td style={{ padding: '10px 14px', fontFamily: "'Baloo 2',cursive", fontWeight: 800, color: C.g }}>₹{(a.current_value || 0).toFixed(0)}</td>
                      <td style={{ padding: '10px 14px', fontFamily: "'Baloo 2',cursive", fontWeight: 700, color: depr > 0 ? '#dc2626' : C.muted }}>
                        {depr > 0 ? `-₹${depr.toFixed(0)}` : '—'}
                        {a.depreciation_rate > 0 && <div style={{ fontSize: 10, color: C.muted }}>{a.depreciation_rate}%/yr</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => editAsset(a)} style={{ background: '#dbeafe', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#1d4ed8', fontSize: 11, fontWeight: 700 }}>✏️</button>
                          <button onClick={() => deleteAsset(a.id)} style={{ background: C.redL, border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: C.red, fontSize: 11, fontWeight: 700 }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}
