/**
 * BridgePath Group — Client Self-Service Portal
 * ──────────────────────────────────────────────
 * Separate login experience for immigration clients.
 * Shares brand tokens with bridgepath-platform.jsx.
 *
 * Views:
 *   Login      → email + password, magic link option
 *   Home       → welcome, progress snapshot, next action
 *   Journey    → full 14-step tracker with milestone detail
 *   Documents  → BridgeVault™ upload + status per doc
 *   Appointments → upcoming + reschedule
 *   Messages   → threaded chat with BridgePath team (AI-assisted replies)
 *   Settings   → language, notifications, password
 *
 * To mount alongside bridgepath-platform.jsx, add to App.jsx:
 *   import ClientPortal from './ClientPortal'
 *   // Route: if url contains /client → render <ClientPortal />
 *   // Or add a nav item: { key:"client-portal", label:"Client view" }
 */

import { useState, useEffect, useRef } from "react";

// ── BRAND TOKENS (mirrors bridgepath-platform.jsx) ────────────
const T = {
  navy:      "#1B3A7A",
  navyDk:    "#122759",
  navyLt:    "#2B4FA0",
  navyGhost: "rgba(27,58,122,0.08)",
  gold:      "#F5A800",
  goldDk:    "#C98E00",
  goldLt:    "#FFD060",
  goldPale:  "#FFF8E1",
  teal:      "#1A8870",
  tealLt:    "#D0F4EC",
  tealDk:    "#106B5A",
  cream:     "#F6F8FD",
  white:     "#FFFFFF",
  text:      "#111827",
  muted:     "#6B7794",
  border:    "rgba(27,58,122,0.11)",
  borderMd:  "rgba(27,58,122,0.18)",
  red:       "#DC2626",
  redPale:   "#FEF2F2",
  purple:    "#7C3AED",
  purplePale:"#EDE9FE",
};

// ── MOCK CLIENT DATA ──────────────────────────────────────────
// In production: fetched from Supabase using the logged-in user's client_id
const MOCK_CLIENT = {
  id: 1,
  name: "María Castellanos",
  email: "maria.c@email.com",
  phone: "(301) 555-0192",
  language: "es",
  country: "Mexico",
  caseType: "Work Permit · EAD",
  caseNumber: "BP-2025-0047",
  step: 5,
  steps: 14,
  color: T.teal,
  consultant: "Javid A.",
  consultantEmail: "javid@bridgepathgroup.com",
  nextAppt: { date: "Today", time: "10:30 AM", type: "Initial consultation", format: "Virtual", link: "https://cal.com/bridgepath/meeting" },
};

const MILESTONES = [
  { label:"Initial contact",            detail:"We received your inquiry. Welcome to BridgePath!" },
  { label:"Consultation scheduled",     detail:"Your initial consultation has been booked." },
  { label:"Consultation completed",     detail:"Your case review is complete. We have a clear picture of your situation." },
  { label:"Client intake completed",    detail:"Your intake form and personal information have been recorded." },
  { label:"Document checklist sent",    detail:"We've sent you a personalized checklist of required documents." },
  { label:"Documents received",         detail:"We've received your documents and are reviewing them." },
  { label:"Documents reviewed",         detail:"All documents have been reviewed and verified." },
  { label:"Application prepared",       detail:"Your application package is fully prepared and ready for your review." },
  { label:"Client review",              detail:"You're reviewing the final application before submission." },
  { label:"Application submitted",      detail:"Your application has been submitted to USCIS." },
  { label:"Waiting for government updates", detail:"Your case is under government review. This step can take several months." },
  { label:"Biometrics appointment",     detail:"USCIS has scheduled your biometrics appointment." },
  { label:"Interview scheduled",        detail:"Your USCIS interview date has been confirmed." },
  { label:"Case completed",             detail:"🎉 Your case is complete. Congratulations!" },
];

const MOCK_DOCS = [
  { id:1, icon:"🛂", label:"Passport",               status:"ok",   cat:"identity",    meta:"MX · Expires 2027",       uploaded:"Jun 15" },
  { id:2, icon:"📋", label:"I-94 record",            status:"ok",   cat:"identity",    meta:"Downloaded from CBP",     uploaded:"Jun 20" },
  { id:3, icon:"📄", label:"Visa document",          status:"ok",   cat:"identity",    meta:"B-2 Tourist Visa",        uploaded:"Jun 22" },
  { id:4, icon:"🪪", label:"Birth certificate",      status:"miss", cat:"identity",    meta:"Please upload a certified copy", uploaded:null },
  { id:5, icon:"📝", label:"Form I-765",             status:"rev",  cat:"application", meta:"Prepared by BridgePath — in review", uploaded:"Jun 27" },
  { id:6, icon:"📸", label:"Passport photos (2×2)", status:"miss", cat:"application", meta:"USCIS-compliant, white background", uploaded:null },
  { id:7, icon:"💳", label:"Filing fee receipt",     status:"miss", cat:"application", meta:"$410 — Form I-765 fee",   uploaded:null },
  { id:8, icon:"💼", label:"Employment auth letter", status:"ok",   cat:"application", meta:"From employer",           uploaded:"Jun 25" },
];

const MOCK_MESSAGES = [
  { id:1, from:"staff", sender:"Javid A.", ts: new Date(Date.now()-2*24*3600000),
    body:"Welcome to BridgePath, María! I've reviewed your case and prepared your document checklist. Please upload the items marked as missing in your BridgeVault when you get a chance — your birth certificate is the most urgent one." },
  { id:2, from:"client", sender:"María Castellanos", ts: new Date(Date.now()-1*24*3600000),
    body:"Thank you Javid! I'll get the birth certificate translated. Is a notarized copy ok or does it need to be apostilled?" },
  { id:3, from:"staff", sender:"Javid A.", ts: new Date(Date.now()-20*3600000),
    body:"Great question — for the EAD application, a notarized English translation alongside the original is sufficient. No apostille needed for this one. Let me know once it's uploaded!" },
  { id:4, from:"client", sender:"María Castellanos", ts: new Date(Date.now()-2*3600000),
    body:"Perfect! I have the translation appointment scheduled for Thursday. Will upload right after." },
];

const MOCK_APPOINTMENTS = [
  { id:1, date:"Today", mon:"Jun", day:"29", time:"10:30 AM", type:"Initial consultation", format:"Virtual", duration:"60 min", status:"upcoming", link:"https://cal.com/bridgepath/meeting" },
  { id:2, date:"Jul 1", mon:"Jul", day:"1",  time:"2:00 PM",  type:"Document review",     format:"Virtual", duration:"45 min", status:"upcoming", link:"https://cal.com/bridgepath/meeting" },
  { id:3, date:"Jun 18",mon:"Jun", day:"18", time:"11:00 AM", type:"Initial consultation", format:"Virtual", duration:"60 min", status:"completed", link:null },
];

// ── SHARED COMPONENTS ─────────────────────────────────────────
function Logo({ light = false }) {
  const textColor = light ? "#fff" : T.navy;
  const goldColor = T.gold;
  return (
    <svg width="160" height="40" viewBox="0 0 220 52" xmlns="http://www.w3.org/2000/svg" aria-label="BridgePath Group">
      <path d="M8 38 Q28 14 52 26 Q36 28 22 38Z" fill={textColor}/>
      <path d="M52 26 Q76 12 96 38 Q82 34 68 38 Q60 32 52 26Z" fill={textColor}/>
      <rect x="7" y="36" width="90" height="6" rx="2" fill={textColor}/>
      <rect x="7" y="36" width="12" height="12" rx="2" fill={textColor}/>
      <rect x="85" y="36" width="12" height="12" rx="2" fill={textColor}/>
      <path d="M16 40 Q40 20 68 14 Q84 10 100 4" stroke={goldColor} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <polygon points="100,4 91,2 93,11" fill={goldColor}/>
      <text x="108" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill={textColor}>Bridge</text>
      <text x="162" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill={goldColor} fontStyle="italic">Path</text>
      <text x="108" y="44" fontFamily="'Nunito Sans',system-ui" fontWeight="400" fontSize="10" fill={light ? "rgba(255,255,255,0.5)" : T.muted} letterSpacing="4">GROUP</text>
    </svg>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
      padding:"1.25rem 1.4rem", boxShadow:"0 2px 16px rgba(27,58,122,0.07)", ...style }}>
      {children}
    </div>
  );
}

function Btn({ variant="navy", onClick, children, style={}, disabled=false }) {
  const [hover, setHover] = useState(false);
  const base = {
    navy:  { background:T.navy,  color:"#fff",   border:"none" },
    gold:  { background:T.gold,  color:T.navy,   border:"none" },
    teal:  { background:T.teal,  color:"#fff",   border:"none" },
    ghost: { background:"transparent", color:T.navy, border:`1px solid ${T.borderMd}` },
    white: { background:T.white, color:T.navy,   border:`1px solid ${T.border}` },
  };
  const hov = {
    navy:  { background:T.navyLt },
    gold:  { background:T.goldDk, color:"#fff" },
    teal:  { background:T.tealDk },
    ghost: { background:T.navyGhost },
    white: { background:T.cream },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7,
        padding:"9px 18px", borderRadius:9, fontFamily:"'Nunito Sans',sans-serif",
        fontSize:13, fontWeight:700, cursor:disabled?"default":"pointer",
        transition:"all 0.14s", opacity:disabled?0.5:1,
        ...base[variant], ...(hover && !disabled ? hov[variant] : {}), ...style }}>
      {children}
    </button>
  );
}

function Input({ label, type="text", value, onChange, placeholder, icon, required=false }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.muted,
        textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 }}>
        {label}{required && <span style={{ color:T.red }}> *</span>}
      </label>}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
          fontSize:15, pointerEvents:"none" }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width:"100%", padding:`10px ${icon?"38px":"12px"} 10px ${icon?"38px":"12px"}`,
            borderRadius:9, border:`1.5px solid ${focus ? T.navy : T.borderMd}`,
            background: focus ? T.white : T.cream,
            fontFamily:"'Nunito Sans',sans-serif", fontSize:13.5, color:T.text, outline:"none",
            transition:"all 0.15s" }}/>
      </div>
    </div>
  );
}

function ProgressRing({ pct, size=64, color=T.teal }) {
  const r = (size-8)/2, circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
        strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.6s ease" }}/>
    </svg>
  );
}

function StatusDot({ status }) {
  const map = {
    ok:   { bg:T.teal,   title:"Verified" },
    rev:  { bg:T.gold,   title:"In review" },
    miss: { bg:"#E5E7EB", title:"Missing", border:`1px solid #D1D5DB` },
  };
  const s = map[status] || map.miss;
  return <div title={s.title} style={{ width:10, height:10, borderRadius:"50%",
    background:s.bg, border:s.border||"none", flexShrink:0 }}/>;
}

function timeAgo(ts) {
  const d = Math.floor((Date.now()-new Date(ts))/1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

// ── LOGIN SCREEN ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("password"); // "password" | "magic"
  const [email, setEmail] = useState("maria.c@email.com");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email) { setError("Please enter your email."); return; }
    if (mode === "password" && !password) { setError("Please enter your password."); return; }
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    onLogin(MOCK_CLIENT);
  };

  const handleMagicLink = async () => {
    if (!email) { setError("Please enter your email."); return; }
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false); setSent(true);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg, ${T.navy} 0%, ${T.navyLt} 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem",
      fontFamily:"'Nunito Sans',system-ui,sans-serif" }}>

      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <Logo light/>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:8, letterSpacing:"0.03em" }}>
            Client portal
          </div>
        </div>

        {/* Card */}
        <Card style={{ padding:"2rem" }}>
          <div style={{ fontSize:20, fontWeight:800, color:T.navy,
            fontFamily:"'Nunito',sans-serif", marginBottom:4 }}>
            Welcome back
          </div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:"1.5rem" }}>
            Sign in to view your case, upload documents, and message your consultant.
          </div>

          {/* Mode toggle */}
          <div style={{ display:"flex", gap:2, background:T.cream, borderRadius:9, padding:3, marginBottom:"1.25rem" }}>
            {[["password","🔑 Password"],["magic","✉️ Magic link"]].map(([m,l]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSent(false); }}
                style={{ flex:1, padding:"6px", borderRadius:7, border:"none", cursor:"pointer",
                  fontSize:12.5, fontWeight:mode===m?700:400, fontFamily:"'Nunito Sans',sans-serif",
                  background:mode===m?T.white:"transparent",
                  color:mode===m?T.navy:T.muted,
                  boxShadow:mode===m?"0 1px 4px rgba(27,58,122,0.10)":"none",
                  transition:"all 0.13s" }}>
                {l}
              </button>
            ))}
          </div>

          <Input label="Email address" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@email.com" icon="📧" required/>

          {mode === "password" && (
            <Input label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" icon="🔒" required/>
          )}

          {error && (
            <div style={{ background:T.redPale, borderLeft:`3px solid ${T.red}`, borderRadius:"0 8px 8px 0",
              padding:"9px 12px", fontSize:12.5, color:T.red, marginBottom:12 }}>
              {error}
            </div>
          )}

          {sent ? (
            <div style={{ background:T.tealLt, borderLeft:`3px solid ${T.teal}`, borderRadius:"0 8px 8px 0",
              padding:"11px 14px", fontSize:13, color:T.tealDk, marginBottom:12, lineHeight:1.6 }}>
              ✅ Magic link sent to <strong>{email}</strong>. Check your inbox and click the link to sign in.
            </div>
          ) : (
            <Btn variant="navy" onClick={mode==="password"?handleLogin:handleMagicLink}
              disabled={loading} style={{ width:"100%", marginBottom:12, fontSize:14 }}>
              {loading ? "Signing in…" : mode==="password" ? "Sign in" : "Send magic link"}
            </Btn>
          )}

          <div style={{ textAlign:"center", fontSize:12, color:T.muted }}>
            Not a client yet?{" "}
            <span style={{ color:T.navy, fontWeight:700, cursor:"pointer",
              textDecoration:"underline" }}>
              Contact BridgePath Group
            </span>
          </div>
        </Card>

        {/* Demo hint */}
        <div style={{ textAlign:"center", marginTop:"1.25rem", fontSize:12,
          color:"rgba(255,255,255,0.45)" }}>
          Demo: pre-filled as María Castellanos · click Sign in
        </div>
      </div>
    </div>
  );
}

// ── CLIENT NAV ────────────────────────────────────────────────
const CLIENT_NAV = [
  { key:"home",      label:"Home",         icon:"🏠" },
  { key:"journey",   label:"My journey",   icon:"🗺️" },
  { key:"documents", label:"Documents",    icon:"📂" },
  { key:"appointments", label:"Appointments", icon:"📅" },
  { key:"messages",  label:"Messages",     icon:"💬" },
  { key:"settings",  label:"Settings",     icon:"⚙️" },
];

function ClientNav({ view, onNav, client, unreadMessages, onLogout }) {
  return (
    <div style={{ width:220, background:T.navy, minHeight:"100vh", display:"flex",
      flexDirection:"column", flexShrink:0, position:"sticky", top:0 }}>
      {/* Logo */}
      <div style={{ padding:"1.25rem 1.1rem 0.75rem", borderBottom:`1px solid rgba(255,255,255,0.08)` }}>
        <Logo light size={0.75}/>
        <div style={{ marginTop:10, fontSize:10.5, color:"rgba(255,255,255,0.4)",
          textTransform:"uppercase", letterSpacing:"0.07em" }}>Client portal</div>
      </div>

      {/* Client identity */}
      <div style={{ padding:"1rem 1.1rem", borderBottom:`1px solid rgba(255,255,255,0.08)`,
        display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:T.gold, color:T.navy,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, fontWeight:800, fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>
          {client.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:12.5, fontWeight:700, color:"#fff",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {client.name}
          </div>
          <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.5)", marginTop:1 }}>
            {client.caseType}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:"0.75rem 0.6rem" }}>
        {CLIENT_NAV.map(({ key, label, icon }) => {
          const active = view === key;
          const badge = key === "messages" && unreadMessages > 0;
          return (
            <button key={key} onClick={() => onNav(key)}
              style={{ display:"flex", alignItems:"center", gap:9, width:"100%",
                padding:"9px 10px", borderRadius:9, marginBottom:2, border:"none",
                cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif",
                background: active ? "rgba(245,168,0,0.15)" : "transparent",
                color: active ? T.goldLt : "rgba(255,255,255,0.6)",
                fontWeight: active ? 700 : 400, fontSize:13, transition:"all 0.13s",
                textAlign:"left", position:"relative" }}
              onMouseEnter={e => { if(!active) { e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.color="#fff"; }}}
              onMouseLeave={e => { if(!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.6)"; }}}>
              <span style={{ fontSize:15, flexShrink:0 }}>{icon}</span>
              {label}
              {badge && (
                <span style={{ marginLeft:"auto", background:T.red, color:"#fff",
                  fontSize:9.5, fontWeight:800, padding:"2px 6px", borderRadius:10,
                  fontFamily:"'Nunito',sans-serif" }}>
                  {unreadMessages}
                </span>
              )}
              {active && (
                <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
                  width:3, height:18, background:T.gold, borderRadius:"0 3px 3px 0" }}/>
              )}
            </button>
          );
        })}
      </nav>

      {/* Case info + logout */}
      <div style={{ padding:"0.9rem 1.1rem", borderTop:`1px solid rgba(255,255,255,0.08)` }}>
        <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.35)", marginBottom:4 }}>Case number</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", fontWeight:600,
          fontFamily:"'JetBrains Mono',monospace", marginBottom:12 }}>
          {client.caseNumber}
        </div>
        <button onClick={onLogout}
          style={{ width:"100%", padding:"7px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)",
            background:"transparent", color:"rgba(255,255,255,0.5)", fontSize:12,
            cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif", transition:"all 0.13s" }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.5)"; }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── HOME VIEW ─────────────────────────────────────────────────
function HomeView({ client, onNav }) {
  const pct = Math.round((client.step / client.steps) * 100);
  const nextMilestone = MILESTONES[client.step] || MILESTONES[client.steps - 1];
  const missingDocs = MOCK_DOCS.filter(d => d.status === "miss");

  return (
    <div>
      {/* Hero greeting */}
      <div style={{ background:`linear-gradient(135deg, ${T.navy} 0%, ${T.navyLt} 100%)`,
        borderRadius:16, padding:"1.75rem 2rem", marginBottom:"1.25rem",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow:"0 4px 24px rgba(27,58,122,0.18)" }}>
        <div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:6 }}>Good morning</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#fff",
            fontFamily:"'Nunito',sans-serif", lineHeight:1.2 }}>
            {client.name.split(" ")[0]} 👋
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.65)", marginTop:6 }}>
            {client.caseType} · {pct}% complete
          </div>
        </div>
        {/* Ring */}
        <div style={{ position:"relative", width:80, height:80, flexShrink:0 }}>
          <ProgressRing pct={pct} size={80} color={T.gold}/>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:16, fontWeight:800, color:"#fff",
              fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{pct}%</span>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.5)", marginTop:1 }}>done</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:"1.25rem" }}>
        {[
          { icon:"🗺️", label:"Current step", value:`Step ${client.step} of 14` },
          { icon:"📄", label:"Docs missing",  value:`${missingDocs.length} items`, warn:missingDocs.length > 0 },
          { icon:"📅", label:"Next appointment", value:client.nextAppt.time },
        ].map(s => (
          <Card key={s.label} style={{ padding:"1rem", textAlign:"center" }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:13, fontWeight:800, fontFamily:"'Nunito',sans-serif",
              color: s.warn ? T.red : T.navy }}>{s.value}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.1rem" }}>
        {/* Next action */}
        <Card>
          <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
            letterSpacing:"0.06em", marginBottom:10 }}>Your next step</div>
          <div style={{ display:"flex", gap:12, alignItems:"flex-start",
            padding:"12px 14px", borderRadius:10, background:T.navyGhost,
            border:`1px solid ${T.border}`, marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:T.navy,
              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, fontWeight:800, fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>
              {client.step + 1}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.navy }}>{nextMilestone.label}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:3, lineHeight:1.5 }}>
                {nextMilestone.detail}
              </div>
            </div>
          </div>
          {missingDocs.length > 0 && (
            <div style={{ background:T.redPale, borderLeft:`3px solid ${T.red}`,
              borderRadius:"0 8px 8px 0", padding:"10px 13px", marginBottom:12 }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:T.red, marginBottom:4 }}>
                ⚠️ {missingDocs.length} document{missingDocs.length>1?"s":""} needed
              </div>
              {missingDocs.map(d => (
                <div key={d.id} style={{ fontSize:12, color:T.red, marginTop:2 }}>
                  · {d.label}
                </div>
              ))}
            </div>
          )}
          <Btn variant="gold" onClick={() => onNav("documents")} style={{ width:"100%" }}>
            📂 Upload documents
          </Btn>
        </Card>

        {/* Upcoming appointment */}
        <Card>
          <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
            letterSpacing:"0.06em", marginBottom:10 }}>Upcoming appointment</div>
          <div style={{ padding:"14px", borderRadius:12, background:T.navyGhost,
            border:`1px solid ${T.border}`, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ background:T.navy, color:"#fff", borderRadius:9, padding:"6px 10px",
                textAlign:"center", flexShrink:0 }}>
                <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>29</div>
                <div style={{ fontSize:8.5, textTransform:"uppercase", letterSpacing:"0.06em", color:T.goldLt }}>Jun</div>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.navy }}>
                  {client.nextAppt.type}
                </div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                  {client.nextAppt.time} · {client.nextAppt.format} · {client.nextAppt.duration||"60 min"}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <a href={client.nextAppt.link} target="_blank" rel="noreferrer"
                style={{ flex:1, padding:"8px", borderRadius:8, background:T.navy, color:"#fff",
                  textDecoration:"none", textAlign:"center", fontSize:12.5, fontWeight:700,
                  fontFamily:"'Nunito Sans',sans-serif" }}>
                🎥 Join meeting
              </a>
              <Btn variant="ghost" style={{ flex:1, fontSize:12 }}
                onClick={() => onNav("appointments")}>
                Reschedule
              </Btn>
            </div>
          </div>
          <div style={{ fontSize:11.5, color:T.muted, lineHeight:1.6 }}>
            Your consultant: <strong style={{ color:T.navy }}>{client.consultant}</strong>
            <br/>Cancellation requires 24+ hours notice.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── JOURNEY VIEW ──────────────────────────────────────────────
function JourneyView({ client }) {
  const [expanded, setExpanded] = useState(client.step - 1);
  const pct = Math.round((client.step / client.steps) * 100);

  return (
    <div>
      <div style={{ marginBottom:"1.25rem" }}>
        <div style={{ fontSize:20, fontWeight:800, color:T.navy,
          fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>Your immigration journey</div>
        <div style={{ fontSize:13, color:T.muted }}>{client.caseType} · {pct}% complete · Step {client.step} of 14</div>
      </div>

      {/* Progress bar */}
      <Card style={{ marginBottom:"1.25rem", padding:"1rem 1.4rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:12.5, fontWeight:700, color:T.navy }}>Overall progress</span>
          <span style={{ fontSize:12.5, fontWeight:800, color:T.teal }}>{pct}%</span>
        </div>
        <div style={{ background:"#E5E7EB", borderRadius:20, height:8, overflow:"hidden" }}>
          <div style={{ background:`linear-gradient(90deg, ${T.teal}, ${T.tealDk})`,
            height:"100%", width:`${pct}%`, borderRadius:20, transition:"width 0.6s ease" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6,
          fontSize:11, color:T.muted }}>
          <span>Started</span>
          <span>You are here — Step {client.step}</span>
          <span>Case complete</span>
        </div>
      </Card>

      {/* Milestone list */}
      <Card>
        {MILESTONES.map((m, i) => {
          const done    = i < client.step - 1;
          const current = i === client.step - 1;
          const future  = i > client.step - 1;
          const open    = expanded === i;

          return (
            <div key={i}>
              <div
                onClick={() => setExpanded(open ? -1 : i)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 4px",
                  cursor:"pointer", borderRadius:8, transition:"background 0.13s",
                  position:"relative" }}
                onMouseEnter={e => e.currentTarget.style.background = T.cream}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                {/* Connector line */}
                {i < MILESTONES.length - 1 && (
                  <div style={{ position:"absolute", left:15, top:44,
                    width:2, height:"calc(100% - 20px)",
                    background: done ? T.teal : T.border, zIndex:0 }}/>
                )}

                {/* Step dot */}
                <div style={{ width:30, height:30, borderRadius:"50%", flexShrink:0, zIndex:1,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize: done ? 13 : 11, fontWeight:700, fontFamily:"'Nunito',sans-serif",
                  background: done ? T.teal : current ? T.navy : "#E5E7EB",
                  color: done ? "#fff" : current ? T.gold : "#9CA3AF",
                  border: current ? `2px solid ${T.gold}` : "none",
                  boxShadow: current ? `0 0 0 4px ${T.goldPale}` : "none",
                  transition:"all 0.2s" }}>
                  {done ? "✓" : i + 1}
                </div>

                {/* Label */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight: current ? 800 : done ? 500 : 400,
                    color: done ? T.teal : current ? T.navy : "#9CA3AF",
                    fontFamily: current ? "'Nunito',sans-serif" : "inherit" }}>
                    {m.label}
                    {current && (
                      <span style={{ marginLeft:8, fontSize:10, background:T.gold, color:T.navy,
                        padding:"2px 8px", borderRadius:20, fontWeight:700,
                        verticalAlign:"middle" }}>Current</span>
                    )}
                  </div>
                  {(done || current) && (
                    <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                      {done ? (i === 0 ? "Jun 8, 2025" : i === 1 ? "Jun 9, 2025" : i === 2 ? "Jun 18, 2025" : i === 3 ? "Jun 20, 2025" : "Jun 27, 2025") : "In progress"}
                    </div>
                  )}
                </div>

                {/* Expand chevron */}
                <span style={{ fontSize:12, color:T.muted, transform:open?"rotate(180deg)":"none",
                  transition:"transform 0.2s", flexShrink:0 }}>▾</span>
              </div>

              {/* Expanded detail */}
              {open && (
                <div style={{ margin:"0 4px 8px 42px", padding:"12px 14px", borderRadius:10,
                  background: current ? T.navyGhost : T.cream, border:`1px solid ${T.border}`,
                  fontSize:13, color:T.text, lineHeight:1.65 }}>
                  {MILESTONES[i].detail}
                  {future && (
                    <div style={{ marginTop:8, fontSize:12, color:T.muted }}>
                      This step hasn't started yet. Your consultant will notify you when it begins.
                    </div>
                  )}
                </div>
              )}

              {i < MILESTONES.length - 1 && (
                <div style={{ height:1, background:T.border, margin:"0 4px" }}/>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── DOCUMENTS VIEW ────────────────────────────────────────────
function DocumentsView() {
  const [docs, setDocs] = useState(MOCK_DOCS);
  const [uploading, setUploading] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const fileInputRef = useRef(null);

  const identity    = docs.filter(d => d.cat === "identity");
  const application = docs.filter(d => d.cat === "application");
  const verified = docs.filter(d => d.status === "ok").length;
  const missing  = docs.filter(d => d.status === "miss").length;

  const simulateUpload = async (docId) => {
    setUploading(docId);
    await new Promise(r => setTimeout(r, 1800));
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status:"rev", uploaded:"Jun 29", meta:"Uploaded · pending review" } : d));
    setUploading(null);
  };

  const handleFileDrop = (e, docId) => {
    e.preventDefault();
    setDragOver(null);
    simulateUpload(docId);
  };

  const statusLabel = { ok:"Verified", rev:"In review", miss:"Missing" };
  const statusColor = { ok:T.teal, rev:T.goldDk, miss:T.red };
  const statusBg    = { ok:T.tealLt, rev:T.goldPale, miss:T.redPale };

  const DocItem = ({ doc }) => {
    const isMissing = doc.status === "miss";
    const isUploading = uploading === doc.id;
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(doc.id); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={e => handleFileDrop(e, doc.id)}
        style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px",
          borderRadius:10, border:`1.5px ${isMissing?"dashed":"solid"} ${dragOver===doc.id ? T.navy : isMissing ? "#D1D5DB" : T.border}`,
          background: dragOver===doc.id ? T.navyGhost : isMissing ? T.cream : T.white,
          transition:"all 0.15s", marginBottom:7 }}>

        {/* Icon */}
        <div style={{ width:36, height:36, borderRadius:9, flexShrink:0,
          background: statusBg[doc.status],
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
          {doc.icon}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{doc.label}</div>
          <div style={{ fontSize:11.5, color:T.muted, marginTop:2 }}>{doc.meta}</div>
        </div>

        {/* Status + action */}
        <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
          <span style={{ fontSize:10.5, fontWeight:700, padding:"3px 9px", borderRadius:20,
            background:statusBg[doc.status], color:statusColor[doc.status] }}>
            {statusLabel[doc.status]}
          </span>
          {isMissing && (
            <button onClick={() => simulateUpload(doc.id)} disabled={isUploading}
              style={{ padding:"6px 12px", borderRadius:8, background:T.navy, color:"#fff",
                border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                fontFamily:"'Nunito Sans',sans-serif", opacity:isUploading?0.6:1,
                transition:"all 0.13s" }}>
              {isUploading ? "Uploading…" : "↑ Upload"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.navy,
            fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>BridgeVault™</div>
          <div style={{ fontSize:13, color:T.muted }}>Secure document storage · {verified} verified · {missing} missing</div>
        </div>
        <Btn variant="gold" onClick={() => fileInputRef.current?.click()}>
          ↑ Upload document
        </Btn>
        <input ref={fileInputRef} type="file" style={{ display:"none" }} accept=".pdf,.jpg,.jpeg,.png"
          onChange={() => simulateUpload(MOCK_DOCS.find(d=>d.status==="miss")?.id)}/>
      </div>

      {/* Summary strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:"1.25rem" }}>
        {[
          { label:"Verified", count:verified, color:T.teal, bg:T.tealLt },
          { label:"In review", count:docs.filter(d=>d.status==="rev").length, color:T.goldDk, bg:T.goldPale },
          { label:"Missing", count:missing, color:T.red, bg:T.redPale },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:"10px 14px",
            display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Nunito',sans-serif", color:s.color }}>{s.count}</div>
            <div style={{ fontSize:12, color:s.color, fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Drag-and-drop hint */}
      {missing > 0 && (
        <div style={{ background:T.goldPale, borderLeft:`3px solid ${T.gold}`, borderRadius:"0 10px 10px 0",
          padding:"10px 14px", fontSize:12.5, color:T.text, marginBottom:"1.1rem", lineHeight:1.6 }}>
          💡 <strong>Tip:</strong> You can drag and drop files directly onto any missing document row below.
        </div>
      )}

      {/* Document sections */}
      {[["🪪 Identity documents", identity], ["📝 Application documents", application]].map(([title, docList]) => (
        <Card key={title} style={{ marginBottom:"1rem" }}>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif",
            marginBottom:12, display:"flex", alignItems:"center", gap:7 }}>
            <span>{title.split(" ")[0]}</span>
            <span>{title.slice(2)}</span>
            <span style={{ marginLeft:"auto", fontSize:11, color:T.muted, fontWeight:400 }}>
              {docList.filter(d=>d.status==="ok").length} of {docList.length} verified
            </span>
          </div>
          {docList.map(doc => <DocItem key={doc.id} doc={doc}/>)}
        </Card>
      ))}

      {/* Legend */}
      <Card style={{ padding:"0.85rem 1.1rem" }}>
        <div style={{ display:"flex", gap:20, fontSize:12, color:T.text, flexWrap:"wrap" }}>
          {[["ok",T.teal,"Verified by BridgePath"],["rev",T.gold,"Uploaded, pending review"],["miss","#D1D5DB","Required — please upload"]].map(([s,c,l])=>(
            <div key={s} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:c,
                border:s==="miss"?"1px solid #D1D5DB":"none" }}/>
              {l}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── APPOINTMENTS VIEW ─────────────────────────────────────────
function AppointmentsView({ client }) {
  const upcoming  = MOCK_APPOINTMENTS.filter(a => a.status === "upcoming");
  const completed = MOCK_APPOINTMENTS.filter(a => a.status === "completed");

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>Appointments</div>
          <div style={{ fontSize:13, color:T.muted }}>{upcoming.length} upcoming · 24hrs notice required to reschedule</div>
        </div>
        <Btn variant="gold">+ Book appointment</Btn>
      </div>

      {/* Upcoming */}
      <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
        letterSpacing:"0.06em", marginBottom:8 }}>Upcoming</div>
      {upcoming.map(a => (
        <Card key={a.id} style={{ marginBottom:"0.9rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ background:T.navy, color:"#fff", borderRadius:10, padding:"8px 12px",
              textAlign:"center", flexShrink:0 }}>
              <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{a.day}</div>
              <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.06em", color:T.goldLt }}>{a.mon}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>{a.type}</div>
              <div style={{ fontSize:12.5, color:T.muted, marginTop:3 }}>
                {a.time} · {a.format} · {a.duration}
              </div>
              <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                With {client.consultant}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, flexShrink:0 }}>
              {a.link && (
                <a href={a.link} target="_blank" rel="noreferrer"
                  style={{ padding:"8px 16px", borderRadius:8, background:T.navy, color:"#fff",
                    textDecoration:"none", fontSize:12.5, fontWeight:700,
                    fontFamily:"'Nunito Sans',sans-serif", textAlign:"center" }}>
                  🎥 Join
                </a>
              )}
              <Btn variant="ghost" style={{ fontSize:12, padding:"7px 14px" }}>Reschedule</Btn>
            </div>
          </div>
        </Card>
      ))}

      {/* Completed */}
      <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
        letterSpacing:"0.06em", margin:"1.25rem 0 8px" }}>Past appointments</div>
      {completed.map(a => (
        <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 14px",
          borderRadius:10, border:`1px solid ${T.border}`, background:T.cream, marginBottom:8,
          opacity:0.75 }}>
          <div style={{ background:"#E5E7EB", color:T.muted, borderRadius:10, padding:"6px 10px",
            textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{a.day}</div>
            <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.06em", color:T.muted }}>{a.mon}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{a.type}</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{a.time} · {a.format}</div>
          </div>
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20,
            background:T.tealLt, color:T.teal }}>Completed</span>
        </div>
      ))}
    </div>
  );
}

// ── MESSAGES VIEW ─────────────────────────────────────────────
function MessagesView({ client }) {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { id:Date.now(), from:"client", sender:client.name, ts:new Date(), body:text };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    // AI-assisted staff reply
    const reply = { id:Date.now()+1, from:"staff", sender:"Javid A. (via BridgePath)", ts:new Date(),
      body:"Thanks for your message, María! I'll look into this and get back to you within one business day. In the meantime, feel free to upload any pending documents to your BridgeVault." };
    setMessages(p => [...p, reply]);
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)" }}>
      {/* Header */}
      <div style={{ marginBottom:"1rem", flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>Messages</div>
        <div style={{ fontSize:13, color:T.muted }}>Direct thread with {client.consultant} · BridgePath Group</div>
      </div>

      {/* Thread */}
      <Card style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", padding:0 }}>
        {/* Thread header */}
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:T.navy, color:T.gold,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>JA</div>
          <div>
            <div style={{ fontSize:13.5, fontWeight:700, color:T.navy }}>Javid A. — BridgePath Group</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ADE80" }}/>
              <span style={{ fontSize:11, color:T.muted }}>Typically replies within 1 business day</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"1.1rem", display:"flex", flexDirection:"column", gap:14 }}>
          {messages.map(m => {
            const isClient = m.from === "client";
            return (
              <div key={m.id} style={{ display:"flex", gap:9, alignItems:"flex-end",
                flexDirection: isClient ? "row-reverse" : "row" }}>
                {/* Avatar */}
                <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                  background: isClient ? T.gold : T.navy,
                  color: isClient ? T.navy : T.gold,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10.5, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>
                  {isClient ? client.name.split(" ").map(w=>w[0]).join("").slice(0,2) : "JA"}
                </div>
                {/* Bubble */}
                <div style={{ maxWidth:"72%" }}>
                  <div style={{ fontSize:10.5, color:T.muted, marginBottom:4,
                    textAlign: isClient ? "right" : "left" }}>
                    {m.sender} · {timeAgo(m.ts)}
                  </div>
                  <div style={{ padding:"10px 14px", borderRadius:14,
                    borderBottomLeftRadius: isClient ? 14 : 3,
                    borderBottomRightRadius: isClient ? 3 : 14,
                    background: isClient ? T.navy : T.cream,
                    color: isClient ? "#fff" : T.text,
                    border: isClient ? "none" : `1px solid ${T.border}`,
                    fontSize:13, lineHeight:1.65 }}>
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display:"flex", gap:9, alignItems:"flex-end" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:T.navy, color:T.gold,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800 }}>JA</div>
              <div style={{ padding:"12px 16px", borderRadius:"14px 14px 14px 3px",
                background:T.cream, border:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.muted, display:"block",
                      animation:`cpDot 1.2s ${i*0.2}s ease-in-out infinite` }}/>
                  ))}
                </div>
                <style>{`@keyframes cpDot{0%,80%,100%{opacity:.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", gap:9, alignItems:"flex-end" }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={2}
              style={{ flex:1, padding:"10px 12px", borderRadius:10,
                border:`1.5px solid ${T.borderMd}`, background:T.cream,
                fontFamily:"'Nunito Sans',sans-serif", fontSize:13, color:T.text,
                outline:"none", resize:"none", lineHeight:1.5,
                transition:"border-color 0.14s" }}
              onFocus={e => e.target.style.borderColor = T.navy}
              onBlur={e => e.target.style.borderColor = T.borderMd}/>
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                background: input.trim() ? T.navy : "#E5E7EB",
                color: input.trim() ? T.gold : T.muted, border:"none",
                cursor: input.trim() ? "pointer" : "default",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, transition:"all 0.14s" }}>
              ↑
            </button>
          </div>
          <div style={{ fontSize:11, color:T.muted, marginTop:6 }}>
            📎 You can also attach documents via BridgeVault™ — your consultant will be notified.
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── SETTINGS VIEW ─────────────────────────────────────────────
function SettingsView({ client }) {
  const [lang, setLang] = useState("es");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifDoc, setNotifDoc] = useState(true);
  const [notifAppt, setNotifAppt] = useState(true);
  const [saved, setSaved] = useState(false);

  const Toggle = ({ value, onChange, label, sub }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{label}</div>
        {sub && <div style={{ fontSize:11.5, color:T.muted, marginTop:2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{ width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
          background: value ? T.teal : "#D1D5DB", position:"relative",
          transition:"background 0.2s", flexShrink:0 }}>
        <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff",
          position:"absolute", top:3, left: value ? 23 : 3,
          transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
      </button>
    </div>
  );

  const save = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:"1.25rem" }}>Settings</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.1rem" }}>
        {/* Account */}
        <Card>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:14 }}>
            👤 Account
          </div>
          {[["Full name", client.name], ["Email", client.email], ["Phone", client.phone], ["Country of origin", client.country]].map(([l,v]) => (
            <div key={l} style={{ marginBottom:12 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:T.muted, textTransform:"uppercase",
                letterSpacing:"0.05em", marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:13, color:T.text, padding:"9px 12px", borderRadius:8,
                background:T.cream, border:`1px solid ${T.border}` }}>{v}</div>
            </div>
          ))}
          <Btn variant="ghost" style={{ width:"100%", marginTop:4 }}>Change password</Btn>
        </Card>

        {/* Preferences */}
        <div>
          <Card style={{ marginBottom:"1rem" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:12 }}>
              🌐 Language
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {[["en","English 🇺🇸"],["es","Español 🇲🇽"]].map(([k,l]) => (
                <button key={k} onClick={() => setLang(k)}
                  style={{ padding:"8px", borderRadius:8, border:`1.5px solid ${lang===k?T.navy:T.border}`,
                    background:lang===k?T.navyGhost:T.cream, cursor:"pointer",
                    fontSize:12.5, fontWeight:lang===k?700:400, color:lang===k?T.navy:T.muted,
                    fontFamily:"'Nunito Sans',sans-serif", transition:"all 0.13s" }}>
                  {l}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:4 }}>
              🔔 Notifications
            </div>
            <Toggle value={notifEmail} onChange={setNotifEmail} label="Email notifications" sub="Case updates, appointment reminders"/>
            <Toggle value={notifSMS}   onChange={setNotifSMS}   label="SMS notifications"   sub="Urgent updates only"/>
            <Toggle value={notifDoc}   onChange={setNotifDoc}   label="Document reminders"  sub="When a document is missing or expiring"/>
            <Toggle value={notifAppt}  onChange={setNotifAppt}  label="Appointment reminders" sub="24 hours and 1 hour before"/>
            <Btn variant="navy" onClick={save} style={{ width:"100%", marginTop:14 }}>
              {saved ? "✓ Saved!" : "Save preferences"}
            </Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── ROOT CLIENT PORTAL ────────────────────────────────────────
export default function ClientPortal() {
  const [client, setClient] = useState(null);
  const [view, setView] = useState("home");

  // Count unread messages (from staff, after last client message)
  const unreadMessages = MOCK_MESSAGES.filter(m => m.from === "staff").length;

  if (!client) {
    return <LoginScreen onLogin={setClient}/>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Nunito+Sans:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito Sans', system-ui, sans-serif; background: #F6F8FD; color: #111827; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(27,58,122,0.18); border-radius: 20px; }
        input, select, button, textarea { font-family: inherit; }
      `}</style>
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <ClientNav
          view={view}
          onNav={setView}
          client={client}
          unreadMessages={unreadMessages}
          onLogout={() => setClient(null)}
        />
        <main style={{ flex:1, overflowY:"auto", padding:"1.5rem 2rem", minWidth:0 }}>
          {view === "home"         && <HomeView client={client} onNav={setView}/>}
          {view === "journey"      && <JourneyView client={client}/>}
          {view === "documents"    && <DocumentsView/>}
          {view === "appointments" && <AppointmentsView client={client}/>}
          {view === "messages"     && <MessagesView client={client}/>}
          {view === "settings"     && <SettingsView client={client}/>}
        </main>
      </div>
    </>
  );
}
