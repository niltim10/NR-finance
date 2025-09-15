'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Bell, BarChart2, Settings, Users,
  Plus, X, CheckCircle2, AlarmClock, ChevronLeft, ChevronRight,
  Search, Upload, Download, LogOut
} from 'lucide-react';

// ====== Tipos ======
type Member = { id: string; name: string; phone?: string };
type Bill = {
  id: string; title: string; amount: number; dueISO: string; category: string;
  notes?: string; paid: boolean; createdBy: string; paidBy?: string;
  reminderDays?: number; recipients?: string[];
};

// ====== Defaults ======
const defaultMembers: Member[] = [
  { id: 'u1', name: 'You', phone: '+15551234567' },
  { id: 'u2', name: 'Partner', phone: '+15557654321' },
];
const DEFAULT_CATEGORIES = [
  'Home','Car','Utilities','Internet','Phone','Insurance',
  'Credit Card','Loan','Investment','Medical','Subscription','Groceries','Misc'
];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const toISO = (d: Date) => d.toISOString().slice(0,10);
const fmtMonth = (d: Date) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (aISO: string, bISO: string) => {
  const a = new Date(aISO), b = new Date(bISO);
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
};
function buildMonthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 7) % 7)); // usa domingo como início (formato EUA)
  const days: { date: string; monthIndex: number }[] = [];
  for (let i=0;i<42;i++) { const d = new Date(start); d.setDate(start.getDate()+i);
    days.push({ date: d.toISOString().slice(0,10), monthIndex: d.getMonth() }); }
  return days;
}

// ====== UI helpers ======
function NRLogo({ size=28, label=true }: { size?: number; label?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div style={{ width:size, height:size }}
        className="grid place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-extrabold tracking-tight">
        NR
      </div>
      {label && <span className="font-semibold text-white/90">NR Finance</span>}
    </div>
  );
}
function Weekdays() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-500 mb-2">
      {days.map(d => <div key={d}>{d}</div>)}
    </div>
  );
}
function Label({ label, children, full=false }: { label:string; children:React.ReactNode; full?:boolean }) {
  return (
    <label className={`text-sm ${full? 'col-span-full' : ''}`}>
      <div className="text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

// ====== Página ======
type Tab = 'calendar' | 'reports' | 'household' | 'settings';

export default function NRFinance() {
  const today = new Date();
  const [active, setActive] = useState<Tab>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [defaultReminderDays, setDefaultReminderDays] = useState<number>(1);
  const [defaultRecipients, setDefaultRecipients] = useState<string[]>(['u1']);
  const [query, setQuery] = useState('');

  const [bills, setBills] = useState<Bill[]>([
    { id: 'b1', title: 'Internet', amount: 60,  dueISO: toISO(new Date(today.getFullYear(), today.getMonth(), 16)), category: 'Internet', paid: false, createdBy: 'u1', recipients:['u1'] },
    { id: 'b2', title: 'Rent',     amount: 1200, dueISO: toISO(new Date(today.getFullYear(), today.getMonth(), 5)),  category: 'Home',     paid: true,  createdBy: 'u1', paidBy:'u1' },
  ]);

  const [showBillModal, setShowBillModal] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);

  // localStorage load/save
  useEffect(()=>{ try{
    const raw = localStorage.getItem('finance-app-state-v1');
    if(raw){ const s = JSON.parse(raw);
      if(s.members) setMembers(s.members);
      if(s.categories) setCategories(s.categories);
      if(s.defaultReminderDays!==undefined) setDefaultReminderDays(s.defaultReminderDays);
      if(s.defaultRecipients) setDefaultRecipients(s.defaultRecipients);
      if(s.bills) setBills(s.bills);
    }
  }catch(e){} }, []);
  useEffect(()=>{ try{
    const state = { members, categories, defaultReminderDays, defaultRecipients, bills };
    localStorage.setItem('finance-app-state-v1', JSON.stringify(state));
  }catch(e){} }, [members, categories, defaultReminderDays, defaultRecipients, bills]);

  // derived
  const days = useMemo(()=> buildMonthGrid(currentMonth), [currentMonth]);
  const filteredBills = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if(!q) return bills;
    return bills.filter(b => `${b.title} ${b.category} ${b.notes ?? ''}`.toLowerCase().includes(q));
  }, [bills, query]);
  const overdue  = filteredBills.filter(b => !b.paid && new Date(b.dueISO) < startOfDay(today));
  const upcoming = filteredBills.filter(b => !b.paid && new Date(b.dueISO) >= startOfDay(today));
  const totals = useMemo(()=>{
    const mKey = toISO(currentMonth).slice(0,7);
    const monthBills = bills.filter(b => b.dueISO.startsWith(mKey));
    const total = monthBills.reduce((s,b)=> s + b.amount, 0);
    const paid  = monthBills.filter(b=>b.paid).reduce((s,b)=> s+b.amount, 0);
    return { total, paid, unpaid: Math.max(total - paid, 0), monthBills };
  }, [bills, currentMonth]);

  // category breakdown para donut
  const catSeries = useMemo(()=>{
    const map: Record<string, number> = {};
    totals.monthBills?.forEach(b => { map[b.category] = (map[b.category]||0) + b.amount; });
    const entries = Object.entries(map).sort((a,b)=> b[1]-a[1]);
    const colors = ['#6366F1','#22C55E','#F59E0B','#EF4444','#06B6D4','#A855F7','#84CC16','#F97316','#0EA5E9','#14B8A6'];
    return entries.map(([name, value], i)=> ({ name, value, color: colors[i % colors.length] }));
  }, [totals.monthBills]);

  // actions
  function openNew(date?: Date) {
    const d = date ? toISO(date) : toISO(today);
    const base: Bill = { id: `b${Date.now()}`, title: '', amount: 0, dueISO: d, category: categories[0] || 'Misc', notes: '', paid: false, createdBy: members[0].id, reminderDays: defaultReminderDays, recipients: defaultRecipients };
    setEditing(base); setShowBillModal(true);
  }
  function saveBill(b: Bill) {
    if (!b.title.trim()) return alert('Please enter a title.');
    if (Number.isNaN(b.amount)) return alert('Invalid amount.');
    setBills(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [...prev, b]);
    setShowBillModal(false);
  }
  function togglePaid(b: Bill) {
    setBills(prev => prev.map(x => x.id === b.id ? { ...x, paid: !x.paid, paidBy: !x.paid ? members[0].id : undefined } : x));
  }
  function removeBill(b: Bill) {
    if (!confirm('Delete this bill?')) return;
    setBills(prev => prev.filter(x => x.id !== b.id)); setShowBillModal(false);
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ members, categories, defaultReminderDays, defaultRecipients, bills }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `bills-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.members) setMembers(data.members);
        if (data.categories) setCategories(data.categories);
        if (data.defaultReminderDays !== undefined) setDefaultReminderDays(data.defaultReminderDays);
        if (data.defaultRecipients) setDefaultRecipients(data.defaultRecipients);
        if (data.bills) setBills(data.bills);
        alert('Data imported successfully!');
      } catch { alert('Invalid file.'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  // ===== SMS (Twilio via /api/sms) =====
  async function sendTestSMS() {
    const to = members[0]?.phone;
    if (!to) return alert('Add your phone in Settings (E.164).');
    const res = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, body: `NR Finance: test OK at ${new Date().toLocaleString('en-US')}` }),
    });
    const data = await res.json();
    res.ok ? alert('SMS sent!') : alert('SMS failed: ' + (data.error ?? ''));
  }
  async function sendBillSMS(bill: Bill) {
    const ids = bill.recipients ?? defaultRecipients;
    const phones = members.filter(m => ids.includes(m.id) && m.phone).map(m => m.phone!) ;
    if (phones.length === 0) return alert('No recipient phones set.');
    const msg = `Reminder: ${bill.title} due ${new Date(bill.dueISO).toLocaleDateString('en-US')} – ${currency.format(bill.amount)} (NR Finance)`;
    const res = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phones, body: msg }),
    });
    const data = await res.json();
    res.ok ? alert(`Sent to ${phones.length} contact(s)`) : alert('SMS failed: ' + (data.error ?? ''));
  }

  // ====== JSX ======
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar escura */}
      <div className="bg-[#0F172A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <NRLogo size={30} />
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={()=>setActive('calendar')}  className={`rounded-lg px-3 py-1.5 text-sm ${active==='calendar'?'bg-white/10':''}`}>Calendar</button>
              <button onClick={()=>setActive('reports')}   className={`rounded-lg px-3 py-1.5 text-sm ${active==='reports'?'bg-white/10':''}`}>Reports</button>
              <button onClick={()=>setActive('household')} className={`rounded-lg px-3 py-1.5 text-sm ${active==='household'?'bg-white/10':''}`}>Household</button>
              <button onClick={()=>setActive('settings')}  className={`rounded-lg px-3 py-1.5 text-sm ${active==='settings'?'bg-white/10':''}`}>Settings</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60"/>
              <input className="pl-9 pr-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/60"
                placeholder="Search bills…" value={query} onChange={e=> setQuery(e.target.value)} />
            </div>
            <button className="hidden sm:flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium" onClick={()=> openNew()}>
              <Plus className="w-4 h-4"/> Add Bill
            </button>
            <button className="rounded-lg bg-white/10 px-2 py-2" title="Sign out"><LogOut className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      {/* Conteúdo com sidebar clara */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar branca */}
        <aside className="rounded-2xl border bg-white p-4 h-max">
          <div className="mb-3 text-xs font-semibold text-gray-500">Quick actions</div>
          <div className="flex flex-col gap-2">
            <label className="btn flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" /> Import
              <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
            </label>
            <button className="btn flex items-center gap-2" onClick={exportJSON}><Download className="w-4 h-4"/> Export</button>
            <div className="h-px bg-gray-200 my-1" />
            <div className="text-xs font-semibold text-gray-500">Tabs</div>
            {(['calendar','reports','household','settings'] as Tab[]).map(t => (
              <button key={t}
                onClick={()=> setActive(t)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left ${active===t?'bg-blue-50 border-blue-200':'bg-white hover:bg-gray-50'}`}>
                <span className="capitalize">{t}</span>
                {t==='calendar' && <Calendar className="w-4 h-4 text-gray-500"/>}
                {t==='reports' && <BarChart2 className="w-4 h-4 text-gray-500"/>}
                {t==='household' && <Users className="w-4 h-4 text-gray-500"/>}
                {t==='settings' && <Settings className="w-4 h-4 text-gray-500"/>}
              </button>
            ))}
          </div>
        </aside>

        {/* Main panel */}
        <main className="space-y-6">
          {/* ===== Calendar ===== */}
          {active==='calendar' && (
            <>
              {/* Cards de overview */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Total (this month)</div>
                  <div className="mt-1 text-2xl font-semibold">{currency.format(totals.total)}</div>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Paid</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-600">{currency.format(totals.paid)}</div>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Unpaid</div>
                  <div className="mt-1 text-2xl font-semibold text-amber-600">{currency.format(totals.unpaid)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Calendário grande */}
                <section className="lg:col-span-2 rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg border" onClick={()=> setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()-1, 1))}><ChevronLeft className="w-4 h-4"/></button>
                      <h2 className="text-lg font-semibold">{fmtMonth(currentMonth)}</h2>
                      <button className="p-2 rounded-lg border" onClick={()=> setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()+1, 1))}><ChevronRight className="w-4 h-4"/></button>
                    </div>
                    <button className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2" onClick={()=> openNew()}><Plus className="w-4 h-4"/> Add Bill</button>
                  </div>
                  <Weekdays />
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day, i)=> {
                      const dayBills = filteredBills.filter(b => sameDay(b.dueISO, day.date));
                      const isToday = sameDay(toISO(today), day.date);
                      const outside = day.monthIndex !== currentMonth.getMonth();
                      return (
                        <div key={i} className={`min-h-[120px] border rounded-xl p-2 flex flex-col ${outside? 'opacity-50' : ''} ${isToday? 'ring-2 ring-blue-500' : ''}`}>
                          <div className="text-sm font-medium">{new Date(day.date).getDate()}</div>
                          <div className="mt-1 space-y-1 overflow-auto">
                            {dayBills.length === 0 && <div className="text-xs text-gray-300">—</div>}
                            {dayBills.map((b)=> (
                              <div key={b.id} className={`text-xs px-2 py-1 rounded-lg border flex items-center justify-between ${b.paid? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                <span className="truncate" title={b.title}>{b.title}</span>
                                {!b.paid && <span className="ml-2 font-medium">{currency.format(b.amount)}</span>}
                                <button className="ml-2" title="Edit" onClick={()=> { setEditing(b); setShowBillModal(true); }}><AlarmClock className="w-3.5 h-3.5"/></button>
                                <button className="ml-1" title="Mark paid" onClick={()=> togglePaid(b)}><CheckCircle2 className="w-3.5 h-3.5"/></button>
                                <button className="ml-1" title="Send SMS now" onClick={()=> sendBillSMS(b)}><Bell className="w-3.5 h-3.5"/></button>
                              </div>
                            ))}
                          </div>
                          <button className="mt-auto text-xs text-blue-600 hover:underline text-left" onClick={()=> openNew(new Date(day.date))}>+ Add bill</button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Painel direito */}
                <aside className="space-y-4">
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <h3 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4"/> Upcoming</h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      {upcoming.sort((a,b)=> +new Date(a.dueISO) - +new Date(b.dueISO)).slice(0,6).map(b => (
                        <li key={b.id} className="flex justify-between">
                          <span className="truncate" title={b.title}>{b.title}</span>
                          <span className="ml-2 text-gray-600">{fmtShort(b.dueISO)} – {currency.format(b.amount)}</span>
                        </li>
                      ))}
                      {upcoming.length === 0 && <li className="text-gray-400">Nothing soon</li>}
                    </ul>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <h3 className="font-semibold flex items-center gap-2"><BarChart2 className="w-4 h-4"/> Monthly Overview</h3>
                    <p className="text-sm text-gray-600 mt-2">Total: {currency.format(totals.total)}</p>
                    <p className="text-sm text-gray-600">Paid: {currency.format(totals.paid)}</p>
                    <p className="text-sm text-gray-600">Unpaid: {currency.format(totals.unpaid)}</p>
                  </div>
                </aside>
              </div>
            </>
          )}

          {/* ===== Reports ===== */}
          {active==='reports' && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold">Reports — {fmtMonth(currentMonth)}</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <CardStat title="Total"  value={currency.format(totals.total)} />
                <CardStat title="Paid"   value={currency.format(totals.paid)} className="text-emerald-600" />
                <CardStat title="Unpaid" value={currency.format(totals.unpaid)} className="text-amber-600" />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Donut categories */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="font-semibold mb-3">Spending by category</h3>
                  <Donut data={catSeries} />
                  <ul className="mt-4 space-y-1 text-sm">
                    {catSeries.map(s => (
                      <li key={s.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
                          {s.name}
                        </span>
                        <span className="text-gray-600">{currency.format(s.value)}</span>
                      </li>
                    ))}
                    {catSeries.length===0 && <li className="text-gray-400">No data this month</li>}
                  </ul>
                </div>

                {/* Lista do mês */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm lg:col-span-2">
                  <h3 className="font-semibold mb-3">Bills list (this month)</h3>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-500">
                        <tr><th className="py-2">Title</th><th>Due</th><th>Category</th><th className="text-right">Amount</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {totals.monthBills.length===0 && (
                          <tr><td colSpan={5} className="py-6 text-center text-gray-400">No bills</td></tr>
                        )}
                        {totals.monthBills.map(b=>(
                          <tr key={b.id} className="border-t">
                            <td className="py-2">{b.title}</td>
                            <td>{fmtShort(b.dueISO)}</td>
                            <td>{b.category}</td>
                            <td className="text-right">{currency.format(b.amount)}</td>
                            <td>{b.paid? 'Paid' : 'Open'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ===== Household ===== */}
          {active==='household' && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Household</h2>
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <ul className="space-y-2">
                  {members.map(m=>(
                    <li key={m.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.phone ?? 'No phone'}</div>
                      </div>
                      <label className="text-sm text-gray-600 flex items-center gap-2">
                        <input type="checkbox" checked={defaultRecipients.includes(m.id)}
                          onChange={(e)=> {
                            const base = new Set(defaultRecipients);
                            e.target.checked ? base.add(m.id) : base.delete(m.id);
                            setDefaultRecipients(Array.from(base));
                          }}/>
                        Receive reminders (SMS)
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ===== Settings ===== */}
          {active==='settings' && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Settings</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="font-semibold mb-2">Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Label label="Display name"><input className="input" placeholder="Your name" value={members[0]?.name ?? ''}
                      onChange={(e)=> setMembers(prev => prev.map(m => m.id==='u1'? { ...m, name: e.target.value } : m))}/></Label>
                    <Label label="Phone (E.164)"><input className="input" placeholder="+15551234567" value={members[0]?.phone ?? ''}
                      onChange={(e)=> setMembers(prev => prev.map(m => m.id==='u1'? { ...m, phone: e.target.value } : m))}/></Label>
                  </div>
                  <button className="btn-primary mt-3" onClick={sendTestSMS}>Send test SMS</button>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="font-semibold mb-2">Reminders</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Label label="Default days before">
                      <input type="number" min={0} className="input"
                        value={defaultReminderDays} onChange={e=> setDefaultReminderDays(Number(e.target.value))}/>
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Daily SMS automation can be added with Vercel Cron.</p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modal Bill */}
      {showBillModal && editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-lg p-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{bills.some(x=>x.id===editing.id)? 'Edit bill' : 'New bill'}</h3>
              <button onClick={()=> setShowBillModal(false)}><X className="w-5 h-5"/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Label label="Title"><input className="input" value={editing.title} onChange={e=> setEditing({...editing, title: e.target.value})} /></Label>
              <Label label="Amount (USD)"><input type="number" className="input" value={editing.amount} onChange={e=> setEditing({...editing, amount: Number(e.target.value)})} /></Label>
              <Label label="Due date"><input type="date" className="input" value={editing.dueISO} onChange={e=> setEditing({...editing, dueISO: e.target.value})} /></Label>
              <Label label="Category">
                <select className="input" value={editing.category} onChange={e=> setEditing({...editing, category: e.target.value})}>
                  {categories.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </Label>
              <Label label="Reminder (days before)"><input type="number" min={0} className="input" value={editing.reminderDays ?? defaultReminderDays} onChange={e=> setEditing({...editing, reminderDays: Number(e.target.value)})} /></Label>
              <Label label="Recipients">
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1">
                      <input type="checkbox" checked={(editing.recipients ?? defaultRecipients).includes(m.id)} onChange={(e)=> {
                        const base = new Set(editing.recipients ?? defaultRecipients);
                        e.target.checked ? base.add(m.id) : base.delete(m.id);
                        setEditing({...editing, recipients: Array.from(base)});
                      }} /> {m.name}
                    </label>
                  ))}
                </div>
              </Label>
              <Label label="Notes" full><textarea className="input h-24" value={editing.notes} onChange={e=> setEditing({...editing, notes: e.target.value})}/></Label>
              <div className="flex items-center gap-2"><input type="checkbox" checked={editing.paid} onChange={e=> setEditing({...editing, paid: e.target.checked})}/><span>Mark as paid</span></div>
            </div>

            <div className="flex justify-between mt-5">
              {bills.some(x=>x.id===editing.id) && (
                <button className="btn-danger" onClick={()=> removeBill(editing)}>Delete</button>
              )}
              <div className="ml-auto flex gap-2">
                <button className="btn" onClick={()=> setShowBillModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={()=> saveBill(editing)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== componentes auxiliares (Reports) ======
function CardStat({ title, value, className='' }:{ title:string; value:string; className?:string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`mt-1 text-2xl font-semibold ${className}`}>{value}</div>
    </div>
  );
}
function Donut({ data }:{ data: {name:string; value:number; color:string}[] }) {
  const total = data.reduce((s,d)=> s + d.value, 0);
  const circumference = 2 * Math.PI * 42; // r=42
  let offset = 0;
  return (
    <div className="flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="12"/>
        {data.map((s, i) => {
          const frac = total ? s.value / total : 0;
          const length = frac * circumference;
          const el = (
            <circle key={i} cx="50" cy="50" r="42" fill="none" stroke={s.color} strokeWidth="12"
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />
          );
          offset += length;
          return el;
        })}
        <text x="50" y="50" dominantBaseline="middle" textAnchor="middle" fontSize="7" fill="#111827">
          {total ? '$' + total.toFixed(0) : '$0'}
        </text>
      </svg>
    </div>
  );
}
