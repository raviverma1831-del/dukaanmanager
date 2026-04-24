import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function B2BNetwork({ shop }) {
  const [requests, setRequests] = useState([])
  const [partnerShops, setPartnerShops] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ toShopId: '', items: '', amount: 0 })

  useEffect(() => {
    if (shop?.id) {
      loadRequests()
      loadPartnerShops()
    }
  }, [shop?.id])

  const loadRequests = async () => {
    if (!shop?.id) return
    try {
      const { data } = await supabase
        .from('b2b_requests')
        .select('*')
        .or(`from_shop_id.eq.${shop.id},to_shop_id.eq.${shop.id}`)
        .order('request_date', { ascending: false })
      if (data) setRequests(data)
    } catch (err) {
      console.error('[v0] Error:', err)
    }
  }

  const loadPartnerShops = async () => {
    if (!shop?.id) return
    try {
      const { data } = await supabase.from('shops').select('*').limit(20)
      if (data) setPartnerShops(data.filter(s => s.id !== shop.id))
    } catch (err) {
      console.error('[v0] Error:', err)
    }
  }

  const createRequest = async () => {
    if (!formData.toShopId || !formData.items || formData.amount <= 0) {
      alert('Please fill all fields')
      return
    }

    try {
      await supabase.from('b2b_requests').insert([{
        from_shop_id: shop.id,
        to_shop_id: formData.toShopId,
        items: { description: formData.items },
        total_amount: formData.amount,
        status: 'pending'
      }])

      alert('Request sent!')
      setFormData({ toShopId: '', items: '', amount: 0 })
      setShowForm(false)
      loadRequests()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const updateStatus = async (reqId, status) => {
    try {
      await supabase.from('b2b_requests').update({ status }).eq('id', reqId)
      loadRequests()
    } catch (err) {
      console.error('[v0] Error:', err)
    }
  }

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    delivered: requests.filter(r => r.status === 'delivered').length
  }

  const filteredRequests = requests.filter(r => filter === 'all' ? true : r.status === filter)

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🤝 B2B Wholesale Network</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Requests</p>
            <p className="text-3xl font-bold text-blue-600">{requests.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Accepted</p>
            <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Delivered</p>
            <p className="text-3xl font-bold text-purple-600">{stats.delivered}</p>
          </div>
        </div>

        {/* New Request Button */}
        <button onClick={() => setShowForm(!showForm)} className="mb-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition">
          + New Request
        </button>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Create B2B Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Partner Shop</label>
                <select value={formData.toShopId} onChange={(e) => setFormData({...formData, toShopId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select Partner</option>
                  {partnerShops.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <input type="text" value={formData.items} onChange={(e) => setFormData({...formData, items: e.target.value})} placeholder="e.g., 10x Lipstick Red" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <button onClick={createRequest} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition">
              Send Request
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'accepted', 'delivered'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg font-medium transition ${filter === f ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-gray-500">No requests found</div>
          ) : (
            filteredRequests.map(req => (
              <div key={req.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-lg transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">Request #{req.id?.toString().slice(0, 8)}</h3>
                    <p className="text-sm text-gray-600 mb-1">Amount: <span className="font-bold text-blue-600">₹{req.total_amount}</span></p>
                    <p className="text-xs text-gray-500">{new Date(req.request_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold mb-2 ${
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      req.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => updateStatus(req.id, 'accepted')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs transition">
                          Accept
                        </button>
                        <button onClick={() => updateStatus(req.id, 'rejected')} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs transition">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
