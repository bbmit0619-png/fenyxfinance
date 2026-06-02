import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getClientById, getClients, getInvoice, getSummary } from './data/repository.js';
import { createInvoicePdf } from './services/invoicePdf.js';
import { sendInvoiceEmail } from './services/email.js';

const app = express();
const PORT = process.env.PORT ?? 4000;
const JWT_SECRET = process.env.JWT_SECRET ?? 'development-only-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@fenyxfinance.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'demo-password-123';
const COOKIE_NAME = 'fenyx_admin_session';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }));

function issueSession(res) {
  const token = jwt.sign({ sub: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { expiresIn: '8h', issuer: 'fenyxfinance-admin' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAMESITE ?? 'lax',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
  });
  return token;
}

function getRequestToken(req) {
  const bearerToken = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  return req.cookies[COOKIE_NAME] ?? bearerToken;
}

function requireAdmin(req, res, next) {
  const token = getRequestToken(req);
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  try {
    req.admin = jwt.verify(token, JWT_SECRET, { issuer: 'fenyxfinance-admin' });
    return next();
  } catch {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ message: 'Session expired' });
  }
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const validEmail = email === ADMIN_EMAIL;
  const validPassword = await bcrypt.compare(password ?? '', passwordHash);

  if (!validEmail || !validPassword) return res.status(401).json({ message: 'Invalid admin credentials' });
  const token = issueSession(res);
  return res.json({ admin: { email: ADMIN_EMAIL, role: 'admin' }, token });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ admin: { email: req.admin.sub, role: req.admin.role } });
});

app.get('/api/summary', requireAdmin, async (_req, res) => res.json(await getSummary()));
app.get('/api/clients', requireAdmin, async (req, res) => res.json(await getClients(req.query)));
app.get('/api/clients/:id', requireAdmin, async (req, res) => {
  const client = await getClientById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  return res.json(client);
});

app.get('/api/clients/:clientId/invoices/:invoiceId/download', requireAdmin, async (req, res) => {
  const record = await getInvoice(req.params.clientId, req.params.invoiceId);
  if (!record) return res.status(404).json({ message: 'Invoice not found' });
  const pdfBuffer = await createInvoicePdf(record);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${record.invoice.invoiceNumber}.pdf"`);
  return res.send(pdfBuffer);
});

app.post('/api/clients/:clientId/invoices/:invoiceId/email', requireAdmin, async (req, res) => {
  const record = await getInvoice(req.params.clientId, req.params.invoiceId);
  if (!record) return res.status(404).json({ message: 'Invoice not found' });
  const pdfBuffer = await createInvoicePdf(record);
  const info = await sendInvoiceEmail({ ...record, pdfBuffer });
  return res.json({ message: 'Invoice PDF emailed as a binary attachment', messageId: info.messageId ?? 'json-transport-preview' });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.use((_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Fenyx Finance admin server listening on ${PORT}`);
});
