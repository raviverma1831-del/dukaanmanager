import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function B2BNetwork({ shop }) {
  const [networkShops, setNetworkShops] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedShop, setSelectedShop] = useState(null)
  const [bulkPurchase, setBulkPurchase] = useState({
    shopId: null,
    items: [],
    totalAmount: 0
  })

  useEffect(() => {
    loadNetworkData()
  }, [shop])

  const loadNetworkData = async () => {
    try {
      // Get nearby shops (mock - in real system would use geolocation)
      const { data: allShops } = await supabase
        .from('shops')
        .select('*')
        .neq('id', shop.id)
        .limit(10)

      if (allShops) {
        setNetworkShops(allShops)
      }

      // Get purchase requests
      const { data: reqs } = await supabase
        .from('b2b_requests')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })

      if (reqs) {
        setRequests(reqs)
      }
    } catch (err) {
      console.error('[v0] Error loading network:', err)
    }
  }

  const browseShopInventory = async (targetShop) => {
    try {
      setLoading(true)
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', targetShop.id)
        .gt('stock', 0)

      if (products) {
        setAvailableProducts(products)
        setSelectedShop(targetShop)
        setBulkPurchase({ shopId: targetShop.id, items: [], totalAmount: 0 })
      }
    } catch (err) {
      console.error('[v0] Error browsing inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  const addToBulkOrder = (product) => {
    setBulkPurchase(prev => {
      const existing = prev.items.find(i => i.id === product.id)
      let newItems

      if (existing) {
        newItems = prev.items.map(i =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      } else {
        newItems = [...prev.items, { ...product, qty: 1 }]
      }

      const totalAmount = newItems.reduce((sum, item) => 
        sum + (item.wholesale_price * item.qty), 0
      )

      return { ...prev, items: newItems, totalAmount }
    })
  }

  const removeFromOrder = (productId) => {
    setBulkPurchase(prev => {
      const newItems = prev.items.filter(i => i.id !== productId)
      const totalAmount = newItems.reduce((sum, item) => 
        sum + (item.wholesale_price * item.qty), 0
      )
      return { ...prev, items: newItems, totalAmount }
    })
  }

  const placeBulkOrder = async () => {
    if (bulkPurchase.items.length === 0) {
      alert('Add items to order first')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('b2b_requests')
        .insert({
          from_shop_id: shop.id,
          to_shop_id: bulkPurchase.shopId,
          items: bulkPurchase.items,
          total_amount: bulkPurchase.totalAmount,
          status: 'pending',
          request_date: new Date().toISOString()
        })

      if (!error) {
        alert(`✅ B2B order placed!\nAmount: ₹${bulkPurchase.totalAmount}`)
        setBulkPurchase({ shopId: null, items: [], totalAmount: 0 })
        setSelectedShop(null)
        setAvailableProducts([])
        loadNetworkData()
      }
    } catch (err) {
      console.error('[v0] Error placing order:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">B2B Network</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Shops */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-gray-800">Network Partners</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {networkShops.map((s) => (
              <div
                key={s.id}
                className="bg-white p-4 rounded-lg border-2 border-purple-200 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => browseShopInventory(s)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-600">Owner: {s.owner_name}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                    Online
                  </span>
                </div>
                <p className="text-sm text-gray-700">{s.biz_label}</p>
                {s.phone && <p className="text-xs text-gray-600">📱 {s.phone}</p>}
                <button className="mt-3 w-full px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600">
                  Browse Inventory
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bulk Order Cart */}
        <div>
          {selectedShop ? (
            <div>
              <div className="mb-4 p-4 bg-purple-100 border-2 border-purple-400 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">Ordering from {selectedShop.name}</h4>
                <p className="text-sm text-gray-700">Items in cart: {bulkPurchase.items.length}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4 max-h-96 overflow-y-auto">
                {bulkPurchase.items.length > 0 ? (
                  <div className="space-y-3">
                    {bulkPurchase.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b pb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-600">
                            ₹{item.wholesale_price} × {item.qty} = ₹{item.wholesale_price * item.qty}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              setBulkPurchase(prev => ({
                                ...prev,
                                items: prev.items.map(i =>
                                  i.id === item.id ? { ...i, qty: parseInt(e.target.value) || 1 } : i
                                ),
                                totalAmount: prev.items.reduce((sum, i) =>
                                  i.id === item.id
                                    ? sum + (i.wholesale_price * (parseInt(e.target.value) || 1))
                                    : sum + (i.wholesale_price * i.qty), 0
                                )
                              }))
                            }}
                            className="w-12 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                          <button
                            onClick={() => removeFromOrder(item.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4">Select items below to add to order</p>
                )}
              </div>

              {/* Available Products */}
              <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                <h5 className="font-bold mb-3 text-gray-800">Available Items</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableProducts.slice(0, 10).map((product) => (
                    <div
                      key={product.id}
                      className="flex justify-between items-center p-2 bg-purple-50 rounded hover:bg-purple-100 cursor-pointer"
                      onClick={() => addToBulkOrder(product)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-600">Stock: {product.stock}</p>
                      </div>
                      <p className="font-bold text-purple-600">₹{product.wholesale_price}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 rounded-lg mb-4">
                <p className="text-sm mb-2">Total Amount</p>
                <p className="text-3xl font-bold">₹{bulkPurchase.totalAmount.toLocaleString()}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedShop(null)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={placeBulkOrder}
                  disabled={loading || bulkPurchase.items.length === 0}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 font-semibold"
                >
                  {loading ? 'Ordering...' : 'Place Order'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg text-center text-gray-600 border-2 border-dashed border-purple-300">
              <p className="text-lg">Select a network partner to browse their inventory</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Requests */}
      <div className="mt-6 bg-white rounded-lg p-4 border border-purple-200">
        <h3 className="font-bold mb-4 text-gray-800">Recent B2B Requests</h3>
        <div className="space-y-2">
          {requests.length > 0 ? (
            requests.slice(0, 5).map((req) => (
              <div key={req.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-purple-400">
                <div>
                  <p className="font-semibold text-gray-800">₹{req.total_amount}</p>
                  <p className="text-xs text-gray-600">{req.status.toUpperCase()} - {req.items?.length || 0} items</p>
                </div>
                <p className="text-xs text-gray-600">
                  {new Date(req.request_date).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center py-4">No requests yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
