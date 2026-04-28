import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

const DEFAULT_CATEGORIES = [
  { emoji:'🏪', name:'Dukaan Kiraya' },
  { emoji:'💡', name:'Bijli Bill' },
  { emoji:'💧', name:'Paani Bill' },
  { emoji:'📱', name:'Phone/Internet' },
  { emoji:'🚚', name:'Transport/Delivery' },
  { emoji:'👷', name:'Staff Salary' },
  { emoji:'🔧', name:'Repair/Maintenance' },
  { emoji:'📦', name:'Packaging' },
  { emoji:'🖨️', name:'Printing/Stationery' },
  { emoji:'📣', name:'Advertising' },
  { emoji:'🏥', name:'Medical' },
  { emoji:'🍽️', name:'Food/Tea' },
  { emoji:'🏦', name:'Bank Charges' },
  { emoji:'📋', name:'GST/Tax' },
  { emoji:'⚙️', name:'Equipment' },
  { emoji:'🛒', name:'Miscellaneous' },
]

const EMOJI_LIST = ['🏪','💡','💧','📱','🚚','👷','🔧','📦','🖨️','📣','🏥','🍽️','🏦','📋','⚙️','🛒','💰','🎯','🏋️','🌟','🎁','🚗','✈️','🏠','📊','💼','🔑','🎨','🛍️','🌿','💊','🔌','📷','🎵','🏆','🌞','❄️','🔥','💎','🎪']

export default function ExpenseCategories({ shop, onClose }) {
  const [categories, setCategories] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ emoji:'🛒', name:'' })
  const [saving, setSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => { loadCategories() }, [shop.id])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('shop_id', shop.id)
      .order('name')

    if (!data || data.length === 0) {
      // Insert defaults on first load
      const { data: inserted } = await supabase.from('expense_categories').insert(
        DEFAULT_CATEGORIES.map(c => ({ ...c, shop_id: shop.id }))
      ).select()
      setCategories(inserted || DEFAULT_CATEGORIES.map((c,i) => ({ ...c, id:i, shop_id:shop.id })))
    } else {
      setCategories(data)
    }
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (editingId) {
      await supabase.from('expense_categories').update({ emoji:form.emoji, name:form.name }).eq('id', editingId)
      setEditingId(null)
    } else {
      await supabase.from('expense_categories').insert({ emoji:form.emoji, name:form.name, shop_id:shop.id })
    }
    setForm({ emoji:'🛒', name:'' }); setShowAdd(false); setSaving(false)
    loadCategories()
  }

  const deleteC = async (id) => {
    if (!confirm('Delete karein?')) return
    await supabase.from('expense_categories').delete().eq('id', id)
    loadCategories()
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setForm({ emoji:cat.emoji, name:cat.name })
    setShowAdd(true)
  }

  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', background:'#fafffe', fontFamily:"'DM Sans',sans-serif" }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:560, width:'100%', maxHeight:'85vh', overflow:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:20, color:C.gD }}>💸 Expense Categories</div>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:14, fontWeight:700 }}>✕</button>
        </div>

        {/* Add/Edit Form */}
        {showAdd ? (
          <div style={{ background:C.gXL, borderRadius:14, padding:16, marginBottom:16, border:`1.5px solid ${C.border}` }}>
            <div style={{ fontWeight:800, color:C.g, marginBottom:12 }}>{editingId ? '✏️ Category Edit' : '➕ Nai Category'}</div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              {/* Emoji Picker */}
              <div style={{ position:'relative' }}>
                <button onClick={()=>setShowEmojiPicker(!showEmojiPicker)} style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:22, cursor:'pointer', lineHeight:1 }}>
                  {form.emoji}
                </button>
                {showEmojiPicker && (
                  <div style={{ position:'absolute', top:'100%', left:0, background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:10, zIndex:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', width:220 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {EMOJI_LIST.map(e=>(
                        <button key={e} onClick={()=>{setForm(f=>({...f,emoji:e}));setShowEmojiPicker(false)}}
                          style={{ background:form.emoji===e?C.gXL:'transparent', border:`1px solid ${form.emoji===e?C.g:'transparent'}`, borderRadius:6, padding:4, fontSize:18, cursor:'pointer' }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="Category ka naam likhein..." style={{ ...inp, flex:1 }}
                onKeyDown={e=>e.key==='Enter'&&save()}/>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={save} disabled={saving} style={{ background:saving?C.muted:C.g, color:'#fff', border:'none', borderRadius:9, padding:'8px 20px', fontWeight:800, cursor:saving?'not-allowed':'pointer', fontFamily:"'Baloo 2',cursive" }}>{saving?'Saving...':'💾 Save'}</button>
              <button onClick={()=>{setShowAdd(false);setEditingId(null);setForm({emoji:'🛒',name:''})}} style={{ background:'#f3f4f6', color:C.text, border:'none', borderRadius:9, padding:'8px 16px', fontWeight:700, cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setShowAdd(true)} style={{ width:'100%', background:`linear-gradient(135deg,#14532d,#16a34a)`, color:'#fff', border:'none', borderRadius:12, padding:'10px', fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:14, cursor:'pointer', marginBottom:16 }}>
            + Nai Category Add Karein
          </button>
        )}

        {/* Category List */}
        <div style={{ display:'grid', gap:8 }}>
          {categories.map(cat=>(
            <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#fafafa', borderRadius:12, border:`1px solid ${C.border}` }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{cat.emoji}</span>
              <span style={{ flex:1, fontWeight:700, fontSize:14 }}>{cat.name}</span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>startEdit(cat)} style={{ background:C.goldL, border:'none', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.gold }}>✏️ Edit</button>
                <button onClick={()=>deleteC(cat.id)} style={{ background:C.redL, border:'none', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:C.red }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:16, fontSize:12, color:C.muted, textAlign:'center' }}>
          {categories.length} categories • Emoji pe click karke change karein
        </div>
      </div>
    </div>
  )
}
