import { useState } from 'react'
import SalesReport from './SalesReport.jsx'
import GSTReport from './GSTReport.jsx'
import { C } from '../lib/constants.js'

export default function Reports({ shop }) {
  const [tab, setTab] = useState('sales')

  return (
    <div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:22, color:C.gD, marginBottom:16 }}>📊 Reports</div>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['sales','💰 Sales Report'],['gst','📋 GST Report']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{ background:tab===v?C.g:'#fff', color:tab===v?'#fff':C.text, border:`1.5px solid ${tab===v?C.g:C.border}`, borderRadius:20, padding:'8px 20px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{l}</button>
        ))}
      </div>
      {tab==='sales' ? <SalesReport shop={shop}/> : <GSTReport shop={shop}/>}
    </div>
  )
}
