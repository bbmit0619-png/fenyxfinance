import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownUp, Download, Mail, Search, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { api, invoiceDownloadUrl } from './api';
import { fenyxLogoDataUrl } from './assets/fenyxLogoData';
import './index.css';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const demoEmail = 'admin@fenyxfinance.com';
const demoPassword = 'demo-password-123';
const logoSrc = fenyxLogoDataUrl;

function Badge({ status }) {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-200 text-slate-700',
    paid: 'bg-emerald-100 text-emerald-700',
    unpaid: 'bg-amber-100 text-amber-700',
    overdue: 'bg-rose-100 text-rose-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}>{status}</span>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await api.login(email, password);
      onLogin(session.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <img src={logoSrc} alt="Fenyx Finance logo" className="max-h-full max-w-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-sm text-slate-500">Secure demo access for Fenyx Finance</p>
          </div>
        </div>
        {error && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <label className="mb-4 block text-sm font-medium">Email
          <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mb-6 block text-sm font-medium">Password
          <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely'}</button>
        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Demo credentials: {demoEmail} / {demoPassword}. In Bolt.new, run <span className="font-semibold">npm run dev</span> and open the port 5173 preview.</p>
      </form>
    </main>
  );
}

function Dashboard({ admin, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: 'all', from: '', to: '', sortBy: 'signupDate', direction: 'desc' });
  const [notice, setNotice] = useState('');

  useEffect(() => { api.summary().then(setSummary); }, []);
  useEffect(() => { api.clients(filters).then(setClients); }, [filters]);
  useEffect(() => { if (clients[0] && !selected) api.client(clients[0].id).then(setSelected); }, [clients, selected]);

  const cards = useMemo(() => summary ? [
    ['Total clients', summary.totalClients, Users],
    ['Active clients', summary.activeClients, ShieldCheck],
    ['Pending invoices', summary.pendingInvoices, WalletCards],
    ['Revenue', currency.format(summary.revenue), WalletCards],
  ] : [], [summary]);

  async function selectClient(id) {
    setSelected(await api.client(id));
    setNotice('');
  }

  async function emailInvoice(invoiceId) {
    setNotice('Sending invoice PDF attachment…');
    const result = await api.emailInvoice(selected.id, invoiceId);
    setNotice(result.message);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2">
              <img src={logoSrc} alt="Fenyx Finance logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Fenyx Finance Admin</h1>
              <p className="text-sm text-slate-500">Signed in as {admin.email}</p>
            </div>
          </div>
          <button onClick={onLogout} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Log out</button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <section className="grid gap-4 md:grid-cols-4">
          {cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><Icon className="mb-4 text-blue-600" /><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Recent signups</h2>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th>Name</th><th>Email</th><th>Plan</th><th>Signup date</th><th>Status</th></tr></thead><tbody>{summary?.recentSignups.map((client) => <tr key={client.id} className="border-t"><td className="py-3 font-medium">{client.name}</td><td>{client.email}</td><td>{client.plan}</td><td>{client.signupDate}</td><td><Badge status={client.status} /></td></tr>)}</tbody></table></div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3" placeholder="Search name, email, tier…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
              <select className="rounded-xl border border-slate-200 px-3" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
              <input type="date" className="rounded-xl border border-slate-200 px-3" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
              <input type="date" className="rounded-xl border border-slate-200 px-3" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
            <table className="w-full text-left text-sm"><thead className="text-slate-500"><tr>{['name', 'email', 'plan', 'signupDate', 'status'].map((column) => <th key={column} className="py-2"><button className="flex items-center gap-1 capitalize" onClick={() => setFilters({ ...filters, sortBy: column, direction: filters.direction === 'asc' ? 'desc' : 'asc' })}>{column.replace('signupDate', 'signup date')}<ArrowDownUp className="h-3 w-3" /></button></th>)}</tr></thead><tbody>{clients.map((client) => <tr key={client.id} onClick={() => selectClient(client.id)} className="cursor-pointer border-t hover:bg-blue-50"><td className="py-3 font-semibold">{client.name}</td><td>{client.email}</td><td>{client.plan}</td><td>{client.signupDate}</td><td><Badge status={client.status} /></td></tr>)}</tbody></table>
          </div>

          {selected && <aside className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">{selected.name}</h2><p className="text-sm text-slate-500">{selected.company} • {selected.email} • {selected.phone}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Signup</p><p className="font-semibold">{selected.signupDate}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Plan</p><p className="font-semibold">{selected.plan}</p></div></div>
            <h3 className="mt-6 font-bold">Usage data</h3><div className="mt-2 grid grid-cols-2 gap-2 text-sm">{Object.entries(selected.usage).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-100 p-3"><p className="capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p><p className="font-bold">{value.toLocaleString()}</p></div>)}</div>
            <h3 className="mt-6 font-bold">Billing history</h3>{notice && <p className="mt-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{notice}</p>}
            <div className="mt-3 space-y-3">{selected.invoices.map((invoice) => <div key={invoice.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between"><div><p className="font-semibold">{invoice.invoiceNumber}</p><p className="text-sm text-slate-500">{invoice.date} • {currency.format(invoice.amount)}</p></div><Badge status={invoice.status} /></div><div className="mt-3 flex gap-2"><a className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" href={invoiceDownloadUrl(selected.id, invoice.id)}><Download className="h-4 w-4" />PDF</a><button onClick={() => emailInvoice(invoice.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><Mail className="h-4 w-4" />Email PDF</button></div></div>)}</div>
          </aside>}
        </section>
      </main>
    </div>
  );
}

function App() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { api.me().then((data) => setAdmin(data.admin)).catch(() => setAdmin(null)).finally(() => setChecking(false)); }, []);
  async function logout() { await api.logout(); setAdmin(null); }
  if (checking) return <div className="p-10 text-center">Checking secure session…</div>;
  return admin ? <Dashboard admin={admin} onLogout={logout} /> : <Login onLogin={setAdmin} />;
}

createRoot(document.getElementById('root')).render(<App />);
