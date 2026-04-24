import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AIDebtRecovery({ shop }) {
  const [debtors, setDebtors] = useState([])
  const [recoveryLogs, setRecoveryLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selectedDebtor, setSelectedDebtor] = useState(null)

  useEffect(() => {
    if (shop?.id) {
      loadDebtors()
      loadRecoveryLogs()
    }
  }, [shop?.id])

  const loadDebtors = async () => {
    if (!shop?.id) return
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shop.id)
        .gt('balance', 0)
        .order('balance', { ascending: false })
      
      if (customers) {
        const enriched = customers.map(c => {
          const lastTxn = c.last_transaction_date ? new Date(c.last_transaction_date) : new Date()
          const daysOverdue = Math.floor((Date.now() - lastTxn.getTime()) / (1000 * 60 * 60 * 24))
          return {
            ...c,
            daysOverdue,
            priority: c.balance > 10000 ? 'high' : c.balance > 5000 ? 'medium' : 'low'
          }
        })
        setDebtors(enriched)
      }
    } catch (err) {
      console.error('[v0] Error loading debtors:', err)
    }
  }

  const loadRecoveryLogs = async () => {
    if (!shop?.id) return
    try {
      const { data } = await supabase
        .from('recovery_logs')
        .select('*')
        .eq('shop_id', shop.id)
        .order('call_date', { ascending: false })
        .limit(50)
      if (data) setRecoveryLogs(data)
    } catch (err) {
      console.error('[v0] Error loading logs:', err)
    }
  }

  const scheduleRecoveryCall = async (customer) => {
    try {
      const callDate = new Date()
      callDate.setHours(10, 0, 0, 0)
      
      await supabase.from('recovery_logs').insert([{
        shop_id: shop.id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        amount: customer.balance,
        call_type: 'scheduled',
        status: 'scheduled',
        call_date: callDate.toISOString(),
        message: `Payment reminder for ₹${customer.balance}`
      }])

      alert(`Call scheduled for ${customer.name}`)
      loadRecoveryLogs()
    } catch (err) {
      console.error('[v0] Error:', err)
    }
  }

  const markAsResolved = async (logId) => {
    try {
      await supabase.from('recovery_logs').update({ status: 'resolved' }).eq('id', logId)
      loadRecoveryLogs()
    } catch (err) {
      console.error('[v0] Error:', err)
    }
  }

  const stats = {
    total: debtors.reduce((sum, d) => sum + (d.balance || 0), 0),
    overdue: debtors.filter(d => d.daysOverdue > 30).length,
    highPriority: debtors.filter(d => d.priority === 'high').length
  }

  const filteredDebtors = debtors.filter(d => {
    if (filter === 'overdue') return d.daysOverdue > 30
    if (filter === 'high') return d.priority === 'high'
    return true
  })

  return (
    <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📞 AI Debt Recovery System</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Total Outstanding</p>
            <p className="text-3xl font-bold text-red-600">₹{stats.total.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Overdue {'(>30 days)'}</p>
            <p className="text-3xl font-bold text-orange-600">{stats.overdue}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">High Priority</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.highPriority}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
            All Debtors
          </button>
          <button onClick={() => setFilter('overdue')} className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'overdue' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
            Overdue
          </button>
          <button onClick={() => setFilter('high')} className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'high' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
            High Priority
          </button>
        </div>

        {/* Debtors List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Balance</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Days Overdue</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Priority</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Phone</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebtors.map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">₹{(d.balance || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={d.daysOverdue > 30 ? 'text-red-600 font-bold' : 'text-gray-600'}>{d.daysOverdue} days</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${d.priority === 'high' ? 'bg-red-100 text-red-700' : d.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {d.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.phone || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => scheduleRecoveryCall(d)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-xs transition">
                        📞 Call
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recovery Activity */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Recent Recovery Activity</h2>
          <div className="space-y-2">
            {recoveryLogs.slice(0, 10).map(log => (
              <div key={log.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800">{log.customer_name}</h4>
                    <p className="text-sm text-gray-600">₹{log.amount} • {log.call_type}</p>
                    <p className="text-xs text-gray-500">{new Date(log.call_date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${log.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {log.status.toUpperCase()}
                    </span>
                    {log.status === 'scheduled' && (
                      <button onClick={() => markAsResolved(log.id)} className="block mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs transition">
                        ✓ Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
