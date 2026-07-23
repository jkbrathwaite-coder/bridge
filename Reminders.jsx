/**
 * BridgePath Group — Automated Reminders System
 * ─────────────────────────────────────────────
 * Three layers:
 *   1. REMINDER_ENGINE  — trigger definitions, schedule logic, template renderer
 *   2. RemindersView    — staff UI: schedule, logs, template editor, toggle per client
 *   3. reminders-backend.js comments — Supabase Edge Function + pg_cron wiring
 *
 * Mount in bridgepath-platform.jsx:
 *   import RemindersView from './Reminders'
 *   // Add to NAV_ITEMS: { key:"reminders", label:"Reminders" }
 *   // Add to render:    {view === "reminders" && <RemindersView clients={clients}/>}
 */

import { useState, useEffect, useRef } from "react";

// ── BRAND TOKENS ──────────────────────────────────────────────
const T = {
  navy:      "#1B3A7A", navyDk:  "#122759", navyLt:  "#2B4FA0",
  navyGhost: "rgba(27,58,122,0.08)",
  gold:      "#F5A800", goldDk:  "#C98E00", goldLt:  "#FFD060", goldPale:"#FFF8E1",
  teal:      "#1A8870", tealLt:  "#D0F4EC", tealDk:  "#106B5A",
  cream:     "#F6F8FD", white:   "#FFFFFF", text:    "#111827", muted:   "#6B7794",
  border:    "rgba(27,58,122,0.11)", borderMd:"rgba(27,58,122,0.18)",
  red:       "#DC2626", redPale: "#FEF2F2",
  purple:    "#7C3AED", purplePale:"#EDE9FE",
  green:     "#16A34A", greenPale:"#F0FDF4",
  orange:    "#EA580C", orangePale:"#FFF7ED",
};

// ─────────────────────────────────────────────────────────────
// 1. REMINDER ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * TRIGGER TYPES
 * Each trigger maps to one or more reminder sequences.
 * In production these fire from Supabase pg_cron + Edge Functions.
 */
export const TRIGGER_TYPES = {
  DOC_MISSING_3D:    { id:"DOC_MISSING_3D",  label:"Documents missing — 3 days",   icon:"📄", color:T.orange,  pale:T.orangePale },
  DOC_MISSING_7D:    { id:"DOC_MISSING_7D",  label:"Documents missing — 7 days",   icon:"📄", color:T.orange,  pale:T.orangePale },
  DOC_MISSING_14D:   { id:"DOC_MISSING_14D", label:"Documents missing — 14 days",  icon:"📄", color:T.red,     pale:T.redPale    },
  APPT_24H:          { id:"APPT_24H",        label:"Appointment — 24 hours before", icon:"📅", color:T.navy,    pale:T.navyGhost  },
  APPT_1H:           { id:"APPT_1H",         label:"Appointment — 1 hour before",  icon:"📅", color:T.navy,    pale:T.navyGhost  },
  MILESTONE_ADVANCE: { id:"MILESTONE_ADVANCE",label:"Milestone advanced",           icon:"🗺️", color:T.teal,    pale:T.tealLt     },
  DOC_EXPIRING_90D:  { id:"DOC_EXPIRING_90D",label:"Document expiring — 90 days",  icon:"⏰", color:T.purple,  pale:T.purplePale },
  DOC_EXPIRING_30D:  { id:"DOC_EXPIRING_30D",label:"Document expiring — 30 days",  icon:"⏰", color:T.red,     pale:T.redPale    },
  INACTIVITY_14D:    { id:"INACTIVITY_14D",  label:"Client inactive — 14 days",    icon:"💤", color:T.muted,   pale:"#F3F4F6"    },
  CASE_COMPLETE:     { id:"CASE_COMPLETE",   label:"Case completed",               icon:"🎉", color:T.green,   pale:T.greenPale  },
  LEGAL_ESCALATION:  { id:"LEGAL_ESCALATION",label:"Legal question flagged",       icon:"⚖️", color:T.red,     pale:T.redPale    },
};

/**
 * EMAIL TEMPLATES
 * Each template has: subject, preheader, body (with {{variable}} slots).
 * Rendered by renderTemplate() below.
 */
export const EMAIL_TEMPLATES = {
  DOC_MISSING_3D: {
    id: "DOC_MISSING_3D",
    name: "Missing documents — day 3",
    trigger: "DOC_MISSING_3D",
    channel: ["email"],
    variables: ["client_first_name", "missing_docs_list", "case_type", "consultant_name", "portal_url"],
    subject: "Action needed — documents missing from your case",
    preheader: "We're still waiting on a few items before we can move forward.",
    body: `Hi {{client_first_name}},

We're making great progress on your {{case_type}} case! We wanted to follow up because we're still waiting on a few documents before we can move to the next step.

**Still needed:**
{{missing_docs_list}}

Uploading is quick — just log in to your BridgePath client portal and go to BridgeVault™:
{{portal_url}}

If you have any questions about what's required or where to get these documents, just reply to this email and we'll help you out.

Warm regards,
{{consultant_name}}
BridgePath Group`,
  },

  DOC_MISSING_7D: {
    id: "DOC_MISSING_7D",
    name: "Missing documents — day 7",
    trigger: "DOC_MISSING_7D",
    channel: ["email", "sms"],
    variables: ["client_first_name", "missing_docs_list", "case_type", "consultant_name", "portal_url"],
    subject: "Reminder — documents still needed for your case",
    preheader: "Your case is on hold until we receive a few items.",
    body: `Hi {{client_first_name}},

Just a friendly reminder that your {{case_type}} case is on hold until we receive the documents below. We want to make sure your application stays on track.

**Still outstanding:**
{{missing_docs_list}}

Please upload these as soon as possible via your client portal:
{{portal_url}}

If gathering any of these is proving difficult, please reach out — we may be able to help with alternatives or extensions.

{{consultant_name}}
BridgePath Group`,
  },

  DOC_MISSING_14D: {
    id: "DOC_MISSING_14D",
    name: "Missing documents — day 14 (urgent)",
    trigger: "DOC_MISSING_14D",
    channel: ["email", "sms"],
    variables: ["client_first_name", "missing_docs_list", "case_type", "consultant_name", "portal_url", "consultant_phone"],
    subject: "⚠️ Urgent — outstanding documents delaying your case",
    preheader: "Please upload your documents or contact us today.",
    body: `Hi {{client_first_name}},

We haven't yet received the documents needed to proceed with your {{case_type}} application. Without these, we cannot prepare or submit your case.

**Outstanding items (14+ days):**
{{missing_docs_list}}

Please take one of the following steps today:
1. Upload via your client portal: {{portal_url}}
2. Call or text us: {{consultant_phone}}
3. Reply to this email

We're here to help — but we do need these items to move forward on your behalf.

{{consultant_name}}
BridgePath Group`,
  },

  APPT_24H: {
    id: "APPT_24H",
    name: "Appointment reminder — 24 hours",
    trigger: "APPT_24H",
    channel: ["email", "sms"],
    variables: ["client_first_name", "appt_type", "appt_date", "appt_time", "appt_format", "meeting_url", "consultant_name", "bring_list"],
    subject: "Your appointment is tomorrow — {{appt_time}}",
    preheader: "Everything you need to know for your {{appt_type}}.",
    body: `Hi {{client_first_name}},

This is a reminder that your **{{appt_type}}** is scheduled for **{{appt_date}} at {{appt_time}}** ({{appt_format}}).

{{#if virtual}}
**Join your meeting:**
{{meeting_url}}
{{/if}}

**What to have ready:**
{{bring_list}}

If you need to reschedule, please let us know at least 24 hours in advance.

See you tomorrow,
{{consultant_name}}
BridgePath Group`,
  },

  APPT_1H: {
    id: "APPT_1H",
    name: "Appointment reminder — 1 hour",
    trigger: "APPT_1H",
    channel: ["sms"],
    variables: ["client_first_name", "appt_type", "appt_time", "meeting_url"],
    subject: "Your appointment starts in 1 hour",
    preheader: "",
    body: `Hi {{client_first_name}} — your {{appt_type}} starts in 1 hour at {{appt_time}}. Join here: {{meeting_url}}

— BridgePath Group`,
  },

  MILESTONE_ADVANCE: {
    id: "MILESTONE_ADVANCE",
    name: "Milestone update",
    trigger: "MILESTONE_ADVANCE",
    channel: ["email"],
    variables: ["client_first_name", "case_type", "milestone_label", "milestone_detail", "next_milestone_label", "next_milestone_detail", "progress_pct", "consultant_name", "portal_url"],
    subject: "Update on your case — {{milestone_label}}",
    preheader: "Good news — your case has moved forward.",
    body: `Hi {{client_first_name}},

Great news! Your **{{case_type}}** case has just reached a new milestone:

✅ **{{milestone_label}}**
{{milestone_detail}}

Your case is now **{{progress_pct}}% complete**.

**What happens next:**
{{next_milestone_label}} — {{next_milestone_detail}}

You can track your full journey at any time in your client portal:
{{portal_url}}

We'll be in touch as things progress. Thank you for trusting BridgePath with your immigration journey.

{{consultant_name}}
BridgePath Group`,
  },

  DOC_EXPIRING_90D: {
    id: "DOC_EXPIRING_90D",
    name: "Document expiring — 90 days",
    trigger: "DOC_EXPIRING_90D",
    channel: ["email"],
    variables: ["client_first_name", "doc_label", "expiry_date", "consultant_name"],
    subject: "Heads up — your {{doc_label}} expires in 90 days",
    preheader: "Now is a good time to start the renewal process.",
    body: `Hi {{client_first_name}},

We wanted to give you advance notice that your **{{doc_label}}** is set to expire on **{{expiry_date}}** — about 90 days from now.

We recommend beginning the renewal process soon to avoid any gaps in your immigration status. Renewal timelines can vary, and starting early gives you a comfortable buffer.

If you'd like BridgePath's help with the renewal process, please reply to this email or schedule a consultation via your client portal.

{{consultant_name}}
BridgePath Group`,
  },

  DOC_EXPIRING_30D: {
    id: "DOC_EXPIRING_30D",
    name: "Document expiring — 30 days (urgent)",
    trigger: "DOC_EXPIRING_30D",
    channel: ["email", "sms"],
    variables: ["client_first_name", "doc_label", "expiry_date", "consultant_name", "consultant_phone"],
    subject: "⚠️ Urgent — {{doc_label}} expires in 30 days",
    preheader: "Immediate action may be required.",
    body: `Hi {{client_first_name}},

Your **{{doc_label}}** expires on **{{expiry_date}}** — just 30 days away.

Depending on your immigration status, allowing this document to expire without a renewal or extension in place could affect your ability to work, travel, or remain in the US.

Please contact us today:
- Reply to this email
- Call or text: {{consultant_phone}}

{{consultant_name}}
BridgePath Group`,
  },

  INACTIVITY_14D: {
    id: "INACTIVITY_14D",
    name: "Client inactive — 14 days",
    trigger: "INACTIVITY_14D",
    channel: ["email"],
    variables: ["client_first_name", "case_type", "last_activity", "consultant_name", "portal_url"],
    subject: "Checking in on your {{case_type}} case",
    preheader: "We just wanted to make sure everything is going smoothly.",
    body: `Hi {{client_first_name}},

We noticed it's been a little while since we last heard from you (last activity: {{last_activity}}), and we just wanted to check in on your **{{case_type}}** case.

Is everything going okay? Do you have any questions or need help with anything?

If there are documents you're working on gathering, don't hesitate to reach out — we're here to help make the process as smooth as possible.

You can also log in to your portal anytime to check your case status:
{{portal_url}}

{{consultant_name}}
BridgePath Group`,
  },

  CASE_COMPLETE: {
    id: "CASE_COMPLETE",
    name: "Case completed 🎉",
    trigger: "CASE_COMPLETE",
    channel: ["email"],
    variables: ["client_first_name", "case_type", "consultant_name"],
    subject: "🎉 Congratulations — your case is complete!",
    preheader: "This is a big moment. Congratulations from the BridgePath team.",
    body: `Hi {{client_first_name}},

We are thrilled to share some wonderful news — your **{{case_type}}** case has been successfully completed! 🎉

This is the result of your patience, hard work, and the documents you provided along the way. We hope this milestone brings you and your family peace of mind and opens new doors.

It has been an honor to be part of your immigration journey.

If you ever need assistance in the future — for yourself, a family member, or a colleague — please don't hesitate to reach out. And if you found our service helpful, we'd be grateful for a review or referral.

With warmest congratulations,
{{consultant_name}} and the BridgePath Group team`,
  },

  LEGAL_ESCALATION: {
    id: "LEGAL_ESCALATION",
    name: "Legal question — staff alert",
    trigger: "LEGAL_ESCALATION",
    channel: ["email"],
    recipient: "staff",
    variables: ["client_name", "caller_phone", "legal_question_summary", "call_time"],
    subject: "⚖️ Legal question flagged — {{client_name}}",
    preheader: "The AI receptionist escalated a legal question that needs your attention.",
    body: `Javid,

The AI receptionist flagged a legal question during a call at {{call_time}}.

**Client:** {{client_name}}
**Phone:** {{caller_phone}}
**Question summary:** {{legal_question_summary}}

Per BridgePath protocol, the AI did not provide legal advice or predict outcomes. The caller was informed that legal questions should be directed to a licensed immigration attorney.

Please follow up with this client at your earliest convenience.

— BridgePath AI Receptionist`,
  },
};

/**
 * Render a template with actual variable values.
 * Returns { subject, body } with all {{variables}} replaced.
 */
export function renderTemplate(templateId, variables = {}) {
  const tpl = EMAIL_TEMPLATES[templateId];
  if (!tpl) return { subject:"", body:"" };

  const replace = (str) =>
    str.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `[${key}]`);

  return {
    subject:   replace(tpl.subject),
    preheader: replace(tpl.preheader),
    body:      replace(tpl.body),
    channel:   tpl.channel,
    recipient: tpl.recipient || "client",
  };
}

/**
 * Compute which reminders should fire for a given client right now.
 * In production this runs server-side via pg_cron every hour.
 */
export function computePendingReminders(client, docs = [], appointments = []) {
  const pending = [];
  const now = new Date();

  // Document missing reminders
  const missingDocs = docs.filter(d => d.status === "miss");
  if (missingDocs.length > 0 && client.checklistSentAt) {
    const daysSince = Math.floor((now - new Date(client.checklistSentAt)) / 86400000);
    if (daysSince >= 14) pending.push({ trigger:"DOC_MISSING_14D", client, missingDocs });
    else if (daysSince >= 7) pending.push({ trigger:"DOC_MISSING_7D", client, missingDocs });
    else if (daysSince >= 3) pending.push({ trigger:"DOC_MISSING_3D", client, missingDocs });
  }

  // Appointment reminders
  appointments.forEach(appt => {
    const minsUntil = (new Date(appt.scheduledAt) - now) / 60000;
    if (minsUntil > 55 && minsUntil < 65) pending.push({ trigger:"APPT_1H", client, appt });
    if (minsUntil > 23*60 && minsUntil < 25*60) pending.push({ trigger:"APPT_24H", client, appt });
  });

  // Document expiry reminders
  docs.forEach(doc => {
    if (!doc.expiresAt) return;
    const daysUntil = Math.floor((new Date(doc.expiresAt) - now) / 86400000);
    if (daysUntil <= 30 && daysUntil > 0) pending.push({ trigger:"DOC_EXPIRING_30D", client, doc });
    else if (daysUntil <= 90 && daysUntil > 30) pending.push({ trigger:"DOC_EXPIRING_90D", client, doc });
  });

  // Inactivity
  if (client.lastActivityAt) {
    const daysInactive = Math.floor((now - new Date(client.lastActivityAt)) / 86400000);
    if (daysInactive >= 14) pending.push({ trigger:"INACTIVITY_14D", client });
  }

  return pending;
}

// ─────────────────────────────────────────────────────────────
// 2. MOCK DATA
// ─────────────────────────────────────────────────────────────

const MOCK_CLIENTS = [
  { id:1, name:"María Castellanos", email:"maria.c@email.com", phone:"(301) 555-0192",
    caseType:"Work Permit · EAD", step:5, color:"#1A8870", bg:"#D0F4EC",
    checklistSentAt: new Date(Date.now()-12*86400000).toISOString(),
    lastActivityAt:  new Date(Date.now()-3*86400000).toISOString(),
    remindersEnabled:true },
  { id:2, name:"Ahmed Ibrahim", email:"a.ibrahim@email.com", phone:"(202) 555-0847",
    caseType:"Green Card · Family-based", step:9, color:"#C98E00", bg:"#FFF8E1",
    checklistSentAt: new Date(Date.now()-75*86400000).toISOString(),
    lastActivityAt:  new Date(Date.now()-16*86400000).toISOString(),
    remindersEnabled:true },
  { id:3, name:"Sofia Lima", email:"sofia.l@email.com", phone:"(703) 555-0334",
    caseType:"Citizenship · Naturalization", step:11, color:"#1B3A7A", bg:"rgba(27,58,122,0.08)",
    checklistSentAt: new Date(Date.now()-135*86400000).toISOString(),
    lastActivityAt:  new Date(Date.now()-1*86400000).toISOString(),
    remindersEnabled:true },
  { id:4, name:"Jin-ho Park", email:"jh.park@email.com", phone:"(301) 555-0571",
    caseType:"Work Permit · H-1B Transfer", step:3, color:"#7C3AED", bg:"#EDE9FE",
    checklistSentAt: null,
    lastActivityAt:  new Date(Date.now()-2*86400000).toISOString(),
    remindersEnabled:false },
  { id:5, name:"Priya Nair", email:"priya.n@email.com", phone:"(240) 555-0229",
    caseType:"Green Card · Employment-based", step:7, color:"#DC2626", bg:"#FEF2F2",
    checklistSentAt: new Date(Date.now()-48*86400000).toISOString(),
    lastActivityAt:  new Date(Date.now()-15*86400000).toISOString(),
    remindersEnabled:true },
];

const MOCK_DOCS = {
  1: [
    { label:"Passport",          status:"ok",   expiresAt:"2027-08-15" },
    { label:"I-94 record",       status:"ok",   expiresAt:null },
    { label:"Birth certificate", status:"miss", expiresAt:null },
    { label:"Passport photos",   status:"miss", expiresAt:null },
    { label:"Filing fee receipt",status:"miss", expiresAt:null },
  ],
  2: [{ label:"Passport", status:"ok", expiresAt:"2025-08-20" }], // expiring <90 days
  5: [{ label:"EAD Card", status:"ok", expiresAt:new Date(Date.now()+25*86400000).toISOString().split("T")[0] }], // expiring <30
};

// Generate realistic reminder log
const makeLog = () => {
  const entries = [];
  const add = (cId, trig, daysAgo, status="sent") => {
    const t = TRIGGER_TYPES[trig];
    entries.push({
      id: entries.length+1, clientId:cId, trigger:trig,
      ts: new Date(Date.now()-daysAgo*86400000),
      status, channel: trig.includes("1H")?"SMS":"Email",
      icon:t?.icon||"📧", color:t?.color||T.muted, pale:t?.pale||"#F3F4F6",
      label:t?.label||trig,
    });
  };
  add(1,"DOC_MISSING_3D", 9);
  add(1,"DOC_MISSING_7D", 5);
  add(2,"INACTIVITY_14D", 2);
  add(3,"MILESTONE_ADVANCE",10);
  add(3,"APPT_24H", 1);
  add(3,"APPT_1H",  1);
  add(5,"DOC_EXPIRING_30D", 0, "queued");
  add(2,"DOC_EXPIRING_90D", 0, "queued");
  add(1,"DOC_MISSING_14D", 0, "queued");
  return entries.sort((a,b) => b.ts - a.ts);
};

const INITIAL_LOG = makeLog();

// ─────────────────────────────────────────────────────────────
// 3. SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────

function Card({ children, style={} }) {
  return <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
    padding:"1.1rem 1.3rem", boxShadow:"0 1px 12px rgba(27,58,122,0.07)", ...style }}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom:"1.1rem" }}>
      <div style={{ fontSize:18, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif" }}>{children}</div>
      {sub && <div style={{ fontSize:12.5, color:T.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ fontSize:10.5, fontWeight:700, padding:"3px 9px", borderRadius:20,
    background:bg, color, fontFamily:"'Nunito Sans',sans-serif", whiteSpace:"nowrap" }}>{label}</span>;
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ width:40, height:22, borderRadius:11, border:"none", cursor:"pointer",
        background:value?T.teal:"#D1D5DB", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ width:16, height:16, borderRadius:"50%", background:"#fff",
        position:"absolute", top:3, left:value?21:3, transition:"left 0.2s",
        boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
    </button>
  );
}

function ChannelPill({ ch }) {
  const s = ch==="SMS"
    ? { bg:T.purplePale, color:T.purple }
    : { bg:T.navyGhost, color:T.navy };
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10,
    background:s.bg, color:s.color }}>{ch}</span>;
}

function StatusPill({ status }) {
  const map = {
    sent:    { bg:T.tealLt,   color:T.tealDk, label:"Sent" },
    queued:  { bg:T.goldPale, color:T.goldDk, label:"Queued" },
    failed:  { bg:T.redPale,  color:T.red,    label:"Failed" },
    skipped: { bg:"#F3F4F6",  color:T.muted,  label:"Skipped" },
  };
  const s = map[status] || map.skipped;
  return <span style={{ fontSize:10.5, fontWeight:700, padding:"3px 9px", borderRadius:20,
    background:s.bg, color:s.color }}>{s.label}</span>;
}

function timeAgo(ts) {
  const d = Math.floor((Date.now()-new Date(ts))/1000);
  if (d < 60)    return "just now";
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

// ─────────────────────────────────────────────────────────────
// 4. SUB-VIEWS
// ─────────────────────────────────────────────────────────────

// ── 4a. SCHEDULE ─────────────────────────────────────────────
function ScheduleView({ clients, setClients }) {
  const pending = [];
  clients.forEach(c => {
    const docs = MOCK_DOCS[c.id] || [];
    computePendingReminders(c, docs, []).forEach(r => pending.push({ ...r, clientObj:c }));
  });

  // Derived upcoming — all queued in log
  const queued = INITIAL_LOG.filter(l => l.status==="queued");

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.1rem" }}>
      {/* Pending queue */}
      <Card>
        <div style={{ fontSize:13.5, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:12 }}>
          ⏳ Queued to send
        </div>
        {queued.length === 0 ? (
          <div style={{ textAlign:"center", padding:"1.5rem", color:T.muted, fontSize:13 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            No reminders queued right now.
          </div>
        ) : queued.map(q => {
          const client = MOCK_CLIENTS.find(c => c.id===q.clientId);
          return (
            <div key={q.id} style={{ display:"flex", alignItems:"flex-start", gap:10,
              padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
              background:q.pale, marginBottom:8 }}>
              <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{q.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:700, color:T.text }}>{q.label}</div>
                <div style={{ fontSize:11.5, color:T.muted, marginTop:2 }}>
                  {client?.name} · <ChannelPill ch={q.channel}/>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
                <StatusPill status="queued"/>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop:10, padding:"9px 12px", borderRadius:9,
          background:T.navyGhost, border:`1px solid ${T.border}`, fontSize:11.5, color:T.muted, lineHeight:1.6 }}>
          🕐 Reminders fire automatically every hour via pg_cron.<br/>
          Next run: <strong style={{ color:T.navy }}>in ~{60-new Date().getMinutes()} minutes</strong>
        </div>
      </Card>

      {/* Per-client toggles */}
      <Card>
        <div style={{ fontSize:13.5, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:12 }}>
          👤 Per-client reminders
        </div>
        {clients.map(c => (
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10,
            padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:c.bg, color:c.color,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:800, fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>
              {c.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
              <div style={{ fontSize:11, color:T.muted }}>{c.caseType}</div>
            </div>
            <Toggle value={c.remindersEnabled}
              onChange={v => setClients(prev => prev.map(x => x.id===c.id ? {...x,remindersEnabled:v} : x))}/>
          </div>
        ))}
      </Card>

      {/* Trigger reference */}
      <Card style={{ gridColumn:"1/-1" }}>
        <div style={{ fontSize:13.5, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:12 }}>
          🔁 Active trigger schedule
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {Object.values(TRIGGER_TYPES).map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:9,
              padding:"9px 11px", borderRadius:9, border:`1px solid ${T.border}`, background:t.pale }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{t.icon}</span>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:T.text }}>{t.label}</div>
                <div style={{ fontSize:10, color:t.color, fontWeight:600, marginTop:1,
                  textTransform:"uppercase", letterSpacing:"0.04em" }}>
                  {t.id.includes("DOC")?"Document":t.id.includes("APPT")?"Appointment":t.id.includes("MILE")?"Milestone":t.id.includes("INACT")?"Inactivity":t.id.includes("CASE")?"Case":"Staff"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── 4b. LOG ───────────────────────────────────────────────────
function LogView() {
  const [log, setLog] = useState(INITIAL_LOG);
  const [filter, setFilter] = useState("all");
  const [simulating, setSimulating] = useState(false);

  const filtered = filter==="all" ? log : log.filter(l => l.status===filter);

  const simulateSend = async () => {
    setSimulating(true);
    await new Promise(r => setTimeout(r, 1400));
    const t = TRIGGER_TYPES["DOC_MISSING_14D"];
    setLog(prev => [{
      id:Date.now(), clientId:1, trigger:"DOC_MISSING_14D",
      ts:new Date(), status:"sent",
      channel:"Email", icon:t.icon, color:t.color, pale:t.pale, label:t.label,
    }, ...prev.map(l => l.status==="queued"&&l.trigger==="DOC_MISSING_14D" ? {...l,status:"sent"} : l)]);
    setSimulating(false);
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", gap:4 }}>
          {["all","sent","queued","failed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:"5px 13px", borderRadius:20, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:filter===f?700:400, fontFamily:"'Nunito Sans',sans-serif",
                background:filter===f?T.navy:T.cream, color:filter===f?"#fff":T.muted,
                transition:"all 0.13s" }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={simulateSend} disabled={simulating}
          style={{ padding:"7px 16px", borderRadius:9, background:simulating?"#E5E7EB":T.teal,
            color:simulating?T.muted:"#fff", border:"none", fontSize:12.5, fontWeight:700,
            cursor:simulating?"default":"pointer", fontFamily:"'Nunito Sans',sans-serif",
            transition:"all 0.15s" }}>
          {simulating ? "⟳ Sending…" : "▶ Simulate send"}
        </button>
      </div>

      <Card style={{ padding:0, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 80px 70px 70px",
          gap:12, padding:"9px 14px", background:T.cream,
          borderBottom:`1px solid ${T.border}`, fontSize:10.5,
          fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>
          <span>Reminder</span><span>Client</span><span>Channel</span><span>Status</span><span>Sent</span>
        </div>

        <div style={{ maxHeight:480, overflowY:"auto" }}>
          {filtered.map((l, i) => {
            const client = MOCK_CLIENTS.find(c => c.id===l.clientId);
            return (
              <div key={l.id} style={{ display:"grid", gridTemplateColumns:"1fr 140px 80px 70px 70px",
                gap:12, padding:"10px 14px", borderBottom:`1px solid ${T.border}`,
                background:l.status==="queued"?`${l.pale}66`:T.white,
                alignItems:"center", transition:"background 0.13s" }}
                onMouseEnter={e=>e.currentTarget.style.background=T.cream}
                onMouseLeave={e=>e.currentTarget.style.background=l.status==="queued"?`${l.pale}66`:T.white}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{l.icon}</span>
                  <div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:T.text }}>{l.label}</div>
                    <div style={{ fontSize:10.5, color:T.muted, marginTop:1 }}>{l.trigger}</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:T.text, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{client?.name||"—"}</div>
                <div><ChannelPill ch={l.channel}/></div>
                <div><StatusPill status={l.status}/></div>
                <div style={{ fontSize:11, color:T.muted }}>{timeAgo(l.ts)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── 4c. TEMPLATE EDITOR ───────────────────────────────────────
function TemplateEditorView() {
  const [selectedId, setSelectedId] = useState("DOC_MISSING_3D");
  const [templates, setTemplates] = useState({ ...EMAIL_TEMPLATES });
  const [preview, setPreview] = useState(false);
  const [saved, setSaved]   = useState(false);

  const tpl = templates[selectedId];

  // Sample variables for preview
  const SAMPLE_VARS = {
    client_first_name:      "María",
    missing_docs_list:      "• Birth certificate\n• Passport photos (2×2)\n• Filing fee receipt",
    case_type:              "Work Permit (EAD)",
    consultant_name:        "Javid A.",
    portal_url:             "https://portal.bridgepathgroup.com",
    consultant_phone:       "(301) 555-0100",
    appt_type:              "Initial consultation",
    appt_date:              "Monday, June 30",
    appt_time:              "10:30 AM",
    appt_format:            "Virtual",
    meeting_url:            "https://cal.com/bridgepath/meeting",
    bring_list:             "• Passport\n• I-94 record\n• Any USCIS correspondence",
    milestone_label:        "Document checklist sent",
    milestone_detail:       "We've sent you a personalized checklist of required documents.",
    next_milestone_label:   "Documents received",
    next_milestone_detail:  "Upload your documents via BridgeVault™.",
    progress_pct:           "36",
    doc_label:              "Passport",
    expiry_date:            "August 15, 2025",
    last_activity:          "June 15, 2025",
    client_name:            "Ahmed Ibrahim",
    caller_phone:           "(202) 555-0847",
    legal_question_summary: "Asked whether green card application will be approved",
    call_time:              "8:52 AM today",
  };

  const rendered = renderTemplate(selectedId, SAMPLE_VARS);

  const updateField = (field, value) => {
    setTemplates(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], [field]:value } }));
    setSaved(false);
  };

  const save = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // In production: PATCH /api/templates/:id with updated body
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:"1.1rem" }}>
      {/* Template list */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
          letterSpacing:"0.05em", marginBottom:8 }}>Templates ({Object.keys(templates).length})</div>
        {Object.values(templates).map(t => {
          const trigger = TRIGGER_TYPES[t.trigger];
          const active  = selectedId === t.id;
          return (
            <button key={t.id} onClick={() => { setSelectedId(t.id); setPreview(false); }}
              style={{ display:"flex", alignItems:"flex-start", gap:8, width:"100%", textAlign:"left",
                padding:"9px 10px", borderRadius:9, marginBottom:4, border:"none",
                cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif",
                background:active?T.navyGhost:"transparent",
                transition:"background 0.13s" }}
              onMouseEnter={e=>{ if(!active)e.currentTarget.style.background=T.cream; }}
              onMouseLeave={e=>{ if(!active)e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{trigger?.icon||"📧"}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:active?700:500, color:active?T.navy:T.text }}>
                  {t.name}
                </div>
                <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
                  {t.channel.map(ch => <ChannelPill key={ch} ch={ch==="sms"?"SMS":"Email"}/>)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor / Preview */}
      <Card style={{ display:"flex", flexDirection:"column", gap:0, padding:0, overflow:"hidden" }}>
        {/* Toolbar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"11px 16px", borderBottom:`1px solid ${T.border}`, background:T.cream }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>{TRIGGER_TYPES[tpl.trigger]?.icon}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.navy }}>{tpl.name}</div>
              <div style={{ fontSize:11, color:T.muted }}>
                Trigger: <code style={{ fontSize:10.5, background:T.navyGhost, padding:"1px 5px",
                  borderRadius:4, color:T.navy }}>{tpl.trigger}</code>
                {" · "}{tpl.channel.join(" + ").toUpperCase()}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:7 }}>
            <button onClick={() => setPreview(p=>!p)}
              style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${T.borderMd}`,
                background:preview?T.navy:"transparent", color:preview?"#fff":T.navy,
                fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif",
                transition:"all 0.13s" }}>
              {preview?"✏️ Edit":"👁 Preview"}
            </button>
            <button onClick={save}
              style={{ padding:"6px 14px", borderRadius:8, border:"none",
                background:saved?T.green:T.gold, color:saved?"#fff":T.navy,
                fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif",
                transition:"all 0.15s" }}>
              {saved?"✓ Saved":"Save"}
            </button>
          </div>
        </div>

        {preview ? (
          /* Email preview */
          <div style={{ padding:"1.5rem 2rem", overflowY:"auto", flex:1 }}>
            {/* Email frame */}
            <div style={{ maxWidth:560, margin:"0 auto",
              border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden",
              boxShadow:"0 2px 16px rgba(27,58,122,0.10)" }}>
              {/* Email header */}
              <div style={{ background:T.navy, padding:"1.25rem 1.5rem",
                display:"flex", alignItems:"center", gap:12 }}>
                <svg width="100" height="24" viewBox="0 0 220 52" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 38 Q28 14 52 26 Q36 28 22 38Z" fill="#fff"/>
                  <path d="M52 26 Q76 12 96 38 Q82 34 68 38 Q60 32 52 26Z" fill="#fff"/>
                  <rect x="7" y="36" width="90" height="6" rx="2" fill="#fff"/>
                  <path d="M16 40 Q40 20 68 14 Q84 10 100 4" stroke={T.gold} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                  <polygon points="100,4 91,2 93,11" fill={T.gold}/>
                  <text x="108" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill="#fff">Bridge</text>
                  <text x="162" y="30" fontFamily="'Nunito',system-ui" fontWeight="800" fontSize="22" fill={T.gold} fontStyle="italic">Path</text>
                </svg>
              </div>
              {/* Email body */}
              <div style={{ padding:"1.75rem 2rem", background:"#fff" }}>
                <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>
                  Subject: <strong style={{ color:T.text }}>{rendered.subject}</strong>
                </div>
                <hr style={{ border:"none", borderTop:`1px solid ${T.border}`, margin:"10px 0 16px" }}/>
                <div style={{ fontSize:14, lineHeight:1.75, color:T.text, whiteSpace:"pre-wrap" }}>
                  {rendered.body
                    .replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${t}</strong>`)
                    .split("\n").map((line, i) => (
                      <p key={i} style={{ margin:"0 0 8px",
                        fontWeight:line.startsWith("**")?700:400 }}
                        dangerouslySetInnerHTML={{ __html:
                          line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}/>
                    ))
                  }
                </div>
              </div>
              {/* Footer */}
              <div style={{ background:T.cream, padding:"1rem 1.5rem", borderTop:`1px solid ${T.border}`,
                fontSize:11, color:T.muted, textAlign:"center", lineHeight:1.6 }}>
                BridgePath Group · Maryland · DC · Virginia · Nationwide virtual<br/>
                <span style={{ color:T.navy, cursor:"pointer", textDecoration:"underline" }}>Unsubscribe</span>
                {" · "}
                <span style={{ color:T.navy, cursor:"pointer", textDecoration:"underline" }}>Manage notifications</span>
              </div>
            </div>
            {/* Variable reference */}
            <div style={{ marginTop:"1.25rem", maxWidth:560, margin:"1rem auto 0" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
                letterSpacing:"0.05em", marginBottom:7 }}>Variables used in this template</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {tpl.variables.map(v => (
                  <code key={v} style={{ fontSize:11.5, background:T.navyGhost, padding:"3px 9px",
                    borderRadius:6, color:T.navy }}>{"{{"+v+"}}"}</code>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Edit mode */
          <div style={{ padding:"1.25rem 1.5rem", overflowY:"auto", flex:1,
            display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:10.5, fontWeight:700, color:T.muted,
                textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>
                Subject line
              </label>
              <input value={tpl.subject}
                onChange={e => updateField("subject", e.target.value)}
                style={{ width:"100%", padding:"9px 12px", borderRadius:9,
                  border:`1.5px solid ${T.borderMd}`, background:T.cream,
                  fontFamily:"'Nunito Sans',sans-serif", fontSize:13.5, color:T.text, outline:"none",
                  transition:"border-color 0.14s" }}
                onFocus={e=>e.target.style.borderColor=T.navy}
                onBlur={e=>e.target.style.borderColor=T.borderMd}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10.5, fontWeight:700, color:T.muted,
                textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>
                Body <span style={{ fontWeight:400, textTransform:"none" }}>
                  — use {"{{variable_name}}"} for dynamic content · **bold** for emphasis
                </span>
              </label>
              <textarea value={tpl.body}
                onChange={e => updateField("body", e.target.value)}
                rows={16}
                style={{ width:"100%", padding:"11px 13px", borderRadius:9,
                  border:`1.5px solid ${T.borderMd}`, background:T.cream,
                  fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, color:T.text,
                  outline:"none", resize:"vertical", lineHeight:1.65,
                  transition:"border-color 0.14s" }}
                onFocus={e=>e.target.style.borderColor=T.navy}
                onBlur={e=>e.target.style.borderColor=T.borderMd}/>
            </div>
            {/* Variable chips */}
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, color:T.muted,
                textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>
                Available variables — click to insert
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {tpl.variables.map(v => (
                  <button key={v}
                    onClick={() => {
                      const el = document.activeElement;
                      updateField("body", tpl.body + `{{${v}}}`);
                    }}
                    style={{ fontSize:11, background:T.navyGhost, border:"none",
                      padding:"3px 9px", borderRadius:6, color:T.navy, cursor:"pointer",
                      fontFamily:"'JetBrains Mono',monospace", transition:"all 0.13s" }}
                    onMouseEnter={e=>{e.currentTarget.style.background=T.navy;e.currentTarget.style.color="#fff";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=T.navyGhost;e.currentTarget.style.color=T.navy;}}>
                    {"{{"}{v}{"}}"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── 4d. SETTINGS ─────────────────────────────────────────────
function SettingsView() {
  const [settings, setSettings] = useState({
    emailEnabled:  true,
    smsEnabled:    false,
    docMissing:    true,
    apptReminder:  true,
    milestones:    true,
    docExpiry:     true,
    inactivity:    true,
    caseComplete:  true,
    legalEscalate: true,
    fromName:      "Javid A. — BridgePath Group",
    fromEmail:     "noreply@bridgepathgroup.com",
    replyTo:       "javid@bridgepathgroup.com",
    senderPhone:   "(301) 555-0100",
    timezone:      "America/New_York",
    quietStart:    "21:00",
    quietEnd:      "08:00",
  });
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setSettings(p=>({...p,[k]:v})); setSaved(false); };

  const Tog = ({ k, label, sub }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{label}</div>
        {sub && <div style={{ fontSize:11.5, color:T.muted, marginTop:1 }}>{sub}</div>}
      </div>
      <Toggle value={settings[k]} onChange={v=>set(k,v)}/>
    </div>
  );

  const Field = ({ k, label, type="text" }) => (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:10.5, fontWeight:700, color:T.muted, textTransform:"uppercase",
        letterSpacing:"0.05em", display:"block", marginBottom:4 }}>{label}</label>
      <input type={type} value={settings[k]} onChange={e=>set(k,e.target.value)}
        style={{ width:"100%", padding:"8px 11px", borderRadius:8, border:`1.5px solid ${T.borderMd}`,
          background:T.cream, fontFamily:"'Nunito Sans',sans-serif", fontSize:13, color:T.text,
          outline:"none", transition:"border-color 0.14s" }}
        onFocus={e=>e.target.style.borderColor=T.navy}
        onBlur={e=>e.target.style.borderColor=T.borderMd}/>
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.1rem" }}>
      {/* Channels */}
      <Card>
        <div style={{ fontSize:13.5, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:10 }}>
          📡 Channels
        </div>
        <Tog k="emailEnabled" label="Email reminders" sub="Sent via Resend / SendGrid"/>
        <Tog k="smsEnabled"   label="SMS reminders"   sub="Sent via Twilio — extra cost per message"/>
        <div style={{ marginTop:14 }}>
          <Field k="fromName"    label="From name"/>
          <Field k="fromEmail"   label="From email" type="email"/>
          <Field k="replyTo"     label="Reply-to email" type="email"/>
          <Field k="senderPhone" label="SMS sender number"/>
        </div>
      </Card>

      {/* Triggers */}
      <Card>
        <div style={{ fontSize:13.5, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:10 }}>
          ⚡ Triggers
        </div>
        <Tog k="docMissing"   label="Missing document reminders"   sub="Day 3, 7, 14 after checklist sent"/>
        <Tog k="apptReminder" label="Appointment reminders"        sub="24 hours and 1 hour before"/>
        <Tog k="milestones"   label="Milestone update emails"      sub="Sent when Journey Tracker advances"/>
        <Tog k="docExpiry"    label="Document expiry warnings"     sub="90 days and 30 days before expiry"/>
        <Tog k="inactivity"   label="Inactivity nudges"            sub="If client inactive for 14+ days"/>
        <Tog k="caseComplete" label="Case completion email"        sub="Sent when case reaches Step 14"/>
        <Tog k="legalEscalate" label="Legal escalation alerts"     sub="Notify Javid immediately when AI flags a legal Q"/>
      </Card>

      {/* Quiet hours */}
      <Card style={{ gridColumn:"1/-1" }}>
        <div style={{ fontSize:13.5, fontWeight:800, color:T.navy, fontFamily:"'Nunito',sans-serif", marginBottom:12 }}>
          🌙 Quiet hours & timezone
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div>
            <label style={{ fontSize:10.5, fontWeight:700, color:T.muted, textTransform:"uppercase",
              letterSpacing:"0.05em", display:"block", marginBottom:4 }}>Timezone</label>
            <select value={settings.timezone} onChange={e=>set("timezone",e.target.value)}
              style={{ width:"100%", padding:"8px 11px", borderRadius:8, border:`1.5px solid ${T.borderMd}`,
                background:T.cream, fontFamily:"'Nunito Sans',sans-serif", fontSize:13, color:T.text, outline:"none" }}>
              {["America/New_York","America/Chicago","America/Denver","America/Los_Angeles"].map(tz=>(
                <option key={tz} value={tz}>{tz.replace("America/","")}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize:10.5, fontWeight:700, color:T.muted, textTransform:"uppercase",
              letterSpacing:"0.05em", display:"block", marginBottom:4 }}>Quiet from</label>
            <input type="time" value={settings.quietStart} onChange={e=>set("quietStart",e.target.value)}
              style={{ width:"100%", padding:"8px 11px", borderRadius:8, border:`1.5px solid ${T.borderMd}`,
                background:T.cream, fontFamily:"'Nunito Sans',sans-serif", fontSize:13, color:T.text, outline:"none" }}/>
          </div>
          <div>
            <label style={{ fontSize:10.5, fontWeight:700, color:T.muted, textTransform:"uppercase",
              letterSpacing:"0.05em", display:"block", marginBottom:4 }}>Quiet until</label>
            <input type="time" value={settings.quietEnd} onChange={e=>set("quietEnd",e.target.value)}
              style={{ width:"100%", padding:"8px 11px", borderRadius:8, border:`1.5px solid ${T.borderMd}`,
                background:T.cream, fontFamily:"'Nunito Sans',sans-serif", fontSize:13, color:T.text, outline:"none" }}/>
          </div>
        </div>
        <div style={{ marginTop:10, padding:"9px 13px", borderRadius:9, background:T.navyGhost,
          border:`1px solid ${T.border}`, fontSize:12, color:T.muted, lineHeight:1.6 }}>
          No reminders will be sent between <strong style={{ color:T.navy }}>{settings.quietStart}</strong> and{" "}
          <strong style={{ color:T.navy }}>{settings.quietEnd}</strong> {settings.timezone.replace("America/","")}.
          Queued messages will fire at the next available window.
        </div>
        <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);}}
          style={{ marginTop:14, padding:"9px 22px", borderRadius:9, border:"none",
            background:saved?T.green:T.gold, color:saved?"#fff":T.navy,
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif",
            transition:"background 0.2s" }}>
          {saved?"✓ Saved!":"Save settings"}
        </button>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. ROOT REMINDERS VIEW
// ─────────────────────────────────────────────────────────────

const TABS = [
  { key:"schedule",  label:"📅 Schedule",   sub:"Queued & per-client" },
  { key:"log",       label:"📋 Send log",   sub:"History & simulation" },
  { key:"templates", label:"✉️ Templates",  sub:"Edit & preview" },
  { key:"settings",  label:"⚙️ Settings",   sub:"Channels & triggers" },
];

export default function RemindersView({ clients: propClients }) {
  const [tab, setTab]     = useState("schedule");
  const [clients, setClients] = useState(
    MOCK_CLIENTS.map(mc => {
      const match = (propClients||[]).find(c=>c.id===mc.id);
      return match ? { ...mc, name:match.name } : mc;
    })
  );

  // Stats
  const queued = INITIAL_LOG.filter(l=>l.status==="queued").length;
  const sentToday = INITIAL_LOG.filter(l=>l.status==="sent" &&
    new Date(l.ts).toDateString()===new Date().toDateString()).length;
  const enabled = clients.filter(c=>c.remindersEnabled).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&family=Nunito+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input, textarea, select, button { font-family: inherit; }
      `}</style>
      <div style={{ fontFamily:"'Nunito Sans',system-ui,sans-serif", color:T.text }}>

        <SectionTitle sub="Automated email and SMS reminders — triggered by case events, zero manual effort.">
          Automated reminders
        </SectionTitle>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:"1.1rem" }}>
          {[
            { label:"Queued",          value:queued,     delta:"Firing next run",    color:T.goldDk },
            { label:"Sent today",      value:sentToday,  delta:"↑ 3 vs yesterday",   color:T.teal   },
            { label:"Clients enabled", value:enabled,    delta:`of ${clients.length} total`, color:T.navy },
            { label:"Templates",       value:Object.keys(EMAIL_TEMPLATES).length, delta:"all active", color:T.purple },
          ].map(s => (
            <div key={s.label} style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
              padding:"0.9rem 1rem", boxShadow:"0 1px 10px rgba(27,58,122,0.06)" }}>
              <div style={{ fontSize:10.5, color:T.muted, textTransform:"uppercase",
                letterSpacing:"0.05em", marginBottom:5 }}>{s.label}</div>
              <div style={{ fontSize:26, fontWeight:800, fontFamily:"'Nunito',sans-serif",
                color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:5 }}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, background:"rgba(27,58,122,0.06)",
          borderRadius:10, padding:3, width:"fit-content", marginBottom:"1.1rem" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:"6px 18px", borderRadius:8, fontSize:12.5,
                fontWeight:tab===t.key?700:400, cursor:"pointer", border:"none",
                fontFamily:"'Nunito Sans',sans-serif", transition:"all 0.13s",
                background:tab===t.key?T.white:"transparent",
                color:tab===t.key?T.navy:T.muted,
                boxShadow:tab===t.key?"0 1px 4px rgba(27,58,122,0.10)":"none" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "schedule"  && <ScheduleView  clients={clients} setClients={setClients}/>}
        {tab === "log"       && <LogView/>}
        {tab === "templates" && <TemplateEditorView/>}
        {tab === "settings"  && <SettingsView/>}

        {/* Backend reference */}
        <div style={{ marginTop:"1.5rem", padding:"1rem 1.25rem", borderRadius:12,
          background:T.navyGhost, border:`1px solid ${T.border}`, fontSize:12, color:T.muted, lineHeight:1.75 }}>
          <strong style={{ color:T.navy }}>Production wiring:</strong>{" "}
          Supabase <code style={{ background:"rgba(27,58,122,0.1)", padding:"1px 5px", borderRadius:3,
            fontSize:11.5, color:T.navy }}>pg_cron</code>{" "}
          runs <code style={{ background:"rgba(27,58,122,0.1)", padding:"1px 5px", borderRadius:3,
            fontSize:11.5, color:T.navy }}>SELECT process_pending_reminders()</code>{" "}
          every hour → Edge Function <code style={{ background:"rgba(27,58,122,0.1)", padding:"1px 5px",
            borderRadius:3, fontSize:11.5, color:T.navy }}>send-reminder</code>{" "}
          calls Resend (email) and Twilio (SMS) → logs to{" "}
          <code style={{ background:"rgba(27,58,122,0.1)", padding:"1px 5px", borderRadius:3,
            fontSize:11.5, color:T.navy }}>reminder_logs</code>{" "}
          table → real-time update in this dashboard via Supabase Realtime.
        </div>
      </div>
    </>
  );
}
