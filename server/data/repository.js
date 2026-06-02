import pg from 'pg';
import { clients as seedClients } from './seed.js';

const { Pool } = pg;
const memoryClients = structuredClone(seedClients);
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false } })
  : null;

const normalize = (row) => ({
  ...row,
  signupDate: row.signup_date ?? row.signupDate,
  lineItems: row.line_items ?? row.lineItems,
});

function filterSortClients(list, query = {}) {
  const search = query.search?.toLowerCase().trim();
  const status = query.status?.toLowerCase();
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  const sortBy = ['name', 'email', 'plan', 'signupDate', 'status'].includes(query.sortBy) ? query.sortBy : 'signupDate';
  const direction = query.direction === 'asc' ? 1 : -1;

  return list
    .filter((client) => {
      const clientDate = new Date(client.signupDate);
      const matchesSearch = !search || [client.name, client.email, client.plan, client.company].some((value) => value.toLowerCase().includes(search));
      const matchesStatus = !status || status === 'all' || client.status === status;
      const matchesFrom = !from || clientDate >= from;
      const matchesTo = !to || clientDate <= to;
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    })
    .sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy])) * direction);
}

export async function getClients(query) {
  if (!pool) return filterSortClients(memoryClients, query);

  const { rows } = await pool.query(`
    SELECT c.*, COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0)::numeric AS revenue
    FROM clients c
    LEFT JOIN invoices i ON i.client_id = c.id
    GROUP BY c.id
  `);
  return filterSortClients(rows.map(normalize), query);
}

export async function getClientById(id) {
  if (!pool) return memoryClients.find((client) => client.id === id);

  const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
  const client = clientResult.rows[0];
  if (!client) return null;
  const invoices = await getInvoicesForClient(id);
  return { ...normalize(client), invoices };
}

export async function getInvoicesForClient(clientId) {
  if (!pool) return memoryClients.find((client) => client.id === clientId)?.invoices ?? [];

  const { rows } = await pool.query('SELECT * FROM invoices WHERE client_id = $1 ORDER BY date DESC', [clientId]);
  return rows.map(normalize);
}

export async function getInvoice(clientId, invoiceId) {
  const client = await getClientById(clientId);
  const invoice = client?.invoices?.find((item) => item.id === invoiceId);
  return invoice ? { client, invoice } : null;
}

export async function getSummary() {
  if (pool) {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_clients,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_clients,
        (SELECT COUNT(*)::int FROM invoices WHERE status IN ('unpaid', 'overdue')) AS pending_invoices,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM invoices WHERE status = 'paid') AS revenue
      FROM clients
    `);
    const recentSignups = (await getClients({ sortBy: 'signupDate', direction: 'desc' })).slice(0, 5);
    return {
      totalClients: rows[0].total_clients,
      activeClients: rows[0].active_clients,
      pendingInvoices: rows[0].pending_invoices,
      revenue: Number(rows[0].revenue),
      recentSignups,
    };
  }

  const allClients = await getClients({});
  const invoices = allClients.flatMap((client) => client.invoices ?? []);
  return {
    totalClients: allClients.length,
    activeClients: allClients.filter((client) => client.status === 'active').length,
    pendingInvoices: invoices.filter((invoice) => ['unpaid', 'overdue'].includes(invoice.status)).length,
    revenue: allClients.reduce((sum, client) => sum + Number(client.revenue ?? 0), 0),
    recentSignups: allClients.slice().sort((a, b) => new Date(b.signupDate) - new Date(a.signupDate)).slice(0, 5),
  };
}
