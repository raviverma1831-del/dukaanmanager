import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AIPromotion({ shop }) {
  const [products, setProducts] = useState([])
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [promoConfig, setPromoConfig] = useState({
    autoGenerate: true,
    minDaysOld: 30,
    maxDiscount: 40,
    minQuantity: 5
  })

  useEffect(() => {
    loadProducts()
  }, [shop])

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('is_service', false)
    
    if (data) {
      setProducts(data)
      if (promoConfig.autoGenerate) {
        generatePromotions(data)
      }
    }
  }

  const generatePromotions = async (prods) => {
    setLoading(true)
    try {
      const today = new Date()
      const cutoffDate = new Date(today.getTime() - promoConfig.minDaysOld * 24 * 60 * 60 * 1000)
      
      const slowProducts = prods.filter(p => {
        const createdAt = new Date(p.created_at)
        const isOld = createdAt < cutoffDate
        const hasStock = p.stock > promoConfig.minQuantity
        const lowSales = p.stock > (p.min_stock * 1.5)
        return isOld && hasStock && lowSales
      })

      const suggestions = slowProducts.map(p => {
        const discount = Math.min(
          promoConfig.maxDiscount,
          Math.round((p.stock / p.min_stock) * 10)
        )
        const discountedPrice = Math.round(p.retail_price * (1 - discount / 100))
        
        return {
          id: p.id,
          name: p.name,
          originalPrice: p.retail_price,
          discountedPrice,
          discount,
          currentStock: p.stock,
          category: p.category,
          reason: `${p.stock} units in stock - slow moving item`,
          message: `Flash Sale! 🔥 ${discount}% off on ${p.name} - Now ₹${discountedPrice}!`,
          estimatedClearing: Math.round(p.stock / (Math.max(1, p.stock / 20)))
        }
      }).sort((a, b) => b.discount - a.discount)

      setPromotions(suggestions)
    } catch (err) {
      console.error('[v0] Error generating promotions:', err)
    } finally {
      setLoading(false)
    }
  }

  const activatePromotion = async (promo) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .insert({
          shop_id: shop.id,
          product_id: promo.id,
          discount_percent: promo.discount,
          promo_price: promo.discountedPrice,
          message: promo.message,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      
      if (!error) {
        alert(`✅ Promotion activated for ${promo.name}!`)
        setSelectedPromo(promo)
      }
    } catch (err) {
      console.error('[v0] Error activating promotion:', err)
    }
  }

  const sendPromoBlast = async (promo) => {
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('name,phone')
        .eq('shop_id', shop.id)
        .not('phone', 'is', null)

      if (customers && customers.length > 0) {
        alert(`📱 Blast ready:\n\n${promo.message}\n\nTo: ${customers.length} customers`)
      } else {
        alert('No customer phone numbers on file')
      }
    } catch (err) {
      console.error('[v0] Error sending blast:', err)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Promotion Engine</h2>

      {/* Config Section */}
      <div className="bg-white p-4 rounded-lg mb-6 border border-orange-200">
        <h3 className="font-semibold mb-4">Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Days Old</label>
            <input
              type="number"
              value={promoConfig.minDaysOld}
              onChange={(e) => setPromoConfig({...promoConfig, minDaysOld: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount %</label>
            <input
              type="number"
              value={promoConfig.maxDiscount}
              onChange={(e) => setPromoConfig({...promoConfig, maxDiscount: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Quantity</label>
            <input
              type="number"
              value={promoConfig.minQuantity}
              onChange={(e) => setPromoConfig({...promoConfig, minQuantity: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => generatePromotions(products)}
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="bg-white p-4 rounded-lg border-2 border-orange-300 shadow-sm hover:shadow-md transition"
          >
            <div className="mb-3">
              <h4 className="font-bold text-lg text-gray-800">{promo.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{promo.category}</p>
            </div>

            <div className="bg-orange-50 p-3 rounded mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Price:</span>
                <span className="font-bold">₹{promo.originalPrice} → ₹{promo.discountedPrice}</span>
              </div>
              <div className="text-center bg-gradient-to-r from-orange-400 to-red-400 text-white font-bold py-2 rounded text-lg">
                {promo.discount}% OFF
              </div>
            </div>

            <div className="text-sm text-gray-700 mb-3">
              <p>Stock: {promo.currentStock} units</p>
              <p className="text-xs text-gray-600 mt-1">{promo.reason}</p>
            </div>

            <div className="bg-blue-50 p-2 rounded mb-3 text-xs">
              <p className="font-semibold text-blue-900 mb-1">Message:</p>
              <p className="italic">{promo.message}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => activatePromotion(promo)}
                className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              >
                Activate
              </button>
              <button
                onClick={() => sendPromoBlast(promo)}
                className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Blast
              </button>
            </div>
          </div>
        ))}
      </div>

      {promotions.length === 0 && !loading && (
        <div className="bg-white p-8 rounded-lg text-center text-gray-600">
          <p className="text-lg">No slow-moving products found</p>
          <p className="text-sm mt-2">Try adjusting configuration and regenerating</p>
        </div>
      )}

      {/* Selected Promo Details */}
      {selectedPromo && (
        <div className="mt-6 bg-green-50 border-2 border-green-400 p-4 rounded-lg">
          <h3 className="font-bold text-green-900 mb-2">Active Promotion</h3>
          <p className="text-gray-800">{selectedPromo.message}</p>
          <p className="text-sm text-gray-600 mt-2">
            Valid for 7 days | Est. clearing in {selectedPromo.estimatedClearing} days
          </p>
        </div>
      )}
    </div>
  )
}
