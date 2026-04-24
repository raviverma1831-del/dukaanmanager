import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Reports({ shop }) {
  const [tab, setTab] = useState('sales')
  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    if (shop?.id && tab === 'pl') generatePL()
    if (shop?.id && tab === 'balance') generateBalance()
    if (shop?.id && tab === 'trial') generateTrial()
  }, [tab, shop?.id])

  const generatePL = async () => {
    setLoading(true)
    try {
      const { data: invoices } = await supabase.from('invoices').select('total_amount').eq('shop_id', shop.id)
      const { data: purchases } = await supabase.from('purchases').select('total_amount').eq('shop_id', shop.id)
      const { data: expenses } = await supabase.from('expenses').select('amount').eq('shop_id', shop.id)

      const revenue = (invoices || []).reduce((sum, i) => sum + (i.total_amount || 0), 0)
      const cogs = (purchases || []).reduce((sum, p) => sum + (p.total_amount || 0), 0)
      const expenseTotal = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0)
      const profit = revenue - cogs - expenseTotal

      setReports({
        revenue,
        cogs,
        expenseTotal,
        profit,
        margin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0
      })
    } catch (err) {
      console.error('[v0] Error:', err)
    }
    setLoading(false)
  }

  const generateBalance = async () => {
    setLoading(true)
    try {
      const { data: products } = await supabase.from('products').select('quantity,price').eq('shop_id', shop.id)
      const { data: customers } = await supabase.from('customers').select('balance').eq('shop_id', shop.id)
      const { data: suppliers } = await supabase.from('suppliers').select('balance').eq('shop_id', shop.id)

      const inventory = (products || []).reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0)
      const receivables = (customers || []).reduce((sum, c) => sum + (c.balance || 0), 0)
      const payables = (suppliers || []).reduce((sum, s) => sum + (s.balance || 0), 0)

      setReports({
        assets: { inventory, receivables, cash: 0, total: inventory + receivables },
        liabilities: { payables },
        equity: { total: (inventory + receivables) - payables }
      })
    } catch (err) {
      console.error('[v0] Error:', err)
    }
    setLoading(false)
  }

  const generateTrial = async () => {
    setLoading(true)
    try {
      const { data: invoices } = await supabase.from('invoices').select('total_amount').eq('shop_id', shop.id)
      const { data: purchases } = await supabase.from('purchases').select('total_amount').eq('shop_id', shop.id)
      const { data: expenses } = await supabase.from('expenses').select('amount').eq('shop_id', shop.id)
      const { data: txn } = await supabase.from('transactions').select('amount,type').eq('shop_id', shop.id)

      const credits = (invoices || []).reduce((sum, i) => sum + (i.total_amount || 0), 0)
      const debits = ((purchases || []).reduce((sum, p) => sum + (p.total_amount || 0), 0)) + 
                     ((expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0))

      setReports({
        accounts: [
          { name: 'Sales Revenue', debit: 0, credit: credits },
          { name: 'Purchase Expense', debit: (purchases || []).reduce((sum, p) => sum + (p.total_amount || 0), 0), credit: 0 },
          { name: 'Operating Expenses', debit: (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0), credit: 0 },
        ],
        totalDebit: debits,
        totalCredit: credits
      })
    } catch (err) {
      console.error('[v0] Error:', err)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📊 Financial Reports</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            ['sales', '💰 Sales Report'],
            ['gst', '📋 GST Report'],
            ['pl', '📈 P&L'],
            ['balance', '⚖️ Balance Sheet'],
            ['trial', '✓ Trial Balance']
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                tab === v ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* P&L Statement */}
        {tab === 'pl' && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Profit & Loss Statement</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-800">Revenue</span>
                  <span className="font-bold text-green-600">₹{reports.revenue?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-800">Cost of Goods Sold</span>
                  <span className="font-bold text-red-600">₹{reports.cogs?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-800">Gross Profit</span>
                  <span className="font-bold text-blue-600">₹{((reports.revenue || 0) - (reports.cogs || 0)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-800">Operating Expenses</span>
                  <span className="font-bold text-red-600">₹{reports.expenseTotal?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between bg-green-100 p-3 rounded-lg">
                  <span className="font-bold text-gray-800">NET PROFIT</span>
                  <span className={`font-bold text-lg ${reports.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{reports.profit?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Profit Margin</span>
                  <span className="font-bold text-blue-600">{reports.margin}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Balance Sheet */}
        {tab === 'balance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Assets</h3>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">Inventory</span>
                    <span className="font-bold">₹{reports.assets?.inventory?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">Customer Receivables</span>
                    <span className="font-bold">₹{reports.assets?.receivables?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between bg-blue-100 p-3 rounded-lg font-bold">
                    <span>Total Assets</span>
                    <span>₹{reports.assets?.total?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Liabilities & Equity</h3>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">Supplier Payables</span>
                    <span className="font-bold">₹{reports.liabilities?.payables?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between bg-green-100 p-3 rounded-lg font-bold">
                    <span>Owner&apos;s Equity</span>
                    <span>₹{reports.equity?.total?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trial Balance */}
        {tab === 'trial' && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Trial Balance</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-bold">Account</th>
                      <th className="px-4 py-2 text-right font-bold">Debit</th>
                      <th className="px-4 py-2 text-right font-bold">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reports.accounts || []).map((acc, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-800">{acc.name}</td>
                        <td className="px-4 py-2 text-right font-bold">₹{acc.debit.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right font-bold">₹{acc.credit.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-100 font-bold">
                      <td className="px-4 py-2 text-gray-800">TOTAL</td>
                      <td className="px-4 py-2 text-right">₹{reports.totalDebit?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-right">₹{reports.totalCredit?.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Default Sales/GST tabs remain accessible */}
        {(tab === 'sales' || tab === 'gst') && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{tab === 'sales' ? 'Sales Report' : 'GST Report'}</h2>
            <p className="text-gray-600">Additional reports coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}

