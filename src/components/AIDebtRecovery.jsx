import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AIDebtRecovery({ shop }) {
  const [debtors, setDebtors] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDebtor, setSelectedDebtor] = useState(null)
  const [callConfig, setCallConfig] = useState({
    minDebt: 1000,
    maxDaysOverdue: 90,
    autoSchedule: true,
    recurringDay: 15
  })
  const [recoveryLog, setRecoveryLog] = useState([])

  useEffect(() => {
    loadDebtors()
    loadRecoveryLog()
  }, [shop])

  const loadDebtors = async () => {
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shop.id)
      .gt('balance', callConfig.minDebt)
      .order('balance', { ascending: false })

    if (customers) {
      const enriched = customers.map(c => {
        const lastTransaction = c.last_transaction_date
          ? new Date(c.last_transaction_date)
          : new Date()
        
        const daysOverdue = Math.floor(
          (Date.now() - lastTransaction.getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          ...c,
          daysOverdue,
          isOverdue: daysOverdue > callConfig.maxDaysOverdue,
          priority: c.balance > 10000 ? 'high' : c.balance > 5000 ? 'medium' : 'low'
        }
      })

      setDebtors(enriched)
    }
  }

  const loadRecoveryLog = async () => {
    const { data } = await supabase
      .from('recovery_logs')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setRecoveryLog(data)
    }
  }

  const initiateCall = async (debtor) => {
    try {
      setLoading(true)
      
      // Log the call initiation
      const message = `🤖 Auto-call initiated to ${debtor.name} (${debtor.phone})\nOutstanding: ₹${debtor.balance}`
      
      const { error } = await supabase
        .from('recovery_logs')
        .insert({
          shop_id: shop.id,
          customer_id: debtor.id,
          customer_name: debtor.name,
          amount: debtor.balance,
          call_type: 'ai_initiated',
          status: 'initiated',
          message,
          call_date: new Date().toISOString()
        })

      if (!error) {
        alert(`✅ Call queued for ${debtor.name}\n\n${message}`)
        setSelectedDebtor(debtor)
        loadRecoveryLog()
      }
    } catch (err) {
      console.error('[v0] Error initiating call:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendPaymentReminder = async (debtor) => {
    try {
      const message = `Hello ${debtor.name},\n\nThis is a friendly reminder that you have an outstanding balance of ₹${debtor.balance} with ${shop.name}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you!`
      
      alert(`📱 SMS ready:\n\n${message}\n\nTo: ${debtor.phone}`)
    } catch (err) {
      console.error('[v0] Error sending reminder:', err)
    }
  }

  const scheduleRecoveryCall = async (debtor) => {
    try {
      const scheduleDate = new Date()
      scheduleDate.setDate(scheduleDate.getDate() + 1)

      const { error } = await supabase
        .from('recovery_logs')
        .insert({
          shop_id: shop.id,
          customer_id: debtor.id,
          customer_name: debtor.name,
          amount: debtor.balance,
          call_type: 'scheduled',
          status: 'scheduled',
          message: `Scheduled for ${scheduleDate.toLocaleDateString()}`,
          call_date: scheduleDate.toISOString()
        })

      if (!error) {
        alert(`✅ Call scheduled for tomorrow at 10 AM`)
        loadRecoveryLog()
      }
    } catch (err) {
      console.error('[v0] Error scheduling call:', err)
    }
  }

  const markAsPaid = async (debtor) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ balance: 0 })
        .eq('id', debtor.id)

      if (!error) {
        await supabase
          .from('recovery_logs')
          .insert({
            shop_id: shop.id,
            customer_id: debtor.id,
            customer_name: debtor.name,
            amount: debtor.balance,
            call_type: 'payment_received',
            status: 'resolved',
            message: `Payment received - ₹${debtor.balance}`,
            call_date: new Date().toISOString()
          })

        alert(`✅ ${debtor.name}'s debt cleared!`)
        loadDebtors()
        loadRecoveryLog()
      }
    } catch (err) {
      console.error('[v0] Error marking as paid:', err)
    }
  }

  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0)
  const overdueCount = debtors.filter(d => d.isOverdue).length
  const highPriority = debtors.filter(d => d.priority === 'high').length

  return (
    <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Debt Recovery</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
          <p className="text-sm text-gray-600 font-medium">Total Outstanding</p>
          <p className="text-3xl font-bold text-red-600">₹{totalDebt.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
          <p className="text-sm text-gray-600 font-medium">Overdue (>30 days)</p>
          <p className="text-3xl font-bold text-orange-600">{overdueCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-pink-200 shadow-sm">
          <p className="text-sm text-gray-600 font-medium">High Priority</p>
          <p className="text-3xl font-bold text-pink-600">₹{debtors.filter(d => d.priority === 'high').reduce((s, d) => s + d.balance, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
          <p className="text-sm text-gray-600 font-medium">Total Debtors</p>
          <p className="text-3xl font-bold text-blue-600">{debtors.length}</p>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-100 border-b-2 border-red-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">Days Overdue</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">Action</th>
              </tr>
            </thead>
            <tbody>
              {debtors.slice(0, 10).map((debtor) => (
                <tr
                  key={debtor.id}
                  className={`border-b hover:bg-gray-50 ${
                    debtor.isOverdue ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {debtor.name}
                    {debtor.phone && <p className="text-xs text-gray-600">{debtor.phone}</p>}
                  </td>
                  <td className="px-4 py-3 font-bold text-red-600">₹{debtor.balance.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      debtor.daysOverdue > 60 ? 'bg-red-200 text-red-800' :
                      debtor.daysOverdue > 30 ? 'bg-orange-200 text-orange-800' :
                      'bg-yellow-200 text-yellow-800'
                    }`}>
                      {debtor.daysOverdue} days
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      debtor.priority === 'high' ? 'bg-red-300 text-red-900' :
                      debtor.priority === 'medium' ? 'bg-orange-300 text-orange-900' :
                      'bg-yellow-300 text-yellow-900'
                    }`}>
                      {debtor.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => initiateCall(debtor)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 mr-2"
                    >
                      Call
                    </button>
                    <button
                      onClick={() => markAsPaid(debtor)}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Paid
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recovery Log */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Recent Recovery Activity</h3>
        <div className="space-y-3">
          {recoveryLog.map((log) => (
            <div key={log.id} className="border-l-4 border-blue-400 pl-4 py-2">
              <p className="font-semibold text-gray-800">{log.customer_name}</p>
              <p className="text-sm text-gray-600">₹{log.amount} | {log.call_type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-500">
                {new Date(log.call_date).toLocaleDateString()} {new Date(log.call_date).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
