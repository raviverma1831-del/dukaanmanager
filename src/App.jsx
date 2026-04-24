import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import Login from './components/Login.jsx'
import Onboarding from './components/Onboarding.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import Billing from './components/Billing.jsx'
import Inventory from './components/Inventory.jsx'
import Purchases from './components/Purchases.jsx'
import KhataBook from './components/KhataBook.jsx'
import Suppliers from './components/Suppliers.jsx'
import AIChat from './components/AIChat.jsx'
import Reports from './components/Reports.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadShop(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadShop(session.user.id)
      else { setShop(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadShop = async (userId) => {
    const { data } = await supabase.from('shops').select('*').eq('owner_id', userId).single()
    setShop(data || null)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShop(null); setSession(null)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16, background:'#f0fdf4' }}>
      <div style={{ fontSize:48 }}>🏪</div>
      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:20, color:'#14532d' }}>DukaanManager</div>
      <div style={{ color:'#6b7280', fontSize:14 }}>Loading...</div>
    </div>
  )

  if (!session) return <Login />
  if (!shop) return <Onboarding userId={session.user.id} onComplete={(s)=>setShop(s)} />

  const TABS = {
    dashboard: <Dashboard shop={shop} />,
    ai:        <AIChat shop={shop} />,
    billing:   <Billing shop={shop} />,
    inventory: <Inventory shop={shop} />,
    purchases: <Purchases shop={shop} />,
    khata:     <KhataBook shop={shop} />,
    suppliers: <Suppliers shop={shop} />,
    reports:   <Reports shop={shop} />,
    settings:  <Settings shop={shop} onUpdate={(s) => setShop(s)} />,
  }

  return (
    <Layout shop={shop} tab={tab} setTab={setTab} onSignOut={handleSignOut}>
      {TABS[tab] || TABS.dashboard}
    </Layout>
  )
}
