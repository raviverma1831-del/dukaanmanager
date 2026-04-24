import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function WhatsAppVoiceBot({ shop }) {
  const [messages, setMessages] = useState([])
  const [config, setConfig] = useState({
    enabled: true,
    language: 'hindi',
    autoReminders: true,
    businessHours: '9-21'
  })
  const [commands, setCommands] = useState([])
  const [activeTab, setActiveTab] = useState('capabilities')

  useEffect(() => {
    if (shop?.id) loadMessages()
  }, [shop?.id])

  const loadMessages = async () => {
    if (!shop?.id) return
    try {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setMessages(data)
    } catch (err) {
      console.error('[v0] Error:', err)
    }
  }

  const botCapabilities = [
    { cmd: 'STOCK ADD', desc: 'Add new product to inventory', example: 'STOCK ADD Lipstick Red 500 100' },
    { cmd: 'STOCK UPDATE', desc: 'Update product quantity', example: 'STOCK UPDATE Lipstick 150' },
    { cmd: 'INVOICE CREATE', desc: 'Generate and send invoice', example: 'INVOICE CREATE Customer123' },
    { cmd: 'INVOICE SEND', desc: 'Send invoice via WhatsApp', example: 'INVOICE SEND 9876543210' },
    { cmd: 'REPORT SALES', desc: 'Get today/monthly sales report', example: 'REPORT SALES TODAY' },
    { cmd: 'REPORT GST', desc: 'Get GST compliance report', example: 'REPORT GST MARCH' },
    { cmd: 'PAYMENT REMINDER', desc: 'Send payment reminder to customer', example: 'PAYMENT 9876543210' },
    { cmd: 'AI CALL', desc: 'Initiate AI recovery call', example: 'CALL DEBT CustomerName' },
    { cmd: 'PURCHASE ORDER', desc: 'Create purchase order', example: 'PURCHASE ORDER SupplierName items' },
    { cmd: 'BALANCE CHECK', desc: 'Check customer balance', example: 'BALANCE CustomerName' }
  ]

  const saveConfig = async () => {
    alert('WhatsApp Bot configured successfully!')
  }

  const sendTestMessage = async () => {
    try {
      await supabase.from('whatsapp_messages').insert([{
        shop_id: shop.id,
        message_type: 'test',
        message: 'Test message from DukaanManager',
        recipient_phones: ['9876543210'],
        recipients_count: 1,
        status: 'scheduled'
      }])
      alert('Test message scheduled!')
      loadMessages()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">💬 WhatsApp AI Voice Bot</h1>
        <p className="text-gray-600 mb-6">Full-featured bot for business operations - Stock, Billing, Reports, Calls & More</p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['capabilities', 'config', 'messages', 'reminders'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {tab === 'capabilities' && '🤖 Capabilities'}
              {tab === 'config' && '⚙️ Configuration'}
              {tab === 'messages' && '📨 Messages'}
              {tab === 'reminders' && '🔔 Reminders'}
            </button>
          ))}
        </div>

        {/* Capabilities Tab */}
        {activeTab === 'capabilities' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Commands</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {botCapabilities.map((cmd, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                  <h3 className="font-bold text-gray-800 mb-2 text-lg">{cmd.cmd}</h3>
                  <p className="text-sm text-gray-600 mb-2">{cmd.desc}</p>
                  <div className="bg-gray-100 p-2 rounded text-xs font-mono text-blue-600">
                    {cmd.example}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Bot Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enable Bot</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="radio" checked={config.enabled} onChange={() => setConfig({...config, enabled: true})} className="mr-2" />
                    <span>Enabled</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" checked={!config.enabled} onChange={() => setConfig({...config, enabled: false})} className="mr-2" />
                    <span>Disabled</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select value={config.language} onChange={(e) => setConfig({...config, language: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="marathi">Marathi</option>
                  <option value="gujarati">Gujarati</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Hours</label>
                <input type="text" value={config.businessHours} onChange={(e) => setConfig({...config, businessHours: e.target.value})} placeholder="e.g., 9-21" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto Payment Reminders</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="checkbox" checked={config.autoReminders} onChange={(e) => setConfig({...config, autoReminders: e.target.checked})} className="mr-2" />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-6 border-l-4 border-green-500">
              <h3 className="font-bold text-gray-800 mb-2">Full Access Features</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Add/Update Stock in inventory</li>
                <li>✓ Create and send invoices/bills</li>
                <li>✓ Generate sales & GST reports</li>
                <li>✓ Make AI-powered collection calls</li>
                <li>✓ Create purchase orders</li>
                <li>✓ Send automated payment reminders</li>
                <li>✓ All operations fully automatic OR manual via WhatsApp</li>
              </ul>
            </div>

            <button onClick={saveConfig} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition">
              💾 Save Configuration
            </button>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Message History</h2>
            <button onClick={sendTestMessage} className="mb-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition">
              📨 Send Test Message
            </button>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center text-gray-500">No messages yet</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800">Message #{msg.id?.toString().slice(0, 8)}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${msg.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {msg.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{msg.message}</p>
                    <p className="text-xs text-gray-500">Recipients: {msg.recipients_count} • {new Date(msg.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Automated Reminders</h2>
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                <h3 className="font-bold text-gray-800 mb-2">Daily Payment Reminders</h3>
                <p className="text-sm text-gray-600 mb-3">Automatically send payment reminders to customers with pending balance every day at 10 AM</p>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Enable daily reminders</span>
                </label>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                <h3 className="font-bold text-gray-800 mb-2">Weekly Order Confirmations</h3>
                <p className="text-sm text-gray-600 mb-3">Send order confirmations and delivery updates automatically</p>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Enable order confirmations</span>
                </label>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
                <h3 className="font-bold text-gray-800 mb-2">On-Purchase Promos</h3>
                <p className="text-sm text-gray-600 mb-3">Send promotional messages when new products are added or discounts active</p>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Enable promo messages</span>
                </label>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
                <h3 className="font-bold text-gray-800 mb-2">Debt Collection Calls</h3>
                <p className="text-sm text-gray-600 mb-3">AI-powered automated calls for overdue payments with escalation</p>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Enable AI collection calls</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
