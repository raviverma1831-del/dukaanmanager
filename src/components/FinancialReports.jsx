import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function FinancialReports({ shop }) {
  const [reportType, setReportType] = useState('pl')
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => {
    loadReport()
  }, [shop.id, reportType, startDate, endDate])

  const loadReport = async () => {
    setLoading(true)
    try {
      if (reportType === 'pl') {
        await loadPLReport()
      } else if (reportType === 'bs') {
        await loadBalanceSheet()
      } else if (reportType === 'tb') {
        await loadTrialBalance()
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const loadPLReport = async () => {
    // Revenue: All invoices in date range
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('shop_id', shop.id)
      .gte('bill_date', startDate)
      .lte('bill_date', endDate)

    // COGS: All purchases in date range
    const { data: purchases } = await supabase
      .from('purchases')
      .select('total')
      .eq('shop_id', shop.id)
      .gte('purchase_date', startDate)
      .lte('purchase_date', endDate)

    // Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('shop_id', shop.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    const revenue = invoices?.reduce((s, i) => s + (i.total || 0), 0) || 0
    const cogs = purchases?.reduce((s, p) => s + (p.total || 0), 0) || 0
    const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0

    const grossProfit = revenue - cogs
    const operatingProfit = grossProfit - totalExpenses
    const taxRate = shop.gst_type === 'registered' ? 0.18 : 0 // Simplified for demo
    const tax = operatingProfit * taxRate
    const netProfit = operatingProfit - tax

    setData({
      revenue,
      cogs,
      grossProfit,
      totalExpenses,
      operatingProfit,
      tax,
      netProfit,
    })
  }

  const loadBalanceSheet = async () => {
    // Current Assets
    const { data: products } = await supabase
      .from('products')
      .select('stock, wholesale_price')
      .eq('shop_id', shop.id)

    const stockValue = products?.reduce((s, p) => s + (p.stock * (p.wholesale_price || 0)), 0) || 0

    // Receivables (Customer khata)
    const { data: customers } = await supabase
      .from('customers')
      .select('balance')
      .eq('shop_id', shop.id)

    const receivables = customers?.reduce((s, c) => s + (c.balance || 0), 0) || 0

    // Current Liabilities (Payables to suppliers - estimated from purchases)
    const { data: unpaidPurchases } = await supabase
      .from('purchases')
      .select('total')
      .eq('shop_id', shop.id)
      .eq('status', 'pending')

    const payables = unpaidPurchases?.reduce((s, p) => s + (p.total || 0), 0) || 0

    // Capital + Net Profit (from P&L)
    const plData = await loadPLReportData()

    setData({
      assets: {
        currentAssets: {
          stock: stockValue,
          cash: 0, // Would need transaction data
          receivables: receivables,
        },
        totalCurrentAssets: stockValue + receivables,
      },
      liabilities: {
        currentLiabilities: {
          payables: payables,
        },
        totalCurrentLiabilities: payables,
      },
      equity: {
        capital: 100000, // Placeholder - would need shop opening balance
        netProfit: plData.netProfit,
        totalEquity: 100000 + plData.netProfit,
      },
    })
  }

  const loadPLReportData = async () => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('shop_id', shop.id)
      .gte('bill_date', startDate)
      .lte('bill_date', endDate)

    const { data: purchases } = await supabase
      .from('purchases')
      .select('total')
      .eq('shop_id', shop.id)
      .gte('purchase_date', startDate)
      .lte('purchase_date', endDate)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('shop_id', shop.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    const revenue = invoices?.reduce((s, i) => s + (i.total || 0), 0) || 0
    const cogs = purchases?.reduce((s, p) => s + (p.total || 0), 0) || 0
    const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
    const netProfit = revenue - cogs - totalExpenses

    return { netProfit }
  }

  const loadTrialBalance = async () => {
    // All accounts with debit/credit
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('shop_id', shop.id)
      .gte('bill_date', startDate)
      .lte('bill_date', endDate)

    const { data: purchases } = await supabase
      .from('purchases')
      .select('total')
      .eq('shop_id', shop.id)
      .gte('purchase_date', startDate)
      .lte('purchase_date', endDate)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('shop_id', shop.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    const revenue = invoices?.reduce((s, i) => s + (i.total || 0), 0) || 0
    const cogs = purchases?.reduce((s, p) => s + (p.total || 0), 0) || 0
    const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0

    const accounts = [
      { name: 'Sales Revenue', debit: 0, credit: revenue },
      { name: 'COGS (Purchases)', debit: cogs, credit: 0 },
      { name: 'Operating Expenses', debit: totalExpenses, credit: 0 },
    ]

    const totalDebit = accounts.reduce((s, a) => s + a.debit, 0)
    const totalCredit = accounts.reduce((s, a) => s + a.credit, 0)

    setData({
      accounts,
      totalDebit,
      totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    })
  }

  const inp = { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: "'DM Sans',sans-serif", background: '#fafffe', width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 22, color: C.gD, marginBottom: 16 }}>📊 Financial Reports</div>

      {/* Report Type Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'pl', label: '📈 P&L', emoji: '📈' },
          { id: 'bs', label: '⚖️ Balance Sheet', emoji: '⚖️' },
          { id: 'tb', label: '📋 Trial Balance', emoji: '📋' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id)}
            style={{
              background: reportType === t.id ? C.g : '#fff',
              color: reportType === t.id ? '#fff' : C.text,
              border: `1.5px solid ${reportType === t.id ? C.g : C.border}`,
              borderRadius: 10,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: C.text }}>From Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 4, color: C.text }}>To Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button onClick={loadReport} disabled={loading} style={{ background: loading ? C.muted : C.g, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Reports Content */}
      {data && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          {reportType === 'pl' && (
            <div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, color: C.gD, marginBottom: 20, textAlign: 'center' }}>📈 Profit & Loss Report</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 20 }}>
                {startDate} to {endDate}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { label: 'Revenue (Sales)', value: data.revenue, color: C.g, type: 'income' },
                  { label: '- Cost of Goods Sold', value: data.cogs, color: '#666', type: 'expense' },
                  { label: '= Gross Profit', value: data.grossProfit, color: C.blue, type: 'subtotal', bold: true },
                  { label: '- Operating Expenses', value: data.totalExpenses, color: '#666', type: 'expense' },
                  { label: '= Operating Profit', value: data.operatingProfit, color: C.blue, type: 'subtotal', bold: true },
                  { label: '- Taxes', value: data.tax, color: '#666', type: 'expense' },
                  { label: '= NET PROFIT/LOSS', value: data.netProfit, color: data.netProfit >= 0 ? C.g : C.red, type: 'total', bold: true },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: row.type === 'total' ? '#f0fdf4' : row.type === 'subtotal' ? '#f0f9ff' : 'transparent',
                      borderBottom: row.type === 'total' ? 'none' : '1px solid #e5e7eb',
                      fontWeight: row.bold ? 800 : 700,
                      fontSize: row.bold ? 15 : 13,
                      borderTop: row.type === 'total' ? `2px solid ${C.border}` : 'none',
                    }}
                  >
                    <span style={{ color: C.text }}>{row.label}</span>
                    <span style={{ color: row.color, fontFamily: "'Baloo 2',cursive" }}>₹{row.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 20 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>Gross Margin</div>
                  <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 20, color: C.g }}>
                    {data.revenue > 0 ? ((data.grossProfit / data.revenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 16, border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: 12, color: '#0c4a6e', fontWeight: 700 }}>Net Margin</div>
                  <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 900, fontSize: 20, color: C.blue }}>
                    {data.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'bs' && (
            <div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, color: C.gD, marginBottom: 20, textAlign: 'center' }}>⚖️ Balance Sheet</div>

              {/* Assets */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.g, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${C.g}` }}>🏦 ASSETS</div>
                <div style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontWeight: 700, color: C.text }}>Current Assets:</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: C.gXL, borderRadius: 8 }}>
                    <span>Stock Value</span>
                    <span style={{ fontWeight: 800, color: C.g }}>₹{data.assets.currentAssets.stock.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: C.gXL, borderRadius: 8 }}>
                    <span>Receivables</span>
                    <span style={{ fontWeight: 800, color: C.g }}>₹{data.assets.currentAssets.receivables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 800, fontSize: 14, borderTop: `1px solid ${C.border}` }}>
                    <span>Total Assets</span>
                    <span style={{ color: C.g }}>₹{data.assets.totalCurrentAssets.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.red, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${C.red}` }}>💳 LIABILITIES</div>
                <div style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                    <span>Payables to Suppliers</span>
                    <span style={{ fontWeight: 800, color: C.red }}>₹{data.liabilities.currentLiabilities.payables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 800, fontSize: 14, borderTop: `1px solid ${C.border}` }}>
                    <span>Total Liabilities</span>
                    <span style={{ color: C.red }}>₹{data.liabilities.totalCurrentLiabilities.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.blue, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${C.blue}` }}>🏛️ EQUITY</div>
                <div style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0f9ff', borderRadius: 8 }}>
                    <span>Capital</span>
                    <span style={{ fontWeight: 800, color: C.blue }}>₹{data.equity.capital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0f9ff', borderRadius: 8 }}>
                    <span>Retained Earnings</span>
                    <span style={{ fontWeight: 800, color: C.blue }}>₹{data.equity.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 800, fontSize: 14, borderTop: `1px solid ${C.border}` }}>
                    <span>Total Equity</span>
                    <span style={{ color: C.blue }}>₹{data.equity.totalEquity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, padding: 12, background: '#f0fdf4', borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.g }}>
                ✓ Verification: Assets = Liabilities + Equity
                {(data.assets.totalCurrentAssets).toFixed(0) === (data.liabilities.totalCurrentLiabilities + data.equity.totalEquity).toFixed(0) ? ' ✅' : ' ⚠️'}
              </div>
            </div>
          )}

          {reportType === 'tb' && (
            <div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, color: C.gD, marginBottom: 20, textAlign: 'center' }}>📋 Trial Balance</div>

              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f0fdf4' }}>
                      {['Account Name', 'Debit (₹)', 'Credit (₹)'].map(h => (
                        <th key={h} style={{ padding: '12px', textAlign: 'left', fontWeight: 800, color: C.gD, fontSize: 12, borderBottom: `2px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts?.map((acc, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fafffe' : '#fff' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{acc.name}</td>
                        <td style={{ padding: '12px', fontFamily: "'Baloo 2',cursive", fontWeight: 700, color: C.g }}>
                          {acc.debit > 0 ? '₹' + acc.debit.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                        </td>
                        <td style={{ padding: '12px', fontFamily: "'Baloo 2',cursive", fontWeight: 700, color: C.g }}>
                          {acc.credit > 0 ? '₹' + acc.credit.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f0fdf4', fontWeight: 800, fontSize: 14 }}>
                      <td style={{ padding: '12px' }}>TOTALS</td>
                      <td style={{ padding: '12px', color: C.g }}>₹{data.totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: '12px', color: C.g }}>₹{data.totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ padding: 12, background: data.balanced ? '#f0fdf4' : '#fef2f2', borderRadius: 10, fontSize: 13, fontWeight: 700, color: data.balanced ? C.g : C.red }}>
                {data.balanced ? '✅ Trial Balance is BALANCED' : '⚠️ Trial Balance is NOT balanced'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
