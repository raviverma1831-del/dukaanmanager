import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function KhataBook({ shop }) {
  const [customers, setCustomers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selId, setSelId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', type:'retail' })
  const [txForm, setTxForm] = useState({ note:'', amount:'', type:'credit' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCustomers() }, [shop.id])
  useEffect(() => { if (selId) loadTransactions(selId) }, [selId])

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').eq('shop_id', shop.id).order('name')
    setCustomers(data||[])
  }

  const loadTransactions = async (custId) => {
    const { data } = await supabase.from('transactions').select('*').eq('customer_id', custId).order('created_at', { ascending:false })
    setTransactions(data||[])
  }

  const addCustomer = async () => {
    if (!form.name) return
    setSaving(true)
    await supabase.from('customers').insert({ ...form, shop_id:shop.id, balance:0 })
    setForm({ name:'', phone:'', type:'retail' }); setShowAdd(false); setSaving(false)
    loadCustomers()
  }

  const addTransaction = async () => {
    if (!txForm.amount || !selId) return
    setSaving(true)
    const cur = customers.find(c=>c.id===selId)
    const amt = +txForm.amount
    const newBalance = txForm.type==='credit' ? (cur.balance||0)+amt : Math.max(0,(cur.balance||0)-amt)
    await supabase.from('customers').update({ balance:newBalance }).eq('id', selId)
    await supabase.from('transactions').insert({
      shop_id: shop.id, customer_id: selId,
      amount: amt, type: txForm.type,
      mode: txForm.type==='credit'?'udhar':'cash',
      note: txForm.note||'Manual entry',
      tx_date: new Date().toISOString().slice(0,10)
    })
    setTxForm({ note:'', amount:'', type:'credit' }); setSaving(false)
    loadCustomers(); loadTransactions(selId)
  }

  const cur = customers.find(c=>c.id===selId)
  const filtered = customers.filter(c=>filter==='all'||c.type===filter)
  const totalUdhar = customers.reduce((s,c)=>s+(c.balance||0),0)
  const inp = { border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe', width:'100%', boxSizing:'border-box' }

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>📒 Khata Book</div>
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
        {/* Left */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:C.text, fontSize:14 }}>Customers ({customers.length})</div>
            <button onClick={()=>setShowAdd(s=>!s)} style={{ background:C.g, color:'#fff', border:'none', borderRadius:9, padding:'5px 12px', fontWeight:700, fontSize:12, cursor:'pointer' }}>+ Add</button>
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            {[['all','All'],['retail','Retail'],['wholesale','Wholesale']].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{ flex:1, background:filter===v?C.g:'#fff', color:filter===v?'#fff':C.text, border:`1px solid ${filter===v?C.g:C.border}`, borderRadius:20, padding:'4px', fontSize:10, fontWeight:700, cursor:'pointer' }}>{l}</button>
            ))}
          </div>
          {showAdd && (
            <div style={{ background:C.card, borderRadius:12, padding:14, marginBottom:10, border:`1.5px solid ${C.border}` }}>
              <input placeholder="Naam *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{ ...inp, marginBottom:8 }}/>
              <input placeholder="Phone (WhatsApp)" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={{ ...inp, marginBottom:8 }}/>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{ ...inp, marginBottom:8 }}>
                {shop.cust_types?.retail && <option value="retail">Retail</option>}
                {shop.cust_types?.wholesale && <option value="wholesale">Wholesale</option>}
              </select>
              <button onClick={addCustomer} disabled={saving} style={{ width:'100%', background:C.g, color:'#fff', border:'none', borderRadius:9, padding:'8px', fontWeight:700, cursor:'pointer' }}>{saving?'Saving...':'Save'}</button>
            </div>
          )}
          <div style={{ background:C.gXL, borderRadius:12, padding:'10px 14px', marginBottom:10 }}>
            <div style={{ fontSize:11, color:C.gL, fontWeight:700 }}>Total Udhar Baaki</div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD }}>₹{totalUdhar}</div>
          </div>
          <div style={{ maxHeight:'calc(100vh - 340px)', overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {filtered.map(c=>(
              <div key={c.id} onClick={()=>setSelId(c.id)} style={{ background:selId===c.id?C.g:C.card, color:selId===c.id?'#fff':C.text, borderRadius:12, padding:'11px 14px', cursor:'pointer', border:`1.5px solid ${selId===c.id?C.g:'#e8f5e9'}`, transition:'all 0.12s' }}>
                <div style={{ fontWeight:800, fontSize:13 }}>{c.name}</div>
                <div style={{ fontSize:11, opacity:0.75 }}>📞 {c.phone||'N/A'} • {c.type}</div>
                <div style={{ marginTop:5 }}>
                  <span style={{ background:c.balance>0?(selId===c.id?'rgba(255,255,255,0.2)':C.redL):(selId===c.id?'rgba(255,255,255,0.15)':C.gXL), color:c.balance>0?(selId===c.id?'#fff':C.red):(selId===c.id?'#fff':C.g), borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:800 }}>
                    {c.balance>0?`₹${c.balance} baaki`:'✅ Clear'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        {cur ? (
          <div>
            <div style={{ background:C.card, borderRadius:16, padding:18, marginBottom:14, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:18, color:C.text }}>{cur.name}</div>
                  <div style={{ color:C.muted, fontSize:12 }}>📞 {cur.phone||'N/A'} • {cur.type}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:C.muted }}>Total Baaki</div>
                  <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:26, color:cur.balance>0?C.red:C.g }}>₹{cur.balance||0}</div>
                </div>
              </div>
              {cur.phone && (
                <a href={`https://wa.me/91${cur.phone}?text=Namaste ${cur.name} ji! Aapka balance ₹${cur.balance} baaki hai. - ${shop.name}`}
                  target="_blank" rel="noreferrer"
                  style={{ display:'inline-block', marginTop:12, background:'#25d366', color:'#fff', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:12, textDecoration:'none', fontFamily:"'Baloo 2',cursive" }}>
                  📱 WhatsApp Reminder Bhejo
                </a>
              )}
              {/* Add transaction */}
              <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
                <input placeholder="Note (optional)" value={txForm.note} onChange={e=>setTxForm(f=>({...f,note:e.target.value}))} style={{ ...inp, flex:2, minWidth:100 }}/>
                <input type="number" placeholder="Amount ₹" value={txForm.amount} onChange={e=>setTxForm(f=>({...f,amount:e.target.value}))} style={{ ...inp, flex:1, minWidth:80 }}/>
                <select value={txForm.type} onChange={e=>setTxForm(f=>({...f,type:e.target.value}))} style={{ ...inp, flex:'0 0 auto', width:'auto', padding:'9px 8px' }}>
                  <option value="credit">Udhar Diya</option>
                  <option value="paid">Payment Mila</option>
                </select>
                <button onClick={addTransaction} disabled={saving} style={{ background:txForm.type==='paid'?C.g:C.gold, color:'#fff', border:'none', borderRadius:10, padding:'9px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>+ Add</button>
              </div>
            </div>

            <div style={{ background:C.card, borderRadius:14, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.gXL}`, fontWeight:800, color:C.text, fontSize:13 }}>📋 Transaction History</div>
              {transactions.length===0
                ? <div style={{ padding:30, textAlign:'center', color:C.muted, fontSize:13 }}>Koi transaction nahi</div>
                : transactions.map((tx,i)=>(
                  <div key={tx.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 16px', borderTop:i>0?`1px solid ${C.gXL}`:'none' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{tx.note||'—'}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{tx.tx_date} • {tx.mode}</div>
                    </div>
                    <span style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:15, color:tx.type==='paid'?C.g:C.red }}>
                      {tx.type==='paid'?'−':'+'}₹{tx.amount}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
            <div style={{ fontSize:48 }}>👈</div>
            <div style={{ fontWeight:700, marginTop:8 }}>Customer select karein</div>
          </div>
        )}
      </div>
    </div>
  )
}
