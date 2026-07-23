
import { useState, useEffect, useRef, useCallback } from "react";

// ── CLIENT PORTAL MODE ────────────────────────────────────────
// In production: route /client → ClientPortal, / → staff dashboard
// Here: toggle via a button in the staff nav for easy preview
let _ClientPortal = null;
try { _ClientPortal = require("./ClientPortal").default; } catch(_) {}

// ── BRAND TOKENS ──────────────────────────────────────────────
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
  cream:     "#F6F8FD",
  white:     "#FFFFFF",
  text:      "#111827",
  muted:     "#6B7794",
  border:    "rgba(27,58,122,0.11)",
  borderMd:  "rgba(27,58,122,0.18)",
  red:       "#DC2626",
  redPale:   "#FEF2F2",
};

// ── KNOWLEDGE BASE ────────────────────────────────────────────
const KB_SYSTEM = `You are the AI receptionist for BridgePath Group, an immigration consulting and document preparation service. You are Javid's professional AI executive assistant.

COMPANY INFO:
- Name: BridgePath Group
- Not a law firm, does not provide legal advice
- Services: document preparation, application packages, consultations, work permit prep, interview prep, referrals to licensed immigration attorneys
- Languages: English and Spanish
- Hours: Mon–Fri 9AM–6PM, Sat 10AM–2PM, Sun closed
- Service area: Maryland, Washington D.C., Virginia, nationwide virtual, international where appropriate
- Appointment types: Initial Consultation (60 min), Follow-up (30 min), Document Review (45 min), Translation Consultation (30 min)
- Appointment policy: 24hr notice to reschedule, fees non-refundable after service, missed without notice are forfeited

JOURNEY MILESTONES: Initial Contact → Consultation Scheduled → Consultation Completed → Client Intake Completed → Document Checklist Sent → Documents Received → Documents Reviewed → Application Prepared → Client Review → Application Submitted → Waiting for Government Updates → Biometrics Appointment → Interview Scheduled → Case Completed

INTAKE TO COLLECT: Full name, Phone, Email, Preferred language, Country of origin (optional), Type of assistance needed, Preferred appointment date, Virtual or in-person

STRICT RULES — NEVER:
- Claim to be an attorney
- Give legal advice
- Predict case outcomes
- Guarantee approvals
- Interpret immigration law for specific circumstances
- Estimate processing times

IF asked a legal question, respond: "That's a legal question that should be answered by a licensed immigration attorney. I can help schedule a consultation with our team, and if your matter requires legal representation, we can discuss a referral to an attorney."

IF asked about processing times: Direct to uscis.gov, never estimate.

TONE: Warm, professional, clear. Collect intake naturally over the conversation. Before ending, confirm: name, phone, reason for calling, agreed next steps.

Keep responses concise — 2-4 sentences max. This is a phone call simulation.`;

// ── DATA ──────────────────────────────────────────────────────
const INITIAL_CLIENTS = [
  { id:1, initials:"MC", name:"María Castellanos", type:"Work Permit · EAD", step:5, steps:14, color:T.teal, bgColor:T.tealLt, lang:"es", country:"Mexico", phone:"(301) 555-0192", email:"maria.c@email.com", status:"In progress" },
  { id:2, initials:"AI", name:"Ahmed Ibrahim",     type:"Green Card · Family-based", step:9, steps:14, color:T.goldDk, bgColor:T.goldPale, lang:"en", country:"Egypt", phone:"(202) 555-0847", email:"a.ibrahim@email.com", status:"App. submitted" },
  { id:3, initials:"SL", name:"Sofia Lima",        type:"Citizenship · Naturalization", step:11, steps:14, color:T.navy, bgColor:T.navyGhost, lang:"pt", country:"Brazil", phone:"(703) 555-0334", email:"sofia.l@email.com", status:"Interview soon" },
  { id:4, initials:"JP", name:"Jin-ho Park",       type:"Work Permit · H-1B Transfer", step:3, steps:14, color:"#7C3AED", bgColor:"#EDE9FE", lang:"ko", country:"South Korea", phone:"(301) 555-0571", email:"jh.park@email.com", status:"In progress" },
  { id:5, initials:"PN", name:"Priya Nair",        type:"Green Card · Employment-based", step:7, steps:14, color:T.red, bgColor:T.redPale, lang:"en", country:"India", phone:"(240) 555-0229", email:"priya.n@email.com", status:"Docs received" },
];

const MILESTONES = [
  "Initial contact","Consultation scheduled","Consultation completed","Client intake completed",
  "Document checklist sent","Documents received","Documents reviewed","Application prepared",
  "Client review","Application submitted","Waiting for government updates","Biometrics appointment","Interview scheduled","Case completed"
];

const APPOINTMENTS = [
  { id:1, clientId:1, day:"29", mon:"Jun", name:"María Castellanos", type:"Initial consultation", format:"Virtual", duration:"60 min", time:"10:30 AM" },
  { id:2, clientId:2, day:"29", mon:"Jun", name:"Ahmed Ibrahim",     type:"Document review",     format:"In-person", duration:"45 min", time:"1:00 PM" },
  { id:3, clientId:3, day:"29", mon:"Jun", name:"Sofia Lima",        type:"Follow-up",           format:"Virtual", duration:"30 min", time:"3:00 PM" },
  { id:4, clientId:4, day:"29", mon:"Jun", name:"Jin-ho Park",       type:"Translation consult", format:"Virtual", duration:"30 min", time:"4:30 PM" },
  { id:5, clientId:5, day:"30", mon:"Jun", name:"Priya Nair",        type:"Follow-up",           format:"Virtual", duration:"30 min", time:"11:00 AM" },
  { id:6, clientId:1, day:"1",  mon:"Jul", name:"María Castellanos", type:"Document review",     format:"Virtual", duration:"45 min", time:"2:00 PM" },
];

const CALL_LOG = [
  { id:1, initials:"MC", name:"María Castellanos", detail:"Work permit help · Initial consult booked 10:30 AM · Full intake collected", time:"9:14 AM", dur:"4 min", tag:"Booked", tagType:"success" },
  { id:2, initials:"AI", name:"Ahmed Ibrahim",     detail:'"Will my case be approved?" → legal Q escalated to Javid per safety protocol', time:"8:52 AM", dur:"6 min", tag:"Escalated", tagType:"legal" },
  { id:3, initials:"SL", name:"Sofia Lima",        detail:"Follow-up 3:00 PM confirmed · 24hr cancellation policy reminder sent", time:"8:31 AM", dur:"3 min", tag:"Confirmed", tagType:"success" },
  { id:4, initials:"?",  name:"New caller",        detail:'"How long does it take?" → referred to uscis.gov · No time estimates given', time:"8:05 AM", dur:"2 min", tag:"Info only", tagType:"info" },
];

// ── NOTIFICATIONS DATA ────────────────────────────────────────
const NOTIF_TYPES = {
  legal:    { color:"#DC2626", pale:"#FEF2F2",  icon:"⚖️",  label:"Legal escalation" },
  doc:      { color:"#C98E00", pale:"#FFF8E1",  icon:"📄",  label:"Document" },
  appt:     { color:"#1B3A7A", pale:"rgba(27,58,122,0.08)", icon:"📅", label:"Appointment" },
  milestone:{ color:"#1A8870", pale:"#D0F4EC",  icon:"🗺️",  label:"Journey update" },
  call:     { color:"#7C3AED", pale:"#EDE9FE",  icon:"📞",  label:"Call" },
  system:   { color:"#6B7794", pale:"#F3F4F6",  icon:"⚙️",  label:"System" },
};

const INITIAL_NOTIFICATIONS = [
  { id:1,  type:"legal",     read:false, pinned:true,  ts: new Date(Date.now()-8*60000),
    title:"Legal question flagged",
    body: "Ahmed Ibrahim asked whether his green card will be approved. AI escalated — review and follow up.",
    client:"Ahmed Ibrahim", clientId:2, action:"View client" },

  { id:2,  type:"doc",       read:false, pinned:false, ts: new Date(Date.now()-22*60000),
    title:"Document overdue — 3 items",
    body: "María Castellanos is missing her birth certificate, passport photos, and filing fee receipt. Application cannot proceed.",
    client:"María Castellanos", clientId:1, action:"Open BridgeVault™" },

  { id:3,  type:"appt",      read:false, pinned:false, ts: new Date(Date.now()-35*60000),
    title:"Appointment in 55 minutes",
    body: "Initial consultation with María Castellanos at 10:30 AM — virtual. Intake collected, no docs outstanding.",
    client:"María Castellanos", clientId:1, action:"View schedule" },

  { id:4,  type:"milestone", read:false, pinned:false, ts: new Date(Date.now()-2*3600000),
    title:"Sofia Lima — interview scheduled",
    body: "USCIS interview notice received. Journey Tracker advanced to Step 11. Interview prep session recommended.",
    client:"Sofia Lima", clientId:3, action:"View journey" },

  { id:5,  type:"call",      read:true,  pinned:false, ts: new Date(Date.now()-3*3600000),
    title:"4 calls handled this morning",
    body: "AI receptionist handled 4 inbound calls: 2 appointments booked, 1 escalated, 1 info-only.",
    client:null, clientId:null, action:"View call log" },

  { id:6,  type:"doc",       read:true,  pinned:false, ts: new Date(Date.now()-5*3600000),
    title:"Priya Nair — documents reviewed",
    body: "All 6 submitted documents have been reviewed and verified. Case can advance to Application Prepared.",
    client:"Priya Nair", clientId:5, action:"View client" },

  { id:7,  type:"appt",      read:true,  pinned:false, ts: new Date(Date.now()-24*3600000),
    title:"Jin-ho Park — consultation completed",
    body: "Follow-up notes added. H-1B transfer checklist sent. Next milestone: documents received.",
    client:"Jin-ho Park", clientId:4, action:"View client" },

  { id:8,  type:"system",    read:true,  pinned:false, ts: new Date(Date.now()-2*24*3600000),
    title:"Cal.com connected",
    body: "BridgePath calendar is live. New bookings will automatically advance client Journey Trackers.",
    client:null, clientId:null, action:null },
];

const VAULT_DOCS = {
  1: [
    { icon:"🛂", label:"Passport",        meta:"MX · Expires 2027",  status:"ok",   cat:"identity" },
    { icon:"📋", label:"I-94 record",     meta:"Uploaded Jun 20",    status:"ok",   cat:"identity" },
    { icon:"📄", label:"Visa document",   meta:"Uploaded Jun 22",    status:"ok",   cat:"identity" },
    { icon:"🪪", label:"Birth certificate",meta:"Missing · Required", status:"miss", cat:"identity" },
    { icon:"📝", label:"Form I-765",      meta:"Draft · In review",   status:"rev",  cat:"application" },
    { icon:"📸", label:"Photos (2×2)",    meta:"Missing · Required",  status:"miss", cat:"application" },
    { icon:"💳", label:"Filing fee receipt",meta:"Missing · Required",status:"miss", cat:"application" },
    { icon:"💼", label:"Employment auth", meta:"Uploaded Jun 25",     status:"ok",   cat:"application" },
  ]
};

// ── SHARED COMPONENTS ─────────────────────────────────────────
const css = (strings, ...vals) => strings.reduce((a,s,i) => a + s + (vals[i] ?? ""), "");

function Logo({ size = 1 }) {
  const w = 220 * size, h = 52 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 220 52" xmlns="http://www.w3.org/2000/svg" aria-label="BridgePath Group">
      {/* bridge arch */}
      <path d="M8 38 Q28 14 52 26 Q36 28 22 38Z" fill={T.navy}/>
      <path d="M52 26 Q76 12 96 38 Q82 34 68 38 Q60 32 52 26Z" fill={T.navy}/>
      <rect x="7" y="36" width="90" height="6" rx="2" fill={T.navy}/>
      <rect x="7" y="36" width="12" height="12" rx="2" fill={T.navy}/>
      <rect x="85" y="36" width="12" height="12" rx="2" fill={T.navy}/>
      {/* gold swoosh + arrow */}
      <path d="M16 40 Q40 20 68 14 Q84 10 100 4" stroke={T.gold} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <polygon points="100,4 91,2 93,11" fill={T.gold}/>
      {/* wordmark */}
      <text x="108" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill={T.navy}>Bridge</text>
      <text x="162" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill={T.gold} fontStyle="italic">Path</text>
      <text x="108" y="44" fontFamily="'Nunito Sans',system-ui" fontWeight="400" fontSize="10" fill={T.muted} letterSpacing="4">GROUP</text>
    </svg>
  );
}

function Tag({ type = "info", children }) {
  const styles = {
    success: { bg: T.tealLt,   color: T.teal  },
    legal:   { bg: "#FAECE7",  color: "#993C1D" },
    pending: { bg: T.goldPale, color: T.goldDk },
    info:    { bg: "#F3F4F6",  color: "#4B5563" },
    active:  { bg: T.tealLt,   color: T.teal  },
    navy:    { bg: T.navyGhost, color: T.navy  },
  };
  const s = styles[type] || styles.info;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:10.5, fontWeight:700,
      padding:"3px 9px", borderRadius:20, background:s.bg, color:s.color,
      fontFamily:"'Nunito Sans',sans-serif", whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function Btn({ variant="navy", onClick, children, style={} }) {
  const variants = {
    navy:  { background:T.navy,  color:"#fff", border:"none" },
    gold:  { background:T.gold,  color:T.navy, border:"none" },
    ghost: { background:"transparent", color:T.navy, border:`1px solid ${T.borderMd}` },
  };
  const [hover, setHover] = useState(false);
  const hoverStyle = hover ? (variant === "navy" ? { background:T.navyLt } : variant === "gold" ? { background:T.goldDk, color:"#fff" } : { background:T.navyGhost }) : {};
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
        borderRadius:9, fontFamily:"'Nunito Sans',sans-serif", fontSize:12.5, fontWeight:700,
        cursor:"pointer", transition:"all 0.13s", ...variants[variant], ...hoverStyle, ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
      padding:"1.1rem 1.25rem", boxShadow:`0 1px 12px rgba(27,58,122,0.07)`, ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, label, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.9rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:22, height:22, borderRadius:5, background:`rgba(27,58,122,0.08)`,
          display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, color:T.navy }}>
          {icon}
        </span>
        <span style={{ fontSize:13, fontWeight:700, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>{label}</span>
      </div>
      {right}
    </div>
  );
}

function StatCard({ label, value, delta, deltaType="up" }) {
  return (
    <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
      padding:"1rem 1.1rem", boxShadow:`0 1px 10px rgba(27,58,122,0.06)` }}>
      <div style={{ fontSize:10.5, color:T.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{value}</div>
      {delta && <div style={{ fontSize:11, marginTop:5, color: deltaType==="up" ? T.teal : T.goldDk }}>{delta}</div>}
    </div>
  );
}

function InitialsAvatar({ initials, bg, color, size=32 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.36, fontWeight:700, fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>
      {initials}
    </div>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background:"#E5E7EB", borderRadius:20, height:4, overflow:"hidden", marginTop:7 }}>
      <div style={{ background:color, height:"100%", width:`${pct}%`, borderRadius:20, transition:"width 0.4s ease" }}/>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.07em",
    color:T.goldDk, fontWeight:700, marginBottom:7, marginTop:10 }}>{children}</div>;
}

function Divider() {
  return <div style={{ height:1, background:T.border, margin:"10px 0" }}/>;
}

// ── PULSING DOT ───────────────────────────────────────────────
function PulseDot() {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:8, height:8 }}>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#4ADE80",
        animation:"bpPulse 2s ease-out infinite" }}/>
      <span style={{ width:8, height:8, borderRadius:"50%", background:"#4ADE80", position:"relative" }}/>
      <style>{`@keyframes bpPulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(2.2)}}`}</style>
    </span>
  );
}

// ── NOTIFICATION PANEL ───────────────────────────────────────
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)       return `${diff}s ago`;
  if (diff < 3600)     return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)    return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function NotificationBell({ notifications, onClick }) {
  const unread = notifications.filter(n => !n.read).length;
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position:"relative", width:34, height:34, borderRadius:9,
        background: hover ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
        border:"1px solid rgba(255,255,255,0.15)",
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", transition:"all 0.14s", flexShrink:0,
      }}
      aria-label={`Notifications — ${unread} unread`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {unread > 0 && (
        <span style={{
          position:"absolute", top:-5, right:-5,
          background:T.red, color:"#fff",
          width:17, height:17, borderRadius:"50%",
          fontSize:9.5, fontWeight:800, fontFamily:"'Nunito',sans-serif",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:`2px solid ${T.navy}`,
          lineHeight:1,
        }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

function NotificationPanel({ notifications, onDismiss, onMarkRead, onMarkAllRead, onClearAll, onClose }) {
  const [filter, setFilter] = useState("all");

  const unread  = notifications.filter(n => !n.read).length;
  const filters = [
    { key:"all",     label:"All" },
    { key:"unread",  label:`Unread (${unread})` },
    { key:"legal",   label:"Legal" },
    { key:"doc",     label:"Docs" },
    { key:"appt",    label:"Appts" },
  ];

  const visible = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "all")    return true;
    return n.type === filter;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, zIndex:199,
          background:"rgba(17,24,39,0.25)",
          backdropFilter:"blur(1px)",
          animation:"bpFadeIn 0.15s ease",
        }}
      />
      {/* Panel */}
      <div style={{
        position:"fixed", top:62, right:16, width:380,
        background:T.white, borderRadius:14,
        border:`1px solid ${T.border}`,
        boxShadow:"0 8px 40px rgba(27,58,122,0.18), 0 2px 8px rgba(27,58,122,0.08)",
        zIndex:200, overflow:"hidden",
        animation:"bpSlideDown 0.18s cubic-bezier(0.16,1,0.3,1)",
        maxHeight:"calc(100vh - 80px)", display:"flex", flexDirection:"column",
      }}>
        <style>{`
          @keyframes bpFadeIn { from{opacity:0} to{opacity:1} }
          @keyframes bpSlideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* Header */}
        <div style={{
          padding:"14px 16px 10px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0,
        }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>
              Notifications
            </div>
            <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {unread > 0 && (
              <button onClick={onMarkAllRead}
                style={{ fontSize:11, color:T.navy, fontWeight:600, background:"none",
                  border:"none", cursor:"pointer", padding:"4px 8px", borderRadius:6,
                  fontFamily:"'Nunito Sans',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = T.navyGhost}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                Mark all read
              </button>
            )}
            <button onClick={onClose}
              style={{ width:26, height:26, borderRadius:7, background:T.cream,
                border:`1px solid ${T.border}`, cursor:"pointer", fontSize:14,
                display:"flex", alignItems:"center", justifyContent:"center", color:T.muted,
                fontFamily:"'Nunito Sans',sans-serif" }}>
              ×
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{
          display:"flex", gap:2, padding:"8px 12px",
          borderBottom:`1px solid ${T.border}`, flexShrink:0,
          overflowX:"auto",
        }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding:"4px 11px", borderRadius:20, fontSize:11, fontWeight: filter===f.key ? 700 : 400,
                cursor:"pointer", border:"none", whiteSpace:"nowrap",
                fontFamily:"'Nunito Sans',sans-serif", transition:"all 0.13s",
                background: filter===f.key ? T.navy : T.cream,
                color: filter===f.key ? "#fff" : T.muted,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div style={{ overflowY:"auto", flex:1 }}>
          {visible.length === 0 ? (
            <div style={{ textAlign:"center", padding:"2.5rem 1rem", color:T.muted }}>
              <div style={{ fontSize:30, marginBottom:8 }}>🔔</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.navy }}>All clear</div>
              <div style={{ fontSize:12, marginTop:4 }}>No notifications in this category</div>
            </div>
          ) : (
            visible.map((n, i) => {
              const nt = NOTIF_TYPES[n.type];
              return (
                <div key={n.id}
                  onClick={() => !n.read && onMarkRead(n.id)}
                  style={{
                    display:"flex", gap:11, padding:"12px 16px",
                    borderBottom: i < visible.length-1 ? `1px solid ${T.border}` : "none",
                    background: n.read ? T.white : `rgba(27,58,122,0.03)`,
                    cursor: n.read ? "default" : "pointer",
                    transition:"background 0.13s", position:"relative",
                  }}
                  onMouseEnter={e => { if(!n.read) e.currentTarget.style.background = T.navyGhost; }}
                  onMouseLeave={e => { if(!n.read) e.currentTarget.style.background = "rgba(27,58,122,0.03)"; }}
                >
                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{
                      position:"absolute", left:5, top:"50%", transform:"translateY(-50%)",
                      width:5, height:5, borderRadius:"50%", background:T.navy,
                    }}/>
                  )}

                  {/* Type icon */}
                  <div style={{
                    width:32, height:32, borderRadius:9, flexShrink:0,
                    background: nt.pale, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:15, marginTop:1,
                  }}>
                    {nt.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6 }}>
                      <div style={{ fontSize:12.5, fontWeight: n.read ? 500 : 700, color:T.text, lineHeight:1.3 }}>
                        {n.title}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
                        style={{
                          flexShrink:0, width:20, height:20, borderRadius:5,
                          background:"none", border:"none", cursor:"pointer",
                          color:T.muted, fontSize:13, display:"flex",
                          alignItems:"center", justifyContent:"center",
                          opacity:0, transition:"opacity 0.13s",
                        }}
                        className="notif-dismiss"
                        onMouseEnter={e => { e.currentTarget.style.background = T.cream; e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ fontSize:11.5, color:T.muted, marginTop:3, lineHeight:1.5 }}>
                      {n.body}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                      <span style={{
                        fontSize:10, color:nt.color, fontWeight:700,
                        background:nt.pale, padding:"2px 7px", borderRadius:10,
                        textTransform:"uppercase", letterSpacing:"0.04em",
                      }}>
                        {nt.label}
                      </span>
                      {n.client && (
                        <span style={{ fontSize:10.5, color:T.muted }}>
                          {n.client}
                        </span>
                      )}
                      <span style={{ fontSize:10.5, color:T.muted, marginLeft:"auto" }}>
                        {timeAgo(n.ts)}
                      </span>
                    </div>
                    {n.action && (
                      <button
                        onClick={e => e.stopPropagation()}
                        style={{
                          marginTop:7, fontSize:11, fontWeight:700, color:T.navy,
                          background:T.navyGhost, border:"none", borderRadius:6,
                          padding:"3px 10px", cursor:"pointer",
                          fontFamily:"'Nunito Sans',sans-serif", transition:"all 0.13s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.navy; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = T.navyGhost; e.currentTarget.style.color = T.navy; }}
                      >
                        {n.action} →
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div style={{
            padding:"10px 16px", borderTop:`1px solid ${T.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center",
            flexShrink:0, background:T.cream,
          }}>
            <span style={{ fontSize:11, color:T.muted }}>{notifications.length} total notifications</span>
            <button onClick={onClearAll}
              style={{ fontSize:11, color:T.muted, background:"none", border:"none",
                cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif", padding:"2px 6px" }}
              onMouseEnter={e => e.currentTarget.style.color = T.red}
              onMouseLeave={e => e.currentTarget.style.color = T.muted}>
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── CALL ITEM ─────────────────────────────────────────────────
function CallItem({ initials, name, detail, time, dur, tag, tagType, bg, color }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:9,
        border:`1px solid ${T.border}`, background: hover ? T.navyGhost : T.cream,
        cursor:"pointer", transition:"background 0.13s" }}>
      <InitialsAvatar initials={initials} bg={bg || T.tealLt} color={color || T.teal} size={32}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12.5, fontWeight:600, color:T.text }}>{name}</div>
        <div style={{ fontSize:11, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{detail}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:10.5, color:T.muted }}>{time}{dur ? ` · ${dur}` : ""}</div>
        <div style={{ marginTop:3 }}><Tag type={tagType}>{tag}</Tag></div>
      </div>
    </div>
  );
}

// ── APPT ITEM ─────────────────────────────────────────────────
function ApptItem({ day, mon, name, type, format, duration, time }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 11px", borderRadius:9,
        border:`1px solid ${T.border}`, cursor:"pointer", transition:"background 0.13s",
        background: hover ? T.navyGhost : T.white }}>
      <div style={{ width:40, background:T.navy, color:"#fff", borderRadius:9, textAlign:"center", padding:"5px 3px", flexShrink:0 }}>
        <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{day}</div>
        <div style={{ fontSize:8.5, textTransform:"uppercase", letterSpacing:"0.06em", color:T.goldLt }}>{mon}</div>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12.5, fontWeight:600, color:T.text }}>{name}</div>
        <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{type} · {format} · {duration}</div>
      </div>
      <div style={{ fontSize:12.5, fontWeight:700, color:T.navy, flexShrink:0 }}>{time}</div>
    </div>
  );
}

// ── JOURNEY MILESTONE LIST ────────────────────────────────────
function MilestoneList({ currentStep, compact = false }) {
  const visible = compact ? MILESTONES.slice(0, Math.min(currentStep + 3, MILESTONES.length)) : MILESTONES;
  return (
    <div>
      {visible.map((m, i) => {
        const done = i < currentStep - 1;
        const now  = i === currentStep - 1;
        const future = i > currentStep - 1;
        return (
          <div key={i} style={{ display:"flex", gap:9, alignItems:"flex-start", marginBottom:9, position:"relative" }}>
            {i < visible.length - 1 && (
              <div style={{ position:"absolute", left:9, top:21, width:1, height:"calc(100% - 4px)",
                background: done ? T.teal : T.border }}/>
            )}
            <div style={{ width:19, height:19, borderRadius:"50%", flexShrink:0, zIndex:1, position:"relative",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:9.5,
              background: done ? T.teal : now ? T.navy : "#E5E7EB",
              color: done ? "#fff" : now ? T.gold : "#9CA3AF",
              border: now ? `2px solid ${T.gold}` : "none",
              fontWeight: now ? 800 : 400 }}>
              {done ? "✓" : i + 1}
            </div>
            <div style={{ fontSize:11.5, paddingTop:1,
              color: done ? T.muted : now ? T.navy : "#9CA3AF",
              fontWeight: now ? 700 : 400 }}>
              {m}{now ? " ← now" : ""}
            </div>
          </div>
        );
      })}
      {compact && currentStep < MILESTONES.length && (
        <div style={{ fontSize:11, color:T.muted, marginLeft:28, marginTop:4 }}>
          +{MILESTONES.length - visible.length} more milestones remaining
        </div>
      )}
    </div>
  );
}

// ── AI RECEPTIONIST CHAT (LIVE CLAUDE API) ────────────────────
function ReceptionistChat() {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Thank you for calling BridgePath Group. I'm Javid's AI assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("en");
  const [intakeData, setIntakeData] = useState({ name:"", phone:"", email:"", language:"English", service:"", format:"Virtual" });
  const [callLog, setCallLog] = useState([...CALL_LOG]);
  const [newCallCount, setNewCallCount] = useState(0);
  const msgRef = useRef(null);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messages]);

  const switchLang = (l) => {
    setLang(l);
    const greeting = l === "es"
      ? "Gracias por llamar a BridgePath Group. Soy el asistente de IA de Javid. ¿En qué le puedo ayudar hoy?"
      : "Thank you for calling BridgePath Group. I'm Javid's AI assistant. How can I help you today?";
    setMessages([{ role:"assistant", content: greeting }]);
  };

  const extractIntake = (text) => {
    const lower = text.toLowerCase();
    const nameMatch = text.match(/(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+ [A-Z][a-z]+)/i);
    const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    setIntakeData(prev => ({
      ...prev,
      ...(nameMatch ? { name: nameMatch[1] } : {}),
      ...(phoneMatch ? { phone: phoneMatch[0] } : {}),
      ...(emailMatch ? { email: emailMatch[0] } : {}),
    }));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    extractIntake(text);
    const userMsg = { role:"user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1000,
          system: KB_SYSTEM + (lang === "es" ? "\n\nRespond in Spanish for this call." : ""),
          messages: apiMessages,
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "I'm sorry, I didn't catch that. Could you repeat that?";
      setMessages(prev => [...prev, { role:"assistant", content: reply }]);
      // Auto-log call summary if conversation is long enough
      if (newMessages.length >= 5 && newMessages.length % 4 === 1) {
        setNewCallCount(c => c + 1);
      }
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"I'm having a brief technical difficulty. Please hold one moment while I reconnect." }]);
    } finally {
      setLoading(false);
    }
  };

  const endCall = () => {
    const summary = intakeData.name
      ? `${intakeData.name} — ${intakeData.service || "General inquiry"} · ${messages.length} exchanges`
      : `New caller — ${messages.length} exchanges`;
    const newEntry = {
      id: Date.now(), initials: intakeData.name ? intakeData.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() : "?",
      name: intakeData.name || "New caller", detail: summary,
      time: new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),
      dur: `${Math.ceil(messages.length * 0.5)} min`, tag:"Logged", tagType:"navy",
    };
    setCallLog(prev => [newEntry, ...prev]);
    setMessages([{ role:"assistant", content: lang === "es"
      ? "Gracias por llamar a BridgePath Group. ¿Hay algo más en lo que pueda ayudarle hoy?"
      : "Thank you for calling BridgePath Group. Is there anything else I can help you with today?" }]);
    setIntakeData({ name:"", phone:"", email:"", language:"English", service:"", format:"Virtual" });
    setNewCallCount(0);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
      {/* Live chat */}
      <Card>
        <CardHeader icon="🤖" label="Live AI receptionist"
          right={<div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <PulseDot/><span style={{ fontSize:11, color:T.teal, fontWeight:700 }}>Active</span>
          </div>}/>
        {/* Lang toggle */}
        <div style={{ display:"flex", gap:2, marginBottom:10, background:`rgba(27,58,122,0.06)`,
          borderRadius:9, padding:3 }}>
          {["en","es"].map(l => (
            <button key={l} onClick={() => switchLang(l)}
              style={{ flex:1, textAlign:"center", padding:"5px", borderRadius:7,
                fontSize:12, fontWeight: lang===l ? 700 : 400, cursor:"pointer",
                border:"none", fontFamily:"'Nunito Sans',sans-serif",
                background: lang===l ? T.white : "transparent",
                color: lang===l ? T.navy : T.muted,
                boxShadow: lang===l ? "0 1px 4px rgba(27,58,122,0.10)" : "none",
                transition:"all 0.13s" }}>
              {l === "en" ? "🇺🇸 English" : "🇲🇽 Español"}
            </button>
          ))}
        </div>
        {/* Messages */}
        <div ref={msgRef} style={{ display:"flex", flexDirection:"column", gap:8,
          maxHeight:280, overflowY:"auto", marginBottom:10, scrollBehavior:"smooth" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-end",
              flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0,
                background: m.role === "user" ? T.gold : T.navy, display:"flex",
                alignItems:"center", justifyContent:"center",
                fontSize:10, fontWeight:700, color: m.role === "user" ? T.navy : T.gold }}>
                {m.role === "user" ? "C" : "AI"}
              </div>
              <div style={{ maxWidth:"80%", padding:"8px 12px", fontSize:12, lineHeight:1.55,
                borderRadius:12, fontFamily:"'Nunito Sans',sans-serif",
                borderBottomLeftRadius: m.role !== "user" ? 3 : 12,
                borderBottomRightRadius: m.role === "user" ? 3 : 12,
                background: m.role === "user" ? T.navy : T.cream,
                color: m.role === "user" ? "#fff" : T.text,
                border: m.role !== "user" ? `1px solid ${T.border}` : "none" }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", gap:7, alignItems:"flex-end" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:T.navy,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:T.gold }}>AI</div>
              <div style={{ padding:"10px 14px", borderRadius:"12px 12px 12px 3px",
                background:T.cream, border:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  {[0,1,2].map(j => (
                    <span key={j} style={{ width:6, height:6, borderRadius:"50%", background:T.muted,
                      animation:`bpDot 1.2s ${j*0.2}s ease-in-out infinite` }}/>
                  ))}
                </div>
                <style>{`@keyframes bpDot{0%,80%,100%{opacity:.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
              </div>
            </div>
          )}
        </div>
        {/* Input */}
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"7px 10px",
          border:`1px solid ${T.borderMd}`, borderRadius:10, background:T.cream }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Type caller message…"
            style={{ flex:1, border:"none", background:"transparent", fontFamily:"'Nunito Sans',sans-serif",
              fontSize:12.5, color:T.text, outline:"none" }}/>
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            style={{ width:30, height:30, borderRadius:8, background: input.trim() ? T.navy : "#E5E7EB",
              color: input.trim() ? T.gold : T.muted, border:"none", cursor: input.trim() ? "pointer" : "default",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, transition:"all 0.13s" }}>
            ↑
          </button>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          <Btn variant="ghost" onClick={endCall} style={{ flex:1, justifyContent:"center", fontSize:11.5 }}>
            📋 End call &amp; log
          </Btn>
          <Btn variant="ghost" onClick={() => switchLang(lang)} style={{ fontSize:11.5 }}>
            🔄 Reset
          </Btn>
        </div>
        <div style={{ marginTop:8, fontSize:10, color:T.muted, lineHeight:1.5 }}>
          Try: "I need a work permit", "will my case be approved?", "¿hablas español?", "how long does it take?"
        </div>
      </Card>

      {/* Intake capture */}
      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
        <Card>
          <CardHeader icon="📋" label="Caller intake — auto-filled"
            right={<Tag type={intakeData.name ? "success" : "info"}>{intakeData.name ? "Captured" : "Listening…"}</Tag>}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { label:"Full name",  key:"name",    placeholder:"Collected from call" },
              { label:"Phone",      key:"phone",   placeholder:"Collected from call" },
              { label:"Email",      key:"email",   placeholder:"Collected from call" },
              { label:"Language",   key:"language", placeholder:"English" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase",
                  letterSpacing:"0.05em", marginBottom:4 }}>{label}</div>
                <input value={intakeData[key]} onChange={e => setIntakeData(p => ({...p,[key]:e.target.value}))}
                  placeholder={placeholder}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8,
                    border:`1px solid ${intakeData[key] ? T.teal : T.borderMd}`,
                    background: intakeData[key] ? T.tealLt : T.cream,
                    fontFamily:"'Nunito Sans',sans-serif", fontSize:12.5, color:T.text, outline:"none",
                    transition:"all 0.2s" }}/>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Service needed</div>
              <select value={intakeData.service} onChange={e => setIntakeData(p => ({...p, service:e.target.value}))}
                style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${T.borderMd}`,
                  background:T.cream, fontFamily:"'Nunito Sans',sans-serif", fontSize:12.5, color:T.text, outline:"none" }}>
                <option value="">Select…</option>
                <option>Work permit (EAD)</option><option>Green card</option><option>Citizenship</option>
                <option>Family petition</option><option>Document review</option><option>Other</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Format</div>
              <select value={intakeData.format} onChange={e => setIntakeData(p => ({...p, format:e.target.value}))}
                style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${T.borderMd}`,
                  background:T.cream, fontFamily:"'Nunito Sans',sans-serif", fontSize:12.5, color:T.text, outline:"none" }}>
                <option>Virtual</option><option>In-person</option>
              </select>
            </div>
          </div>
          <Btn variant="gold" onClick={endCall} style={{ width:"100%", justifyContent:"center", marginTop:12 }}>
            ✓ Confirm &amp; book appointment
          </Btn>
        </Card>
        {/* AI Safety */}
        <Card>
          <div style={{ background:T.goldPale, borderLeft:`3px solid ${T.gold}`, borderRadius:"0 8px 8px 0",
            padding:"9px 13px", fontSize:11.5, color:T.text, lineHeight:1.65 }}>
            <strong>AI safety protocol active.</strong> The receptionist never claims to be an attorney, never predicts case outcomes, never guarantees approvals, and never estimates processing times. Legal questions are escalated to Javid. All calls are logged.
          </div>
        </Card>
      </div>

      {/* Call log — full width */}
      <div style={{ gridColumn:"1/-1" }}>
        <Card>
          <CardHeader icon="📞" label="Today's call log"
            right={<span style={{ fontSize:11, color:T.muted }}>{callLog.length} calls handled</span>}/>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {callLog.map((c, i) => (
              <CallItem key={c.id || i} {...c}
                bg={i===0 ? T.tealLt : i===1 ? T.goldPale : i===2 ? T.navyGhost : "#FAECE7"}
                color={i===0 ? T.teal : i===1 ? T.goldDk : i===2 ? T.navy : "#993C1D"}/>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ onNav, clients, appointments, notifications = [], onMarkRead, onDismiss }) {
  const todayAppts = appointments.filter(a => a.day === "29" && a.mon === "Jun");
  const urgent = notifications.filter(n => !n.read && (n.type === "legal" || n.type === "doc")).slice(0, 3);
  const unreadCount = notifications.filter(n => !n.read).length;
  return (
    <div>
      {/* Mission banner */}
      <div style={{ background:T.navy, borderRadius:12, padding:"1rem 1.4rem", marginBottom:"1.25rem",
        display:"flex", alignItems:"center", gap:"1rem", borderLeft:`4px solid ${T.gold}` }}>
        <span style={{ fontSize:22, flexShrink:0 }}>🧭</span>
        <span style={{ fontSize:13, color:"rgba(255,255,255,0.82)", lineHeight:1.5, fontStyle:"italic", fontFamily:"'Nunito',sans-serif" }}>
          Helping immigrants navigate the process with{" "}
          <strong style={{ color:T.goldLt, fontStyle:"normal" }}>organization, education, and confidence</strong>
          {" "}— BridgePath Group · MD · DC · VA · Nationwide
        </span>
      </div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.1rem" }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>Good morning, Javid</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Monday, June 29 · {todayAppts.length} appointments today · AI receptionist active</div>
        </div>
        <Btn variant="navy" onClick={() => onNav("receptionist")}>📞 View live calls</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:"1.1rem" }}>
        <StatCard label="Active clients" value="47" delta="↑ 6 this month"/>
        <StatCard label="Calls this week" value="23" delta="↑ 4 vs last week"/>
        <StatCard label="Docs pending" value="11" delta="3 overdue" deltaType="warn"/>
        <StatCard label="Today's appts" value={todayAppts.length} delta="Next at 10:30 AM"/>
      </div>

      {/* Notifications strip — only shows if unread items exist */}
      {unreadCount > 0 && (
        <Card style={{ marginBottom:"1rem", padding:"0.85rem 1.1rem" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:22, height:22, borderRadius:5, background:T.navyGhost,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🔔</div>
              <span style={{ fontSize:13, fontWeight:700, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>
                Action required
              </span>
              <span style={{ fontSize:10.5, fontWeight:700, background:T.red, color:"#fff",
                padding:"2px 7px", borderRadius:20 }}>
                {unreadCount}
              </span>
            </div>
            <button
              onClick={() => notifications.forEach(n => !n.read && onMarkRead(n.id))}
              style={{ fontSize:11.5, color:T.navy, fontWeight:600, background:"none",
                border:"none", cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
              Mark all read
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {notifications.filter(n => !n.read).slice(0, 4).map(n => {
              const nt = NOTIF_TYPES[n.type];
              return (
                <div key={n.id}
                  style={{
                    display:"flex", alignItems:"flex-start", gap:10,
                    padding:"9px 11px", borderRadius:9,
                    background: nt.pale,
                    border:`1px solid ${nt.color}22`,
                    cursor:"pointer", transition:"opacity 0.13s",
                  }}
                  onClick={() => onMarkRead(n.id)}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{nt.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:T.text }}>{n.title}</div>
                    <div style={{ fontSize:11.5, color:T.muted, marginTop:2, lineHeight:1.45,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {n.body}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
                    <span style={{ fontSize:10.5, color:T.muted }}>{timeAgo(n.ts)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
                      style={{ width:20, height:20, borderRadius:5, background:"rgba(255,255,255,0.6)",
                        border:"none", cursor:"pointer", fontSize:13, color:T.muted,
                        display:"flex", alignItems:"center", justifyContent:"center" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = T.red; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.6)"; e.currentTarget.style.color = T.muted; }}
                    >×</button>
                  </div>
                </div>
              );
            })}
            {unreadCount > 4 && (
              <div style={{ textAlign:"center", fontSize:12, color:T.muted, paddingTop:2 }}>
                +{unreadCount - 4} more — open the bell to see all
              </div>
            )}
          </div>
        </Card>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
        {/* Receptionist feed */}
        <Card>
          <CardHeader icon="🤖" label="AI Receptionist"
            right={<div style={{ display:"flex", alignItems:"center", gap:5 }}><PulseDot/><Tag type="active">Live</Tag></div>}/>
          <SectionLabel>Recent calls</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {CALL_LOG.slice(0,3).map((c,i) => (
              <CallItem key={c.id} {...c}
                bg={[T.tealLt, T.goldPale, T.navyGhost][i]}
                color={[T.teal, T.goldDk, T.navy][i]}/>
            ))}
          </div>
          <Btn variant="ghost" onClick={() => onNav("receptionist")} style={{ width:"100%", justifyContent:"center", marginTop:10, fontSize:12 }}>
            View all calls →
          </Btn>
        </Card>
        {/* Journey tracker */}
        <Card>
          <CardHeader icon="🗺️" label="Journey tracker"
            right={<span style={{ fontSize:11.5, color:T.goldDk, fontWeight:700 }}>Step {clients[0].step} of {clients[0].steps}</span>}/>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
            <InitialsAvatar initials={clients[0].initials} bg={T.gold} color={T.navy} size={36}/>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>{clients[0].name}</div>
              <div style={{ fontSize:11, color:T.muted }}>{clients[0].type}</div>
            </div>
          </div>
          <MilestoneList currentStep={clients[0].step} compact/>
        </Card>
      </div>
      {/* Today's appointments */}
      <Card>
        <CardHeader icon="📅" label="Today's appointments"
          right={<Btn variant="ghost" onClick={() => onNav("schedule")} style={{ fontSize:11.5, padding:"4px 10px" }}>View schedule</Btn>}/>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {todayAppts.map(a => <ApptItem key={a.id} {...a}/>)}
        </div>
      </Card>
    </div>
  );
}

// ── CLIENTS VIEW ──────────────────────────────────────────────
function ClientsView({ clients, onSelectClient }) {
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.1rem" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>Client portal</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>47 active clients · MD · DC · VA · Nationwide virtual</div>
        </div>
        <Btn variant="navy">+ Add client</Btn>
      </div>
      <div style={{ marginBottom:"1rem" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search clients by name or case type…"
          style={{ width:"100%", padding:"9px 13px", borderRadius:9, border:`1px solid ${T.borderMd}`,
            background:T.white, fontFamily:"'Nunito Sans',sans-serif", fontSize:13, color:T.text, outline:"none",
            boxShadow:`0 1px 4px rgba(27,58,122,0.06)` }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem", marginBottom:"1rem" }}>
        {filtered.map(c => {
          const pct = Math.round((c.step / c.steps) * 100);
          return (
            <div key={c.id} onClick={() => onSelectClient(c)}
              style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
                padding:"1rem", boxShadow:`0 1px 10px rgba(27,58,122,0.06)`,
                cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.navyLt}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:9 }}>
                <InitialsAvatar initials={c.initials} bg={c.bgColor} color={c.color} size={36}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>{c.name}</div>
                  <div style={{ fontSize:11, color:T.muted }}>{c.type}</div>
                </div>
              </div>
              <Divider/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <span style={{ fontSize:11, color:T.muted }}>Step {c.step} of {c.steps} · {pct}%</span>
                <Tag type={c.step >= 13 ? "success" : c.step >= 9 ? "pending" : "navy"}>{c.status}</Tag>
              </div>
              <ProgressBar pct={pct} color={c.color}/>
            </div>
          );
        })}
      </div>
      <Card>
        <CardHeader icon="🛡️" label="AI safety commitment"/>
        <div style={{ background:T.goldPale, borderLeft:`3px solid ${T.gold}`, borderRadius:"0 8px 8px 0",
          padding:"10px 14px", fontSize:12, color:T.text, lineHeight:1.7 }}>
          BridgePath Group is an immigration consulting and document preparation service.{" "}
          <strong>We are not a law firm</strong> and do not provide legal advice, predict case outcomes,
          guarantee approvals, or interpret immigration law for specific circumstances. When callers ask
          legal questions, our AI receptionist directs them to a licensed immigration attorney. All calls
          are summarized and reviewed by Javid's team.
        </div>
      </Card>
    </div>
  );
}

// ── CLIENT DETAIL VIEW ────────────────────────────────────────
function ClientDetail({ client, onBack }) {
  const docs = VAULT_DOCS[client.id] || [];
  const statusColors = { ok:{ bg:T.tealLt, color:T.teal, label:"Verified" }, rev:{ bg:T.goldPale, color:T.goldDk, label:"In review" }, miss:{ bg:"#F3F4F6", color:T.muted, label:"Missing" } };
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.1rem" }}>
        <Btn variant="ghost" onClick={onBack} style={{ fontSize:12 }}>← Back</Btn>
        <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>{client.name}</div>
        <Tag type="navy">{client.type}</Tag>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
        <Card>
          <CardHeader icon="🗺️" label="Journey tracker"
            right={<span style={{ fontSize:11.5, color:T.goldDk, fontWeight:700 }}>Step {client.step} of {client.steps}</span>}/>
          <ProgressBar pct={Math.round(client.step/client.steps*100)} color={client.color}/>
          <div style={{ fontSize:11, color:T.muted, marginTop:5, marginBottom:12 }}>
            {Math.round(client.step/client.steps*100)}% complete
          </div>
          <MilestoneList currentStep={client.step}/>
        </Card>
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <Card>
            <CardHeader icon="👤" label="Client info"/>
            {[["Phone", client.phone], ["Email", client.email], ["Language", client.lang === "es" ? "Spanish" : client.lang === "pt" ? "Portuguese" : client.lang === "ko" ? "Korean" : "English"], ["Country of origin", client.country]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0",
                borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                <span style={{ color:T.muted }}>{k}</span>
                <span style={{ fontWeight:600, color:T.text }}>{v}</span>
              </div>
            ))}
          </Card>
          {docs.length > 0 && (
            <Card>
              <CardHeader icon="🗂️" label="BridgeVault™ snapshot"
                right={<span style={{ fontSize:11, color:T.muted }}>{docs.filter(d=>d.status==="ok").length}/{docs.length} uploaded</span>}/>
              {docs.map((d,i) => {
                const s = statusColors[d.status];
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 0",
                    borderBottom: i < docs.length-1 ? `1px solid ${T.border}` : "none" }}>
                    <span style={{ fontSize:14 }}>{d.icon}</span>
                    <span style={{ flex:1, fontSize:12, color:T.text }}>{d.label}</span>
                    <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:12, background:s.bg, color:s.color, fontWeight:600 }}>{s.label}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BRIDGEVAULT VIEW ──────────────────────────────────────────
function VaultView({ clients }) {
  const [selectedClient, setSelectedClient] = useState(clients[0]);
  const docs = VAULT_DOCS[selectedClient.id] || [];
  const identity = docs.filter(d => d.cat === "identity");
  const application = docs.filter(d => d.cat === "application");
  const statusStyle = { ok:{ bg:T.tealLt, dot:T.teal }, rev:{ bg:T.goldPale, dot:T.gold }, miss:{ bg:"#F3F4F6", dot:"#D1D5DB" } };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.1rem" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>BridgeVault™</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Secure document storage · End-to-end encrypted</div>
        </div>
        <Btn variant="gold">↑ Upload document</Btn>
      </div>
      {/* Client selector */}
      <Card style={{ marginBottom:"1rem" }}>
        <CardHeader icon="👤" label="Select client"/>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {clients.map(c => (
            <button key={c.id} onClick={() => setSelectedClient(c)}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 12px", borderRadius:20,
                border:`1.5px solid ${selectedClient.id === c.id ? T.navy : T.border}`,
                background: selectedClient.id === c.id ? T.navyGhost : T.cream,
                cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif", fontSize:12,
                fontWeight: selectedClient.id === c.id ? 700 : 400, color:T.navy, transition:"all 0.13s" }}>
              <InitialsAvatar initials={c.initials} bg={c.bgColor} color={c.color} size={20}/>
              {c.name}
            </button>
          ))}
        </div>
      </Card>
      {docs.length > 0 ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          {[["🪪 Identity documents", identity], ["📝 Application documents", application]].map(([title, docList]) => (
            <Card key={title}>
              <CardHeader icon={title.split(" ")[0]} label={title.slice(3)}
                right={<span style={{ fontSize:11, color:T.muted }}>{docList.filter(d=>d.status==="ok").length} of {docList.length} uploaded</span>}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                {docList.map((d,i) => {
                  const s = statusStyle[d.status];
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                      borderRadius:9, border:`1px solid ${T.border}`, background:s.bg, cursor:"pointer",
                      transition:"opacity 0.13s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                      <span style={{ fontSize:16 }}>{d.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11.5, fontWeight:600, color:T.text }}>{d.label}</div>
                        <div style={{ fontSize:10, color:T.muted, marginTop:1 }}>{d.meta}</div>
                      </div>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:s.dot, flexShrink:0,
                        border: d.status === "miss" ? `1px solid #D1D5DB` : "none" }}/>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div style={{ textAlign:"center", padding:"2rem", color:T.muted }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
            <div style={{ fontWeight:600, color:T.navy }}>No documents yet</div>
            <div style={{ fontSize:12, marginTop:4 }}>Upload documents to start building this client's vault</div>
          </div>
        </Card>
      )}
      <Card style={{ marginTop:"1rem" }}>
        <CardHeader icon="⬤" label="Document status key"/>
        <div style={{ display:"flex", gap:24, fontSize:12, color:T.text }}>
          {[["ok",T.teal,"Uploaded & verified"], ["rev",T.gold,"Uploaded · pending review"], ["miss","#D1D5DB","Required · not yet uploaded"]].map(([type,dot,label]) => (
            <div key={type} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:dot, border: type==="miss" ? `1px solid #D1D5DB` : "none" }}/>
              {label}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── SCHEDULE VIEW ─────────────────────────────────────────────
function ScheduleView({ appointments }) {
  const [filter, setFilter] = useState("All");
  const formats = ["All","Virtual","In-person"];
  const filtered = filter === "All" ? appointments : appointments.filter(a => a.format === filter);
  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.1rem" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>Schedule</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Mon–Fri 9 AM–6 PM · Sat 10 AM–2 PM · Sun closed</div>
        </div>
        <Btn variant="gold">+ Book appointment</Btn>
      </div>
      {/* Filter */}
      <div style={{ display:"flex", gap:2, marginBottom:"1rem", background:`rgba(27,58,122,0.06)`,
        borderRadius:9, padding:3, width:"fit-content" }}>
        {formats.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:"5px 16px", borderRadius:7, fontSize:12, fontWeight: filter===f ? 700 : 400,
              cursor:"pointer", border:"none", fontFamily:"'Nunito Sans',sans-serif",
              background: filter===f ? T.white : "transparent",
              color: filter===f ? T.navy : T.muted,
              boxShadow: filter===f ? "0 1px 4px rgba(27,58,122,0.10)" : "none",
              transition:"all 0.13s" }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <Card>
          <CardHeader icon="📅" label="Upcoming appointments" right={<span style={{ fontSize:11, color:T.muted }}>{filtered.length} appointments</span>}/>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {filtered.map(a => <ApptItem key={a.id} {...a}/>)}
          </div>
        </Card>
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <Card>
            <CardHeader icon="⏱️" label="Appointment types"/>
            {[["Initial consultation","60 min"],["Follow-up consultation","30 min"],["Document review","45 min"],["Translation consultation","30 min"]].map(([name,dur]) => (
              <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 11px", borderRadius:9, border:`1px solid ${T.border}`, background:T.cream,
                marginBottom:7 }}>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:T.navy }}>{name}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Virtual or in-person</div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:T.goldDk }}>{dur}</span>
              </div>
            ))}
          </Card>
          <Card>
            <CardHeader icon="📋" label="Appointment policy"/>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {["Rescheduling requires at least 24 hours' notice","Consultation fees are non-refundable after services have been provided","Missed appointments without prior notice are forfeited"].map((p,i) => (
                <div key={i} style={{ display:"flex", gap:8, fontSize:12, color:T.text }}>
                  <span style={{ color:T.gold, fontWeight:700, flexShrink:0 }}>→</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── NAV BAR ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { key:"dashboard",    label:"Dashboard" },
  { key:"receptionist", label:"AI Receptionist" },
  { key:"clients",      label:"Clients" },
  { key:"vault",        label:"BridgeVault™" },
  { key:"schedule",     label:"Schedule" },
];

function NavBar({ active, onNav, notifications = [], notifOpen, onToggleNotif, onPortalPreview }) {
  return (
    <nav style={{ background:T.navy, display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 1.25rem", height:54, position:"sticky", top:0, zIndex:100,
      borderBottom:`2px solid ${T.gold}` }}>
      <div style={{ cursor:"pointer" }} onClick={() => onNav("dashboard")}>
        <Logo size={0.85}/>
      </div>
      <div style={{ display:"flex", gap:1 }}>
        {NAV_ITEMS.map(({ key, label }) => (
          <button key={key} onClick={() => onNav(key)}
            style={{ color: active===key ? T.gold : "rgba(255,255,255,0.55)",
              fontSize:12.5, fontWeight: active===key ? 700 : 400,
              padding:"6px 13px", borderRadius:7, cursor:"pointer",
              border:"none", background: active===key ? "rgba(245,168,0,0.13)" : "none",
              fontFamily:"'Nunito Sans',sans-serif", transition:"all 0.13s" }}
            onMouseEnter={e => { if(active!==key){ e.currentTarget.style.color="#fff"; e.currentTarget.style.background="rgba(255,255,255,0.08)"; }}}
            onMouseLeave={e => { if(active!==key){ e.currentTarget.style.color="rgba(255,255,255,0.55)"; e.currentTarget.style.background="none"; }}}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(245,168,0,0.15)",
          border:`1px solid rgba(245,168,0,0.35)`, borderRadius:20, padding:"4px 11px" }}>
          <PulseDot/>
          <span style={{ fontSize:11, color:T.goldLt, fontWeight:700 }}>AI Live</span>
        </div>
        <button onClick={onPortalPreview}
          style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(255,255,255,0.18)",
            background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.8)",
            fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif",
            transition:"all 0.13s" }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.15)"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="rgba(255,255,255,0.8)"; }}>
          👤 Client view
        </button>
        <NotificationBell notifications={notifications} onClick={onToggleNotif}/>
        <div style={{ width:30, height:30, borderRadius:"50%", background:T.gold, color:T.navy,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>JA</div>
      </div>
    </nav>
  );
}

// ── FOOTER ────────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{ marginTop:"2rem", padding:"0.75rem 1.5rem",
      borderTop:`1px solid ${T.border}`, background:T.white,
      display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span style={{ fontSize:10.5, color:T.muted }}>© 2025 BridgePath Group · Maryland · Washington D.C. · Virginia · Nationwide virtual</span>
      <div style={{ display:"flex", gap:14 }}>
        {["Privacy","Terms","AI policy","Cal.com","API docs"].map(l => (
          <span key={l} style={{ fontSize:10.5, color:T.muted, cursor:"pointer" }}
            onMouseEnter={e => e.target.style.color = T.navy}
            onMouseLeave={e => e.target.style.color = T.muted}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ── CLIENT PORTAL PREVIEW (inline for artifact rendering) ────
// In production this is a separate route / separate app.
// Here it's inlined so the staff can preview the client experience.

const CP_MILESTONES = [
  { label:"Initial contact",            detail:"We received your inquiry. Welcome to BridgePath!" },
  { label:"Consultation scheduled",     detail:"Your initial consultation has been booked." },
  { label:"Consultation completed",     detail:"Your case review is complete." },
  { label:"Client intake completed",    detail:"Your intake form and personal information have been recorded." },
  { label:"Document checklist sent",    detail:"We've sent you a personalized checklist of required documents." },
  { label:"Documents received",         detail:"We've received your documents and are reviewing them." },
  { label:"Documents reviewed",         detail:"All documents have been reviewed and verified." },
  { label:"Application prepared",       detail:"Your application package is fully prepared." },
  { label:"Client review",              detail:"You're reviewing the final application before submission." },
  { label:"Application submitted",      detail:"Your application has been submitted to USCIS." },
  { label:"Waiting for government updates", detail:"Your case is under government review." },
  { label:"Biometrics appointment",     detail:"USCIS has scheduled your biometrics appointment." },
  { label:"Interview scheduled",        detail:"Your USCIS interview date has been confirmed." },
  { label:"Case completed",             detail:"🎉 Congratulations! Your case is complete." },
];

const CP_CLIENT = {
  name:"María Castellanos", email:"maria.c@email.com", phone:"(301) 555-0192",
  caseType:"Work Permit · EAD", caseNumber:"BP-2025-0047", step:5, steps:14,
  country:"Mexico", consultant:"Javid A.",
  nextAppt:{ time:"10:30 AM", type:"Initial consultation", format:"Virtual", duration:"60 min" },
};

const CP_DOCS = [
  { id:1, icon:"🛂", label:"Passport",             status:"ok",   meta:"MX · Expires 2027" },
  { id:2, icon:"📋", label:"I-94 record",          status:"ok",   meta:"Uploaded Jun 20" },
  { id:3, icon:"📄", label:"Visa document",        status:"ok",   meta:"Uploaded Jun 22" },
  { id:4, icon:"🪪", label:"Birth certificate",    status:"miss", meta:"Please upload a certified copy" },
  { id:5, icon:"📝", label:"Form I-765",           status:"rev",  meta:"Prepared by BridgePath · in review" },
  { id:6, icon:"📸", label:"Passport photos (2×2)",status:"miss", meta:"USCIS-compliant, white background" },
  { id:7, icon:"💳", label:"Filing fee receipt",   status:"miss", meta:"$410 — Form I-765 filing fee" },
  { id:8, icon:"💼", label:"Employment auth letter",status:"ok",  meta:"Uploaded Jun 25" },
];

const CP_MESSAGES = [
  { id:1, from:"staff",  sender:"Javid A.", ts:new Date(Date.now()-2*24*3600000),
    body:"Welcome to BridgePath, María! I've reviewed your case and prepared your document checklist. Your birth certificate is the most urgent item missing." },
  { id:2, from:"client", sender:"María Castellanos", ts:new Date(Date.now()-24*3600000),
    body:"Thank you Javid! Does the birth certificate need to be apostilled?" },
  { id:3, from:"staff",  sender:"Javid A.", ts:new Date(Date.now()-20*3600000),
    body:"Great question — a notarized English translation alongside the original is sufficient for the EAD. No apostille needed. Let me know once it's uploaded!" },
];

const CP_APPTS = [
  { day:"29", mon:"Jun", time:"10:30 AM", type:"Initial consultation", format:"Virtual", dur:"60 min", done:false },
  { day:"1",  mon:"Jul", time:"2:00 PM",  type:"Document review",      format:"Virtual", dur:"45 min", done:false },
  { day:"18", mon:"Jun", time:"11:00 AM", type:"Initial consultation", format:"Virtual", dur:"60 min", done:true  },
];

function ClientPortalPreview({ onExit }) {
  const [cpView, setCpView] = useState("home");
  const [cpDocs, setCpDocs] = useState(CP_DOCS);
  const [cpMsgs, setCpMsgs] = useState(CP_MESSAGES);
  const [msgInput, setMsgInput] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [lang, setLang] = useState("es");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS]   = useState(false);
  const [notifDoc, setNotifDoc]   = useState(true);
  const [notifAppt,setNotifAppt]  = useState(true);
  const [saved, setSaved] = useState(false);
  const msgBottom = useRef(null);
  const client = CP_CLIENT;
  const pct = Math.round((client.step / client.steps) * 100);
  const missing = cpDocs.filter(d => d.status === "miss");

  useEffect(() => { msgBottom.current?.scrollIntoView({ behavior:"smooth" }); }, [cpMsgs]);

  const uploadDoc = async (id) => {
    setUploadingId(id);
    await new Promise(r => setTimeout(r, 1600));
    setCpDocs(prev => prev.map(d => d.id===id ? {...d, status:"rev", meta:"Uploaded · pending review"} : d));
    setUploadingId(null);
  };

  const sendMsg = async () => {
    const t = msgInput.trim(); if(!t||msgLoading) return;
    setMsgInput("");
    setCpMsgs(p => [...p, { id:Date.now(), from:"client", sender:client.name, ts:new Date(), body:t }]);
    setMsgLoading(true);
    await new Promise(r => setTimeout(r, 1300));
    setCpMsgs(p => [...p, { id:Date.now()+1, from:"staff", sender:"Javid A.", ts:new Date(),
      body:"Thanks for your message! I'll review and respond within one business day. Feel free to upload any pending documents in the meantime." }]);
    setMsgLoading(false);
  };

  const navItems = [
    { key:"home", icon:"🏠", label:"Home" },
    { key:"journey", icon:"🗺️", label:"My journey" },
    { key:"documents", icon:"📂", label:"Documents" },
    { key:"appointments", icon:"📅", label:"Appointments" },
    { key:"messages", icon:"💬", label:"Messages", badge: CP_MESSAGES.filter(m=>m.from==="staff").length },
    { key:"settings", icon:"⚙️", label:"Settings" },
  ];

  const statusStyle = {
    ok:   { bg:T.tealLt,  color:T.teal,   label:"Verified" },
    rev:  { bg:T.goldPale,color:T.goldDk,  label:"In review" },
    miss: { bg:T.redPale, color:T.red,     label:"Missing" },
  };

  const Toggle = ({ val, set, label, sub }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{label}</div>
        {sub && <div style={{ fontSize:11.5, color:T.muted, marginTop:1 }}>{sub}</div>}
      </div>
      <button onClick={() => set(!val)}
        style={{ width:42, height:23, borderRadius:12, border:"none", cursor:"pointer",
          background:val?T.teal:"#D1D5DB", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
        <div style={{ width:17, height:17, borderRadius:"50%", background:"#fff",
          position:"absolute", top:3, left:val?22:3, transition:"left 0.2s",
          boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&family=Nunito+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito Sans', system-ui, sans-serif; background: #F6F8FD; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(27,58,122,0.18); border-radius: 20px; }
        input, textarea, button, select { font-family: inherit; }
        @keyframes cpDot { 0%,80%,100%{opacity:.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
      `}</style>
      <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Nunito Sans',system-ui,sans-serif" }}>

        {/* Sidebar */}
        <div style={{ width:210, background:T.navy, display:"flex", flexDirection:"column",
          flexShrink:0, position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>

          {/* Exit banner */}
          <div style={{ background:"rgba(245,168,0,0.18)", borderBottom:"1px solid rgba(245,168,0,0.25)",
            padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:10.5, color:T.goldLt, fontWeight:700 }}>👁 Staff preview</span>
            <button onClick={onExit}
              style={{ fontSize:10.5, color:T.gold, background:"none", border:"none",
                cursor:"pointer", fontWeight:700, fontFamily:"'Nunito Sans',sans-serif" }}>
              ✕ Exit
            </button>
          </div>

          {/* Logo */}
          <div style={{ padding:"1rem 1rem 0.75rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
            <svg width="140" height="34" viewBox="0 0 220 52" xmlns="http://www.w3.org/2000/svg" aria-label="BridgePath Group">
              <path d="M8 38 Q28 14 52 26 Q36 28 22 38Z" fill="#fff"/>
              <path d="M52 26 Q76 12 96 38 Q82 34 68 38 Q60 32 52 26Z" fill="#fff"/>
              <rect x="7" y="36" width="90" height="6" rx="2" fill="#fff"/>
              <rect x="7" y="36" width="12" height="12" rx="2" fill="#fff"/>
              <rect x="85" y="36" width="12" height="12" rx="2" fill="#fff"/>
              <path d="M16 40 Q40 20 68 14 Q84 10 100 4" stroke={T.gold} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
              <polygon points="100,4 91,2 93,11" fill={T.gold}/>
              <text x="108" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill="#fff">Bridge</text>
              <text x="162" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill={T.gold} fontStyle="italic">Path</text>
              <text x="108" y="44" fontFamily="'Nunito Sans',system-ui" fontWeight="400" fontSize="10" fill="rgba(255,255,255,0.4)" letterSpacing="4">GROUP</text>
            </svg>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Client portal</div>
          </div>

          {/* Client identity */}
          <div style={{ padding:"0.9rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.08)",
            display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:T.gold, color:T.navy,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:800, fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>MC</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{client.name}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:1 }}>{client.caseType}</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:"0.6rem" }}>
            {navItems.map(({ key, icon, label, badge }) => {
              const active = cpView === key;
              return (
                <button key={key} onClick={() => setCpView(key)}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", textAlign:"left",
                    padding:"8px 10px", borderRadius:9, marginBottom:2, border:"none", cursor:"pointer",
                    fontFamily:"'Nunito Sans',sans-serif", fontSize:12.5,
                    background:active?"rgba(245,168,0,0.15)":"transparent",
                    color:active?T.goldLt:"rgba(255,255,255,0.55)",
                    fontWeight:active?700:400, transition:"all 0.13s", position:"relative" }}
                  onMouseEnter={e => { if(!active){e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.color="#fff";}}}
                  onMouseLeave={e => { if(!active){e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.55)";}}}
                >
                  {active && <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
                    width:3, height:16, background:T.gold, borderRadius:"0 3px 3px 0" }}/>}
                  <span style={{ fontSize:14 }}>{icon}</span>
                  {label}
                  {badge > 0 && <span style={{ marginLeft:"auto", background:T.red, color:"#fff",
                    fontSize:9, fontWeight:800, padding:"2px 5px", borderRadius:10 }}>{badge}</span>}
                </button>
              );
            })}
          </nav>

          {/* Case number + sign out */}
          <div style={{ padding:"0.75rem 1rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize:9.5, color:"rgba(255,255,255,0.3)", marginBottom:3 }}>Case</div>
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.6)", fontFamily:"'JetBrains Mono',monospace", marginBottom:10 }}>{client.caseNumber}</div>
            <button onClick={onExit}
              style={{ width:"100%", padding:"6px", borderRadius:7, border:"1px solid rgba(255,255,255,0.12)",
                background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:11.5,
                cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Main content */}
        <main style={{ flex:1, overflowY:"auto", padding:"1.5rem 1.75rem", minWidth:0, color:T.text }}>

          {/* ── HOME ── */}
          {cpView === "home" && (
            <div>
              {/* Hero */}
              <div style={{ background:`linear-gradient(135deg, ${T.navy} 0%, ${T.navyLt} 100%)`,
                borderRadius:16, padding:"1.5rem 1.75rem", marginBottom:"1.1rem",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                boxShadow:"0 4px 24px rgba(27,58,122,0.18)" }}>
                <div>
                  <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5 }}>Good morning</div>
                  <div style={{ fontSize:22, fontWeight:800, color:"#fff", fontFamily:"'Nunito',sans-serif" }}>María 👋</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:5 }}>{client.caseType} · {pct}% complete</div>
                </div>
                <div style={{ position:"relative", width:74, height:74, flexShrink:0 }}>
                  <svg width="74" height="74" style={{ transform:"rotate(-90deg)" }}>
                    <circle cx="37" cy="37" r="30" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6"/>
                    <circle cx="37" cy="37" r="30" fill="none" stroke={T.gold} strokeWidth="6"
                      strokeDasharray={2*Math.PI*30} strokeDashoffset={2*Math.PI*30*(1-pct/100)} strokeLinecap="round"/>
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:15, fontWeight:800, color:"#fff", fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{pct}%</span>
                    <span style={{ fontSize:8.5, color:"rgba(255,255,255,0.45)", marginTop:1 }}>done</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:"1.1rem" }}>
                {[
                  { icon:"🗺️", val:`Step ${client.step}/14`, label:"Current step", warn:false },
                  { icon:"📄", val:`${missing.length} items`,  label:"Docs missing",   warn:missing.length>0 },
                  { icon:"📅", val:client.nextAppt.time,       label:"Next appt",       warn:false },
                ].map(s => (
                  <div key={s.label} style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
                    padding:"1rem", textAlign:"center", boxShadow:"0 1px 8px rgba(27,58,122,0.06)" }}>
                    <div style={{ fontSize:20, marginBottom:5 }}>{s.icon}</div>
                    <div style={{ fontSize:13.5, fontWeight:800, fontFamily:"'Nunito',sans-serif",
                      color:s.warn?T.red:T.navy }}>{s.val}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                {/* Next action */}
                <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                  padding:"1.1rem 1.25rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
                    letterSpacing:"0.06em", marginBottom:10 }}>Your next step</div>
                  <div style={{ padding:"12px", borderRadius:10, background:T.navyGhost,
                    border:`1px solid ${T.border}`, marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:T.navy, color:"#fff",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight:800, fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>
                        {client.step+1}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:T.navy }}>{CP_MILESTONES[client.step].label}</div>
                        <div style={{ fontSize:11.5, color:T.muted, marginTop:2 }}>{CP_MILESTONES[client.step].detail}</div>
                      </div>
                    </div>
                  </div>
                  {missing.length > 0 && (
                    <div style={{ background:T.redPale, borderLeft:`3px solid ${T.red}`,
                      borderRadius:"0 8px 8px 0", padding:"9px 12px", marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.red, marginBottom:3 }}>
                        ⚠️ {missing.length} document{missing.length>1?"s":""} missing
                      </div>
                      {missing.map(d => <div key={d.id} style={{ fontSize:11.5, color:T.red }}>· {d.label}</div>)}
                    </div>
                  )}
                  <button onClick={() => setCpView("documents")}
                    style={{ width:"100%", padding:"9px", borderRadius:9, background:T.gold, color:T.navy,
                      border:"none", fontSize:13, fontWeight:700, cursor:"pointer",
                      fontFamily:"'Nunito Sans',sans-serif" }}>
                    📂 Upload documents
                  </button>
                </div>
                {/* Upcoming appt */}
                <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                  padding:"1.1rem 1.25rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
                    letterSpacing:"0.06em", marginBottom:10 }}>Next appointment</div>
                  <div style={{ padding:"12px", borderRadius:10, background:T.navyGhost,
                    border:`1px solid ${T.border}`, marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
                      <div style={{ background:T.navy, color:"#fff", borderRadius:9, padding:"6px 10px",
                        textAlign:"center", flexShrink:0 }}>
                        <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>29</div>
                        <div style={{ fontSize:8.5, textTransform:"uppercase", letterSpacing:"0.05em", color:T.goldLt }}>Jun</div>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:T.navy }}>{client.nextAppt.type}</div>
                        <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{client.nextAppt.time} · {client.nextAppt.format}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:7 }}>
                      <div style={{ flex:1, padding:"8px", borderRadius:8, background:T.navy,
                        color:"#fff", textAlign:"center", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
                        🎥 Join meeting
                      </div>
                      <button onClick={() => setCpView("appointments")}
                        style={{ flex:1, padding:"8px", borderRadius:8, background:"transparent",
                          border:`1px solid ${T.borderMd}`, color:T.navy, fontSize:12.5, fontWeight:600,
                          cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
                        Reschedule
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize:11.5, color:T.muted, lineHeight:1.6 }}>
                    Your consultant: <strong style={{ color:T.navy }}>{client.consultant}</strong><br/>
                    Cancellation requires 24+ hours notice.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── JOURNEY ── */}
          {cpView === "journey" && (
            <div>
              <div style={{ marginBottom:"1.1rem" }}>
                <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>Your immigration journey</div>
                <div style={{ fontSize:13, color:T.muted }}>{client.caseType} · {pct}% complete · Step {client.step} of 14</div>
              </div>
              <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                padding:"1rem 1.25rem", marginBottom:"1rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:12.5, fontWeight:700, color:T.navy }}>Overall progress</span>
                  <span style={{ fontSize:12.5, fontWeight:800, color:T.teal }}>{pct}%</span>
                </div>
                <div style={{ background:"#E5E7EB", borderRadius:20, height:8, overflow:"hidden" }}>
                  <div style={{ background:`linear-gradient(90deg, ${T.teal}, ${T.tealDk||"#106B5A"})`,
                    height:"100%", width:`${pct}%`, borderRadius:20, transition:"width 0.5s ease" }}/>
                </div>
              </div>
              <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                padding:"0.75rem 1.25rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                {CP_MILESTONES.map((m, i) => {
                  const done = i < client.step-1, current = i===client.step-1, future = i>client.step-1;
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 4px",
                        position:"relative" }}>
                        {i < CP_MILESTONES.length-1 && (
                          <div style={{ position:"absolute", left:14, top:43, width:2,
                            height:"calc(100% - 18px)", background:done?T.teal:T.border }}/>
                        )}
                        <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, zIndex:1,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:done?12:11, fontWeight:700, fontFamily:"'Nunito',sans-serif",
                          background:done?T.teal:current?T.navy:"#E5E7EB",
                          color:done?"#fff":current?T.gold:"#9CA3AF",
                          border:current?`2px solid ${T.gold}`:"none",
                          boxShadow:current?`0 0 0 4px ${T.goldPale}`:"none" }}>
                          {done?"✓":i+1}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:current?800:done?500:400,
                            color:done?T.teal:current?T.navy:"#9CA3AF",
                            fontFamily:current?"'Nunito',sans-serif":undefined }}>
                            {m.label}
                            {current && <span style={{ marginLeft:8, fontSize:10, background:T.gold, color:T.navy,
                              padding:"2px 7px", borderRadius:20, fontWeight:700, verticalAlign:"middle" }}>Now</span>}
                          </div>
                          {(done||current) && (
                            <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>
                              {current?"In progress":["Jun 8","Jun 9","Jun 18","Jun 20"][i]||"Completed"}
                            </div>
                          )}
                        </div>
                      </div>
                      {i < CP_MILESTONES.length-1 && <div style={{ height:1, background:T.border, margin:"0 4px" }}/>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {cpView === "documents" && (
            <div>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.1rem" }}>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>BridgeVault™</div>
                  <div style={{ fontSize:13, color:T.muted }}>Secure documents · {cpDocs.filter(d=>d.status==="ok").length} verified · {missing.length} missing</div>
                </div>
                <button style={{ padding:"9px 16px", borderRadius:9, background:T.gold, color:T.navy,
                  border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
                  ↑ Upload
                </button>
              </div>
              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9, marginBottom:"1.1rem" }}>
                {[{l:"Verified",c:cpDocs.filter(d=>d.status==="ok").length,col:T.teal,bg:T.tealLt},
                  {l:"In review",c:cpDocs.filter(d=>d.status==="rev").length,col:T.goldDk,bg:T.goldPale},
                  {l:"Missing",c:missing.length,col:T.red,bg:T.redPale}].map(s=>(
                  <div key={s.l} style={{ background:s.bg, borderRadius:10, padding:"9px 12px", display:"flex", gap:9, alignItems:"center" }}>
                    <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Nunito',sans-serif", color:s.col }}>{s.c}</div>
                    <div style={{ fontSize:12, color:s.col, fontWeight:600 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {missing.length>0 && (
                <div style={{ background:T.goldPale, borderLeft:`3px solid ${T.gold}`, borderRadius:"0 10px 10px 0",
                  padding:"9px 13px", fontSize:12.5, color:T.text, marginBottom:"1rem", lineHeight:1.6 }}>
                  💡 <strong>Tip:</strong> Drag and drop files directly onto any missing document row below.
                </div>
              )}
              {[["🪪 Identity",cpDocs.filter(d=>!["application"].includes(d.cat||"identity")||d.id<=4)],
                ["📝 Application",cpDocs.filter(d=>d.id>4)]].map(([title,docs])=>(
                <div key={title} style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                  padding:"1rem 1.25rem", marginBottom:"1rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif",
                    marginBottom:11, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>{title}</span>
                    <span style={{ fontSize:11, color:T.muted, fontWeight:400 }}>
                      {docs.filter(d=>d.status==="ok").length}/{docs.length} verified
                    </span>
                  </div>
                  {docs.map(doc => {
                    const ss = statusStyle[doc.status];
                    const isUploading = uploadingId===doc.id;
                    return (
                      <div key={doc.id} style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px",
                        borderRadius:10, border:`1.5px ${doc.status==="miss"?"dashed":"solid"} ${doc.status==="miss"?"#D1D5DB":T.border}`,
                        background:doc.status==="miss"?T.cream:T.white, marginBottom:7, transition:"all 0.15s" }}>
                        <div style={{ width:34, height:34, borderRadius:8, background:ss.bg,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{doc.icon}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12.5, fontWeight:600, color:T.text }}>{doc.label}</div>
                          <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{doc.meta}</div>
                        </div>
                        <span style={{ fontSize:10.5, fontWeight:700, padding:"3px 9px", borderRadius:20,
                          background:ss.bg, color:ss.color, flexShrink:0 }}>{ss.label}</span>
                        {doc.status==="miss" && (
                          <button onClick={() => uploadDoc(doc.id)} disabled={isUploading}
                            style={{ padding:"6px 12px", borderRadius:8, background:T.navy, color:"#fff",
                              border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                              fontFamily:"'Nunito Sans',sans-serif", opacity:isUploading?0.6:1,
                              flexShrink:0 }}>
                            {isUploading?"Uploading…":"↑ Upload"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── APPOINTMENTS ── */}
          {cpView === "appointments" && (
            <div>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.1rem" }}>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>Appointments</div>
                  <div style={{ fontSize:13, color:T.muted }}>24 hours notice required to reschedule</div>
                </div>
                <button style={{ padding:"9px 16px", borderRadius:9, background:T.gold, color:T.navy,
                  border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
                  + Book
                </button>
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
                letterSpacing:"0.06em", marginBottom:8 }}>Upcoming</div>
              {CP_APPTS.filter(a=>!a.done).map((a,i) => (
                <div key={i} style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                  padding:"1rem 1.25rem", marginBottom:"0.85rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)",
                  display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ background:T.navy, color:"#fff", borderRadius:10, padding:"7px 11px",
                    textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{a.day}</div>
                    <div style={{ fontSize:8.5, textTransform:"uppercase", letterSpacing:"0.05em", color:T.goldLt }}>{a.mon}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>{a.type}</div>
                    <div style={{ fontSize:12.5, color:T.muted, marginTop:3 }}>{a.time} · {a.format} · {a.dur}</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:1 }}>With {client.consultant}</div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button style={{ padding:"8px 14px", borderRadius:8, background:T.navy, color:"#fff",
                      border:"none", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
                      🎥 Join
                    </button>
                    <button style={{ padding:"8px 14px", borderRadius:8, background:"transparent",
                      border:`1px solid ${T.borderMd}`, color:T.navy, fontSize:12.5, fontWeight:600,
                      cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
                letterSpacing:"0.06em", margin:"1.1rem 0 8px" }}>Past</div>
              {CP_APPTS.filter(a=>a.done).map((a,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 14px",
                  borderRadius:10, border:`1px solid ${T.border}`, background:T.cream, marginBottom:8, opacity:0.75 }}>
                  <div style={{ background:"#E5E7EB", color:T.muted, borderRadius:9, padding:"5px 9px",
                    textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:17, fontWeight:800, fontFamily:"'Nunito',sans-serif", lineHeight:1 }}>{a.day}</div>
                    <div style={{ fontSize:8.5, textTransform:"uppercase", color:T.muted }}>{a.mon}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{a.type}</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:1 }}>{a.time} · {a.format}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20,
                    background:T.tealLt, color:T.teal }}>Completed</span>
                </div>
              ))}
            </div>
          )}

          {/* ── MESSAGES ── */}
          {cpView === "messages" && (
            <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 100px)" }}>
              <div style={{ marginBottom:"1rem", flexShrink:0 }}>
                <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:3 }}>Messages</div>
                <div style={{ fontSize:13, color:T.muted }}>Direct thread with {client.consultant} · BridgePath Group</div>
              </div>
              <div style={{ flex:1, background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                overflow:"hidden", display:"flex", flexDirection:"column",
                boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                {/* Thread header */}
                <div style={{ padding:"13px 16px", borderBottom:`1px solid ${T.border}`,
                  display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", background:T.navy, color:T.gold,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>JA</div>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:700, color:T.navy }}>Javid A. — BridgePath Group</div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ADE80" }}/>
                      <span style={{ fontSize:11, color:T.muted }}>Replies within 1 business day</span>
                    </div>
                  </div>
                </div>
                {/* Messages */}
                <div style={{ flex:1, overflowY:"auto", padding:"1rem", display:"flex", flexDirection:"column", gap:13 }}>
                  {cpMsgs.map(m => {
                    const isCl = m.from==="client";
                    return (
                      <div key={m.id} style={{ display:"flex", gap:8, alignItems:"flex-end",
                        flexDirection:isCl?"row-reverse":"row" }}>
                        <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0,
                          background:isCl?T.gold:T.navy, color:isCl?T.navy:T.gold,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:800 }}>
                          {isCl?"MC":"JA"}
                        </div>
                        <div style={{ maxWidth:"74%" }}>
                          <div style={{ fontSize:10, color:T.muted, marginBottom:3, textAlign:isCl?"right":"left" }}>
                            {m.sender} · {Math.floor((Date.now()-new Date(m.ts))/60000) < 60
                              ? `${Math.floor((Date.now()-new Date(m.ts))/60000)}m ago`
                              : `${Math.floor((Date.now()-new Date(m.ts))/3600000)}h ago`}
                          </div>
                          <div style={{ padding:"10px 13px", borderRadius:13,
                            borderBottomLeftRadius:isCl?13:3, borderBottomRightRadius:isCl?3:13,
                            background:isCl?T.navy:T.cream, color:isCl?"#fff":T.text,
                            border:isCl?"none":`1px solid ${T.border}`,
                            fontSize:13, lineHeight:1.6 }}>
                            {m.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {msgLoading && (
                    <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                      <div style={{ width:26, height:26, borderRadius:"50%", background:T.navy, color:T.gold,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800 }}>JA</div>
                      <div style={{ padding:"10px 14px", borderRadius:"13px 13px 13px 3px",
                        background:T.cream, border:`1px solid ${T.border}` }}>
                        <div style={{ display:"flex", gap:4 }}>
                          {[0,1,2].map(i=>(
                            <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.muted,
                              display:"block", animation:`cpDot 1.2s ${i*0.2}s ease-in-out infinite` }}/>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={msgBottom}/>
                </div>
                {/* Input */}
                <div style={{ padding:"11px 14px", borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                    <textarea value={msgInput} onChange={e=>setMsgInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                      placeholder="Type a message…" rows={2}
                      style={{ flex:1, padding:"9px 11px", borderRadius:9,
                        border:`1.5px solid ${T.borderMd}`, background:T.cream,
                        fontFamily:"'Nunito Sans',sans-serif", fontSize:13, color:T.text,
                        outline:"none", resize:"none", lineHeight:1.5 }}
                      onFocus={e=>e.target.style.borderColor=T.navy}
                      onBlur={e=>e.target.style.borderColor=T.borderMd}/>
                    <button onClick={sendMsg} disabled={!msgInput.trim()||msgLoading}
                      style={{ width:38, height:38, borderRadius:9, background:msgInput.trim()?T.navy:"#E5E7EB",
                        color:msgInput.trim()?T.gold:T.muted, border:"none", cursor:msgInput.trim()?"pointer":"default",
                        fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      ↑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {cpView === "settings" && (
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:"1.1rem" }}>Settings</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                {/* Account */}
                <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                  padding:"1.1rem 1.25rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:13 }}>👤 Account</div>
                  {[["Full name",client.name],["Email",client.email],["Phone",client.phone],["Country of origin",client.country]].map(([l,v])=>(
                    <div key={l} style={{ marginBottom:11 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase",
                        letterSpacing:"0.05em", marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:13, color:T.text, padding:"8px 11px", borderRadius:8,
                        background:T.cream, border:`1px solid ${T.border}` }}>{v}</div>
                    </div>
                  ))}
                  <button style={{ width:"100%", padding:"9px", borderRadius:9, background:"transparent",
                    border:`1px solid ${T.borderMd}`, color:T.navy, fontSize:13, fontWeight:600,
                    cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
                    Change password
                  </button>
                </div>
                <div>
                  {/* Language */}
                  <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                    padding:"1.1rem 1.25rem", marginBottom:"1rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:11 }}>🌐 Language</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                      {[["en","English 🇺🇸"],["es","Español 🇲🇽"]].map(([k,l])=>(
                        <button key={k} onClick={()=>setLang(k)}
                          style={{ padding:"8px", borderRadius:8, border:`1.5px solid ${lang===k?T.navy:T.border}`,
                            background:lang===k?T.navyGhost:T.cream, cursor:"pointer",
                            fontSize:12.5, fontWeight:lang===k?700:400, color:lang===k?T.navy:T.muted,
                            fontFamily:"'Nunito Sans',sans-serif" }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Notifications */}
                  <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
                    padding:"1.1rem 1.25rem", boxShadow:"0 1px 10px rgba(27,58,122,0.07)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:4 }}>🔔 Notifications</div>
                    <Toggle val={notifEmail} set={setNotifEmail} label="Email notifications" sub="Case updates, reminders"/>
                    <Toggle val={notifSMS}   set={setNotifSMS}   label="SMS notifications"   sub="Urgent updates only"/>
                    <Toggle val={notifDoc}   set={setNotifDoc}   label="Document reminders"  sub="Missing or expiring docs"/>
                    <Toggle val={notifAppt}  set={setNotifAppt}  label="Appointment reminders" sub="24h and 1h before"/>
                    <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);}}
                      style={{ width:"100%", marginTop:13, padding:"9px", borderRadius:9,
                        background:saved?"#16A34A":T.navy, color:"#fff", border:"none",
                        fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif",
                        transition:"background 0.2s" }}>
                      {saved?"✓ Saved!":"Save preferences"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("dashboard");
  const [clients] = useState(INITIAL_CLIENTS);
  const [selectedClient, setSelectedClient] = useState(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [portalMode, setPortalMode] = useState(false);

  // If portal mode is active, render the client portal
  if (portalMode) {
    // Inline a minimal version since we can't import in artifacts
    return <ClientPortalPreview onExit={() => setPortalMode(false)}/>;
  }

  const handleNav = useCallback((v) => {
    setView(v);
    setSelectedClient(null);
    setNotifOpen(false);
  }, []);

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setView("client-detail");
  };

  // Notification actions
  const dismissNotif  = (id) => setNotifications(ns => ns.filter(n => n.id !== id));
  const markRead      = (id) => setNotifications(ns => ns.map(n => n.id === id ? {...n, read:true} : n));
  const markAllRead   = ()   => setNotifications(ns => ns.map(n => ({...n, read:true})));
  const clearAll      = ()   => setNotifications([]);

  // Simulate a new notification arriving every 45 seconds
  useEffect(() => {
    const LIVE = [
      { type:"call",      title:"New inbound call",           body:"Caller asking about H-1B transfer process. AI receptionist handling." },
      { type:"doc",       title:"Document uploaded",           body:"Jin-ho Park uploaded Form I-129 via client portal." },
      { type:"milestone", title:"Ahmed Ibrahim — biometrics",  body:"USCIS biometrics appointment scheduled for July 8. Journey Tracker updated." },
      { type:"appt",      title:"Appointment reminder",        body:"Sofia Lima's follow-up is in 30 minutes. Interview prep notes attached." },
    ];
    let idx = 0;
    const timer = setInterval(() => {
      const tpl = LIVE[idx % LIVE.length];
      setNotifications(prev => [{
        id:      Date.now(),
        type:    tpl.type,
        read:    false,
        pinned:  false,
        ts:      new Date(),
        title:   tpl.title,
        body:    tpl.body,
        client:  null,
        clientId:null,
        action:  null,
      }, ...prev]);
      idx++;
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Nunito+Sans:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito Sans', system-ui, sans-serif; background: #F6F8FD; color: #111827; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(27,58,122,0.18); border-radius: 20px; }
        input, select, button { font-family: inherit; }
        .notif-item:hover .notif-dismiss { opacity: 1 !important; }
      `}</style>
      <NavBar
        active={view}
        onNav={handleNav}
        notifications={notifications}
        notifOpen={notifOpen}
        onToggleNotif={() => setNotifOpen(o => !o)}
        onPortalPreview={() => setPortalMode(true)}
      />
      {notifOpen && (
        <NotificationPanel
          notifications={notifications}
          onDismiss={dismissNotif}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClearAll={clearAll}
          onClose={() => setNotifOpen(false)}
        />
      )}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"1.25rem 1.5rem" }}>
        {view === "dashboard"     && <Dashboard onNav={handleNav} clients={clients} appointments={APPOINTMENTS} notifications={notifications} onMarkRead={markRead} onDismiss={dismissNotif}/>}
        {view === "receptionist"  && <ReceptionistChat/>}
        {view === "clients"       && <ClientsView clients={clients} onSelectClient={handleSelectClient}/>}
        {view === "client-detail" && selectedClient && <ClientDetail client={selectedClient} onBack={() => setView("clients")}/>}
        {view === "vault"         && <VaultView clients={clients}/>}
        {view === "schedule"      && <ScheduleView appointments={APPOINTMENTS}/>}
      </div>
      <Footer/>
    </>
  );
}
