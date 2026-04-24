import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function WhatsAppVoiceBot({ shop }) {
  const [voiceConfig, setVoiceConfig] = useState({
    enabled: false,
    language: 'hi',
    autoReminders: true,
    reminderDays: [1, 7, 14],
    voiceGreeting: true,
    businessHours: { start: 9, end: 21 }
  })
  const [messages, setMessages] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadBotData()
  }, [shop])

  const loadBotData = async () => {
    try {
      // Load sent messages
      const { data: msgs } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (msgs) {
        setMessages(msgs)
      }

      // Load scheduled reminders
      const { data: rems } = await supabase
        .from('voice_reminders')
        .select('*')
        .eq('shop_id', shop.id)
        .order('scheduled_for', { ascending: false })

      if (rems) {
        setReminders(rems)
      }
    } catch (err) {
      console.error('[v0] Error loading bot data:', err)
    }
  }

  const enableVoiceBot = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('shop_settings')
        .upsert({
          shop_id: shop.id,
          voice_bot_enabled: true,
          voice_bot_config: voiceConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'shop_id' })

      if (!error) {
        alert('✅ WhatsApp Voice Bot enabled!')
        setVoiceConfig({ ...voiceConfig, enabled: true })
      }
    } catch (err) {
      console.error('[v0] Error enabling bot:', err)
    } finally {
      setLoading(false)
    }
  }

  const scheduleReminder = async (type, frequency) => {
    try {
      setLoading(true)

      // Get customers who need reminders
      const { data: customers } = await supabase
        .from('customers')
        .select('id,name,phone')
        .eq('shop_id', shop.id)
        .not('phone', 'is', null)

      if (!customers || customers.length === 0) {
        alert('No customers with phone numbers')
        return
      }

      // Create reminders
      const reminderData = customers.map(c => ({
        shop_id: shop.id,
        customer_id: c.id,
        customer_name: c.name,
        customer_phone: c.phone,
        reminder_type: type,
        frequency,
        scheduled_for: new Date().toISOString(),
        status: 'scheduled',
        message: generateReminderMessage(type, c.name, shop.name)
      }))

      const { error } = await supabase
        .from('voice_reminders')
        .insert(reminderData)

      if (!error) {
        alert(`✅ ${type} reminders scheduled for ${customers.length} customers`)
        loadBotData()
      }
    } catch (err) {
      console.error('[v0] Error scheduling reminder:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateReminderMessage = (type, customerName, shopName) => {
    const messages = {
      payment_due: `नमस्ते ${customerName}, यह ${shopName} से एक स्वचालित संदेश है। आपके खाते में राशि बकाया है। कृपया शीघ्र भुगतान करें। धन्यवाद!`,
      stock_arrival: `नमस्ते ${customerName}, आपके द्वारा मंगाए गए स्टॉक ${shopName} में आ गए हैं। कृपया जल्द आकर collect करें।`,
      promotional: `नमस्ते ${customerName}, ${shopName} में विशेष छूट चल रही है। अभी ऑर्डर करें और 20% बचाएं!`,
      feedback: `नमस्ते ${customerName}, ${shopName} में आपका अनुभव कैसा था? कृपया हमें अपनी प्रतिक्रिया दें।`,
      order_confirmation: `धन्यवाद ${customerName}, आपका ऑर्डर ${shopName} ने स्वीकार कर लिया है। जल्द डिलीवरी के लिए हमसे संपर्क करें।`
    }
    return messages[type] || messages.promotional
  }

  const sendInstantMessage = async (message) => {
    try {
      setLoading(true)
      const { data: customers } = await supabase
        .from('customers')
        .select('phone')
        .eq('shop_id', shop.id)
        .not('phone', 'is', null)

      if (customers && customers.length > 0) {
        const { error } = await supabase
          .from('whatsapp_messages')
          .insert({
            shop_id: shop.id,
            message,
            recipients: customers.length,
            status: 'sent',
            sent_at: new Date().toISOString()
          })

        if (!error) {
          alert(`✅ Message sent to ${customers.length} customers`)
          loadBotData()
        }
      }
    } catch (err) {
      console.error('[v0] Error sending message:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">WhatsApp Voice Bot</h2>

      {/* Configuration */}
      <div className="bg-white p-4 rounded-lg border-2 border-green-200 mb-6">
        <h3 className="font-bold mb-4 text-gray-800">Voice Bot Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={voiceConfig.language}
              onChange={(e) => setVoiceConfig({...voiceConfig, language: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="hi">Hindi (हिंदी)</option>
              <option value="en">English</option>
              <option value="gu">Gujarati (ગુજરાતી)</option>
              <option value="mr">Marathi (मराठी)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Hours</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="23"
                value={voiceConfig.businessHours.start}
                onChange={(e) => setVoiceConfig({...voiceConfig, businessHours: {...voiceConfig.businessHours, start: parseInt(e.target.value)}})}
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg"
                placeholder="Start"
              />
              <span className="py-2 text-gray-600">to</span>
              <input
                type="number"
                min="0"
                max="23"
                value={voiceConfig.businessHours.end}
                onChange={(e) => setVoiceConfig({...voiceConfig, businessHours: {...voiceConfig.businessHours, end: parseInt(e.target.value)}})}
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg"
                placeholder="End"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={voiceConfig.autoReminders}
              onChange={(e) => setVoiceConfig({...voiceConfig, autoReminders: e.target.checked})}
              className="w-4 h-4 text-green-600"
            />
            <span className="ml-2 text-gray-700">Auto Reminders</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={voiceConfig.voiceGreeting}
              onChange={(e) => setVoiceConfig({...voiceConfig, voiceGreeting: e.target.checked})}
              className="w-4 h-4 text-green-600"
            />
            <span className="ml-2 text-gray-700">Voice Greeting</span>
          </label>
        </div>

        <button
          onClick={enableVoiceBot}
          disabled={loading}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-bold"
        >
          {voiceConfig.enabled ? '✓ Voice Bot Active' : 'Enable Voice Bot'}
        </button>
      </div>

      {/* Reminder Scheduler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-green-200">
          <h4 className="font-bold mb-3 text-gray-800">Payment Reminders</h4>
          <p className="text-sm text-gray-600 mb-3">Auto-send payment reminders to customers with pending balance</p>
          <div className="space-y-2">
            <button
              onClick={() => scheduleReminder('payment_due', 'daily')}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Daily Reminders
            </button>
            <button
              onClick={() => scheduleReminder('payment_due', 'weekly')}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Weekly Reminders
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-green-200">
          <h4 className="font-bold mb-3 text-gray-800">Order Confirmations</h4>
          <p className="text-sm text-gray-600 mb-3">Send automatic confirmation when orders are received</p>
          <div className="space-y-2">
            <button
              onClick={() => scheduleReminder('order_confirmation', 'on_purchase')}
              disabled={loading}
              className="w-full px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:opacity-50"
            >
              On Purchase
            </button>
            <button
              onClick={() => scheduleReminder('promotional', 'weekly')}
              disabled={loading}
              className="w-full px-3 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Weekly Promos
            </button>
          </div>
        </div>
      </div>

      {/* Sent Messages */}
      <div className="bg-white rounded-lg p-4 border border-green-200 mb-6">
        <h3 className="font-bold mb-4 text-gray-800">Recent Messages</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="border-l-4 border-green-400 pl-3 py-2">
                <p className="text-sm font-semibold text-gray-800">{msg.message.slice(0, 50)}...</p>
                <p className="text-xs text-gray-600">
                  {msg.recipients} recipients | {new Date(msg.sent_at).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center py-4">No messages sent yet</p>
          )}
        </div>
      </div>

      {/* Scheduled Reminders */}
      <div className="bg-white rounded-lg p-4 border border-green-200">
        <h3 className="font-bold mb-4 text-gray-800">Scheduled Reminders</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {reminders.length > 0 ? (
            reminders.slice(0, 10).map((rem) => (
              <div key={rem.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{rem.reminder_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-600">{rem.customer_name}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded font-semibold ${
                  rem.status === 'sent' ? 'bg-green-200 text-green-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {rem.status.toUpperCase()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center py-4">No reminders scheduled</p>
          )}
        </div>
      </div>
    </div>
  )
}
