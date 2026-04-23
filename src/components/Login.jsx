import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/constants.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handle = async (e) => {
  e.preventDefault()
  if (!email || !password) return
  setLoading(true); setMsg('')
  try {
    let error
    if (isSignUp) {
      const res = await supabase.auth.signUp({ email, password })
      error = res.error
      if (!error) setMsg('✅ Account ban gaya! Ab login karein.')
    } else {
      const res = await supabase.auth.signInWithPassword({ email, password })
      error = res.error
    }
    if (error) setMsg('❌ ' + error.message)
  } catch (err) {
    setMsg('❌ Error: ' + err.message)
  }
  setLoading(false)
}

  const inp = { width:'100%', border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', fontSize:15, outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#fafffe', boxSizing:'border-box' }

  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(135deg, ${C.gD} 0%, ${C.g} 60%, #0d9488 100%)`, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <div style={{ background:C.card, borderRadius:24, padding:'40px 36px', maxWidth:400, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48 }}>🏪</div>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:26, color:C.gD, marginTop:8 }}>DukaanManager</div>
          <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>Aapki Dukaan, Digital Hisaab</div>
        </div>
        <form onSubmit={handle}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontWeight:700, fontSize:13, color:C.text, display:'block', marginBottom:6 }}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="aapka@email.com" style={inp} required />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontWeight:700, fontSize:13, color:C.text, display:'block', marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={inp} required minLength={6} />
          </div>
          {msg && <div style={{ background: msg.startsWith('✅') ? C.gXL : C.redL, color: msg.startsWith('✅') ? C.gD : C.red, borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:14, fontWeight:600 }}>{msg}</div>}
          <button type="submit" disabled={loading} style={{ width:'100%', background:loading?C.muted:`linear-gradient(135deg, ${C.gD}, ${C.g})`, color:'#fff', border:'none', borderRadius:14, padding:14, fontFamily:"'Baloo 2',cursive", fontWeight:900, fontSize:16, cursor:loading?'not-allowed':'pointer', boxShadow:'0 6px 20px rgba(22,163,74,0.3)' }}>
            {loading ? '⏳ Please wait...' : isSignUp ? '🚀 Account Banao' : '🔓 Login Karein'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:C.muted }}>
          {isSignUp ? 'Pehle se account hai? ' : 'Naya account? '}
          <button onClick={()=>{setIsSignUp(!isSignUp);setMsg('')}} style={{ color:C.g, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:13 }}>
            {isSignUp ? 'Login Karein' : 'Sign Up Karein'}
          </button>
        </div>
        <div style={{ marginTop:20, background:'#f0f9ff', borderRadius:12, padding:'12px 14px', fontSize:12, color:'#0369a1' }}>
          <b>📝 Pehli baar?</b> Upar "Sign Up" karein, phir email verify karein, phir login karein.
        </div>
      </div>
    </div>
  )
}
