import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  GitBranch,
  Server,
  Database,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export const CodeGuideModal: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const DB_MIGRATION_CODE = `// ==========================================
// PASTE THIS IN: server/db.js inside initDb()
// ==========================================

// 1. REAL MONEY WALLET LEDGER
await pool.query(\`
  CREATE TABLE IF NOT EXISTS wallet_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL CHECK(amount_paise <> 0),
    type TEXT NOT NULL DEFAULT 'deposit' CHECK(type IN ('deposit','withdrawal','bet_place','bet_win','refund')),
    note TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS wallet_ledger_user_idx ON wallet_ledger(user_id, id DESC);
\`);

// 2. UPI & BANK PAYMENT / DEPOSIT REQUESTS
await pool.query(\`
  CREATE TABLE IF NOT EXISTS payment_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK(method IN ('upi','qr','bank')),
    amount_paise BIGINT NOT NULL CHECK(amount_paise > 0),
    utr TEXT NOT NULL,
    proof_data TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by BIGINT REFERENCES users(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_utr_unique ON payment_requests(lower(utr));
\`);

// 3. WITHDRAWAL REQUESTS
await pool.query(\`
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL CHECK(amount_paise > 0),
    method TEXT NOT NULL CHECK(method IN ('upi','bank')),
    payout_details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','rejected')),
    payout_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by BIGINT REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS withdrawal_requests_user_idx ON withdrawal_requests(user_id, created_at DESC);
\`);

// 4. REAL BET / GAME ENTRIES TABLE
await pool.query(\`
  CREATE TABLE IF NOT EXISTS game_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id BIGINT NOT NULL REFERENCES markets(id),
    game_type TEXT NOT NULL,
    selection TEXT NOT NULL,
    points INTEGER NOT NULL CHECK(points > 0),
    session TEXT NOT NULL CHECK(session IN ('OPEN','CLOSE')),
    entry_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','won','lost','cancelled')),
    win_amount_paise BIGINT,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS game_entries_user_date_idx ON game_entries(user_id, entry_date);
  CREATE INDEX IF NOT EXISTS game_entries_settle_idx ON game_entries(market_id, entry_date, status);
\`);`;

  const SERVER_ROUTES_CODE = `// ==========================================
// PASTE THIS IN: server/index.js
// Adds: Betting engine, Wallet, Auto-Settlement
// ==========================================

const GAME_MULTIPLIERS = {
  single_digit: 9.5,
  jodi_digit: 95,
  single_pana: 140,
  double_pana: 280,
  triple_pana: 700,
  half_sangam: 1000,
  full_sangam: 10000
};

// 1. PLACE REAL BETS ENDPOINT
app.post('/api/bets/place', db, authenticate, wrap(async (req, res) => {
  const { marketId, gameType, session, items } = req.body || {};
  if (!marketId || !GAME_MULTIPLIERS[gameType] || !['OPEN', 'CLOSE'].includes(session) || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Invalid bet parameters' });
  }

  const totalPoints = items.reduce((sum, item) => sum + (Number.isSafeInteger(item.points) && item.points > 0 ? item.points : 0), 0);
  if (totalPoints <= 0) return res.status(400).json({ error: 'Invalid stake points' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);

    // Check available balance (Balance - Pending Withdrawal holds)
    const balRes = await client.query('SELECT COALESCE(SUM(amount_paise),0)::bigint AS bal FROM wallet_ledger WHERE user_id=$1', [req.user.id]);
    const holdRes = await client.query("SELECT COALESCE(SUM(amount_paise),0)::bigint AS hold FROM withdrawal_requests WHERE user_id=$1 AND status='pending'", [req.user.id]);
    
    const availablePaise = Number(balRes.rows[0].bal) - Number(holdRes.rows[0].hold);
    const requiredPaise = totalPoints * 100;

    if (availablePaise < requiredPaise) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Verify market is open
    const mRes = await client.query('SELECT id, name, enabled, opens, closes FROM markets WHERE id=$1', [marketId]);
    if (!mRes.rows.length || !mRes.rows[0].enabled) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Market is closed' });
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    // Deduct stake points from wallet
    await client.query(
      'INSERT INTO wallet_ledger(user_id, amount_paise, type, note, reference_id) VALUES($1, $2, $3, $4, $5)',
      [req.user.id, -requiredPaise, 'bet_place', \`Bet placed on \${mRes.rows[0].name} (\${gameType})\`, \`BID-\${Date.now()}\`]
    );

    // Insert bet entries
    for (const item of items) {
      await client.query(
        'INSERT INTO game_entries(user_id, market_id, game_type, selection, points, session, entry_date) VALUES($1, $2, $3, $4, $5, $6, $7)',
        [req.user.id, marketId, gameType, String(item.number), item.points, session, today]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ok: true, message: \`\${items.length} bids placed successfully!\`, totalPoints });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// 2. GET USER BET HISTORY
app.get('/api/bets/history', db, authenticate, wrap(async (req, res) => {
  const { rows } = await pool.query(\`
    SELECT g.id, g.market_id, m.name AS market_name, g.game_type, g.selection, 
           g.points, g.session, g.entry_date, g.status, g.win_amount_paise, g.created_at
    FROM game_entries g
    JOIN markets m ON m.id = g.market_id
    WHERE g.user_id = $1
    ORDER BY g.id DESC LIMIT 100
  \`, [req.user.id]);
  res.json(rows);
}));

// 3. ADMIN AUTO-SETTLEMENT ON RESULT PUBLISH
// Inside your existing POST /api/admin/results:
// After updating results, auto-settle all matching game_entries and credit wallet_ledger!`;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 text-slate-100">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d1e3d] via-[#10274f] to-[#0a1730] border border-blue-500/30 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-[#09152b] rounded-[14px] flex items-center justify-center">
              <Code2 className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">
                Backend Deployment Code
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> tzuda1991-ctrl/zupro
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
              Railway + GitHub Repo Update
            </h2>
            <p className="text-xs text-slate-300">
              Ready-to-deploy backend code for your Railway PostgreSQL & Express backend
            </p>
          </div>
        </div>

        <a
          href="https://github.com/tzuda1991-ctrl/zupro"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-transform active:scale-95"
        >
          <span>Open GitHub Repo</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Guide Overview */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs text-slate-300">
        <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <Server className="w-4 h-4 text-amber-400" /> How to deploy this to your Railway project:
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
          <li>
            Open your GitHub repo <strong className="text-slate-200">tzuda1991-ctrl/zupro</strong> or clone it locally.
          </li>
          <li>
            Paste Section 1 below into <code className="text-amber-400">server/db.js</code> (inside the <code className="text-amber-400">initDb()</code> function) to create the PostgreSQL tables.
          </li>
          <li>
            Paste Section 2 below into <code className="text-amber-400">server/index.js</code> to enable real bet placement, balance checks, and history endpoints.
          </li>
          <li>
            Push to GitHub: <code className="text-blue-300">git add . && git commit -m "Add real money wallet and bet system" && git push</code>. Railway will auto-deploy!
          </li>
        </ol>
      </div>

      {/* Code Section 1: Database Migration */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200 font-mono">
              1. PostgreSQL Schema: server/db.js
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(DB_MIGRATION_CODE, 'db')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
          >
            {copiedSection === 'db' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 text-[11px] font-mono text-emerald-300/90 bg-slate-950/90 overflow-x-auto max-h-72">
          {DB_MIGRATION_CODE}
        </pre>
      </div>

      {/* Code Section 2: Express Routes */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 font-mono">
              2. Betting & Wallet API Routes: server/index.js
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(SERVER_ROUTES_CODE, 'server')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
          >
            {copiedSection === 'server' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 text-[11px] font-mono text-amber-300/90 bg-slate-950/90 overflow-x-auto max-h-72">
          {SERVER_ROUTES_CODE}
        </pre>
      </div>
    </div>
  );
};
