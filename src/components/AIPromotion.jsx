import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AIPromotion({ shop }) {
  const [slowProducts, setSlowProducts] = useState([])
  const [activePromotions, setActivePromotions] = useState([])
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({ minDaysOld: 30, maxDiscount: 40, minQty: 5 })

  useEffect(() => {
    if (shop?.id) loadPromotions()
  }, [shop?.id])

  const loadPromotions = async () => {
    if (!shop?.id) return
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (data) setActivePromotions(data)
  }

  const generatePromotions = async () => {
    if (!shop?.id) return
    setLoading(true)
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
      
      if (products) {
        const now = new Date()
        const slow = products.filter(p => {
          const age = Math.floor((now - new Date(p.created_at)) / (1000 * 60 * 60 * 24))
          return age >= config.minDaysOld && (p.quantity || 0) >= config.minQty
        })
        setSlowProducts(slow)
      }
    } catch (err) {
      console.error('[v0] Error:', err)
    }
    setLoading(false)
  }

  const createPromotion = async (product) => {
    try {
      const discount = Math.min(config.maxDiscount, Math.floor(Math.random() * 20) + 10)
      const promoPrice = product.price * (1 - discount / 100)
      
      await supabase.from('promotions').insert([{
        shop_id: shop.id,
        product_id: product.id,
        discount_percent: discount,
        promo_price: promoPrice,
        message: `${discount}% off - Only this week!`,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString()
      }])
      
      loadPromotions()
      setSlowProducts(slowProducts.filter(p => p.id !== product.id))
    } catch (err) {
      console.error('[v0] Error:', err)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🔥 AI Promotion Engine</h1>

        {/* Config Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-orange-500">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Days Old</label>
              <input type="number" value={config.minDaysOld} onChange={(e) => setConfig({...config, minDaysOld: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount %</label>
              <input type="number" value={config.maxDiscount} onChange={(e) => setConfig({...config, maxDiscount: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Qty</label>
              <input type="number" value={config.minQty} onChange={(e) => setConfig({...config, minQty: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <button onClick={generatePromotions} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg transition disabled:opacity-50">
              {loading ? '⏳ Analyzing...' : '🔍 Find Products'}
            </button>
          </div>
        </div>

        {/* Slow Products */}
        {slowProducts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📦 Slow-Moving Products ({slowProducts.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slowProducts.map(p => (
                <div key={p.id} className="bg-white rounded-lg shadow-md p-4 border-2 border-yellow-200 hover:shadow-lg transition">
                  <h3 className="font-bold text-gray-800 mb-2">{p.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">Stock: {p.quantity || 0} | Price: ₹{p.price}</p>
                  <button onClick={() => createPromotion(p)} className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white font-bold py-2 rounded-lg transition">
                    💰 Create Promo
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Promotions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Active Promotions ({activePromotions.length})</h2>
          <div className="space-y-3">
            {activePromotions.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center text-gray-500">No active promotions</div>
            ) : (
              activePromotions.map(p => (
                <div key={p.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-800 mb-1">{p.message}</h3>
                      <div className="flex gap-2">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-bold">{p.discount_percent}% OFF</span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">₹{p.promo_price?.toFixed(2)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">Active</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
