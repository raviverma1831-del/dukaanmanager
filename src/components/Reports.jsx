import { useState } from 'react'
import SalesReport from './SalesReport.jsx'
import GSTReport from './GSTReport.jsx'
import FinancialReports from './FinancialReports.jsx'
import Expenses from './Expenses.jsx'
import DayBook from './DayBook.jsx'
import { C } from '../lib/constants.js'

const TABS = [
  { id: 'daybook',  emoji: '📅', label: 'Day Book' },
  { id: 'sales',    emoji: '💰', label: 'Sales Report' },
  { id: 'financial',emoji: '📈', label: 'P&L / Balance Sheet' },
  { id: 'expenses', emoji: '💸', label: 'Expenses' },
  { id: 'gst',      emoji: '📋', label: 'GST Report' },
]

export default function Reports({ shop }) {
  const [tab, setTab] = useState('daybook')

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 16 }}>📊 Reports & Accounts</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', background: '#fff', borderRadius: 14, padding: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, minWidth: 110, background: tab === t.id ? C.g : 'transparent',
            color: tab === t.id ? '#fff' : C.muted, border: 'none', borderRadius: 10,
            padding: '10px 8px', fontWeight: tab === t.id ? 800 : 600, fontSize: 12,
            cursor: 'pointer', fontFamily: "'Baloo 2',cursive",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s'
          }}>
            <span style={{ fontSize: 15 }}>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'daybook'   && <DayBook shop={shop} />}
      {tab === 'sales'     && <SalesReport shop={shop} />}
      {tab === 'financial' && <FinancialReports shop={shop} />}
      {tab === 'expenses'  && <Expenses shop={shop} />}
      {tab === 'gst'       && <GSTReport shop={shop} />}
    </div>
  )
}
