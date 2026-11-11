const $ = id => document.getElementById(id);
const state = { me: null, page: 'dashboard', data: [], admins: [] };
const permNames = {
  view_users: 'View Users',
  view_markets: 'View Markets',
  view_results: 'View Results',
  manage_markets: 'Manage Markets',
  manage_results: 'Publish Results',
  manage_support: 'Manage Support',
  view_support: 'View Support',
  view_audit: 'View Activity'
};

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t.timer);
  t.timer = setTimeout(() => t.classList.remove('show'), 3500);
}

function showAuth(authed) {
  $('loginView').hidden = authed;
  $('appView').hidden = !authed;
}

function closeMenu() {
  $('sidebar').classList.remove('open');
  $('scrim').classList.remove('show');
}

async function api(path, opts = {}) {
  let r;
  try {
    r = await fetch('/api/' + path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
  } catch (err) {
    throw Error('Network connection failed (' + (err.message || 'Offline') + ')');
  }
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (!r.ok) throw Error('Server returned HTTP ' + r.status + ': ' + text.slice(0, 100));
    throw Error('Invalid JSON response from server');
  }
  if (!r.ok) throw Error(data.error || data.message || ('Request failed: HTTP ' + r.status));
  return data;
}

const post = (path, data, method = 'POST') => api(path, { method, body: JSON.stringify(data) });

function allowed(page) {
  if (!state.me) return false;
  if (state.me.role === 'admin' || state.me.admin_role === 'super_admin') return true;
  if (['dashboard', 'users', 'load-sheet', 'starline', 'game-reports'].includes(page)) return true;
  return Boolean(state.me.permissions?.includes('view_' + page));
}

function canDo(p) {
  if (state.me?.role === 'admin' || state.me?.admin_role === 'super_admin') return true;
  return Boolean(state.me?.permissions?.includes(p));
}

async function ready() {
  try {
    const meRes = await api('me');
    state.me = meRes.user ? { ...meRes.user, ...meRes } : meRes;
    showAuth(true);
    $('sideName').textContent = state.me.username || 'Admin';
    $('sideRole').textContent = (state.me.role === 'admin' || state.me.admin_role === 'super_admin') ? 'Super Administrator' : 'Administrator';
    document.querySelectorAll('#nav [data-page]').forEach(b => b.hidden = !allowed(b.dataset.page));
    await page(allowed(state.page) ? state.page : 'dashboard');
  } catch (e) {
    state.me = null;
    showAuth(false);
  }
}

$('loginForm').onsubmit = async e => {
  e.preventDefault();
  const btn = $('loginButton');
  btn.disabled = true;
  try {
    let res;
    try {
      res = await post('login', { username: $('username').value, password: $('password').value });
    } catch (e) {
      res = await post('auth/login', { username: $('username').value, password: $('password').value });
    }
    $('password').value = '';
    await ready();
    if (!state.me) throw Error('Login session could not be verified');
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
};

$('logoutButton').onclick = async () => {
  try {
    await post('logout', {});
    state.me = null;
    showAuth(false);
  } catch (e) {
    toast(e.message);
  }
};

$('menuToggle').onclick = () => {
  $('sidebar').classList.toggle('open');
  $('scrim').classList.toggle('show');
};
$('scrim').onclick = closeMenu;

document.querySelectorAll('#nav [data-page]').forEach(b => b.onclick = () => page(b.dataset.page));

function heading(title, desc) {
  $('pageTitle').textContent = title;
  $('topTitle').textContent = title;
  $('crumb').textContent = title;
  $('pageDesc').textContent = desc;
  $('headingAction').innerHTML = '';
}

async function page(name) {
  if (!allowed(name)) return toast('Permission denied');
  state.page = name;
  closeMenu();
  document.querySelectorAll('#nav [data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  $('content').innerHTML = '<div class="panel empty">Loading…</div>';
  try {
    if (name === 'dashboard') {
      heading('Dashboard Overview', 'Your workspace at a glance.');
      const d = await api('summary');
      $('content').innerHTML = `
        <div class="stats">
          ${[
            ['Users', d.users, '♙'],
            ['Active Markets', d.markets, '▤'],
            ['Open Tickets', d.tickets, '◷'],
            ['Pending Deposits', d.pending_payments || 0, '₹'],
            ['Pending Withdrawals', d.pending_withdrawals || 0, '₹']
          ].map(([label, n, icon]) => `
            <div class="stat">
              <span class="symbol">${icon}</span>
              <div class="muted">${label}</div>
              <div class="metric">${esc(n)}</div>
              <div class="muted">Live status</div>
            </div>
          `).join('')}
        </div>
        <div class="panel">
          <h2>Welcome to STAR777 Control Panel</h2>
          <p class="muted">Manage users, check real-time bet exposure (load sheet), publish Starline & market results, and review payouts from here.</p>
          <div class="quick-actions" id="quickActions"></div>
        </div>
      `;
      const q = $('quickActions');
      [
        ['users', 'Manage Users & Balances'],
        ['load-sheet', 'View Bet Exposure'],
        ['starline', 'Declare Starline Result'],
        ['markets', 'View Markets'],
        ['withdrawals', 'Process Withdrawals'],
        ['payments', 'Review Deposits']
      ].filter(([n]) => allowed(n)).forEach(([n, label]) => {
        const b = document.createElement('button');
        b.className = 'outline';
        b.textContent = label;
        b.onclick = () => page(n);
        q.appendChild(b);
      });
    } else if (name === 'users') {
      heading('User Directory & Wallets', 'View registered user accounts, balances, and manage access.');
      await renderUsers();
    } else if (name === 'load-sheet') {
      heading('Live Bet Exposure (Load Sheet)', 'Real-time market stakes, risk exposure, and bid totals.');
      await renderLoadSheet();
    } else if (name === 'starline') {
      heading('⭐ Starline Hourly Results', 'Declare and manage hourly Starline Pana and single digit results.');
      await renderStarlineAdmin();
    } else if (name === 'withdrawals') {
      heading('Withdrawal Requests', 'Verify payouts and finalize requests.');
      await renderWithdrawals();
    } else if (name === 'game-reports') {
      heading('Game Reports', 'Market and user entry history.');
      await renderGameReports();
    } else if (name === 'payments') {
      heading('Payment Requests', 'Review submitted transaction references and proof.');
      await renderPayments();
    } else if (name === 'support') {
      heading('Support Tickets', 'Review and resolve support requests.');
      await renderSupport();
    } else if (name === 'audit') {
      heading('Activity Logs', 'Review administrator actions.');
      await renderAudit();
    } else if (name === 'admins') {
      heading('Admin Management', 'Create admins and control their access.');
      await loadAdmins();
    } else {
      const meta = {
        markets: ['Market Directory', 'View configured markets and their status.'],
        results: ['Results', 'Browse published market results.']
      };
      heading(...meta[name]);
      state.data = await api(name);
      renderTable(name, state.data);
      if (name === 'markets' && canDo('manage_markets')) marketControls();
      if (name === 'results' && canDo('manage_results')) await resultControls();
    }
  } catch (e) {
    $('content').innerHTML = '<div class="panel empty">' + esc(e.message) + '</div>';
    toast(e.message);
  }
}

// 1. USER MANAGEMENT: Balance adjust, block/unblock, search
async function renderUsers() {
  const users = await api('users');
  $('content').innerHTML = `
    <div class="panel">
      <div class="toolbar">
        <div>
          <h2>User Accounts (${users.length})</h2>
          <p class="muted">Add/deduct wallet points, block/unblock accounts, or search users.</p>
        </div>
        <input id="searchUsers" type="search" placeholder="Search by name, mobile, ID...">
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Balance (₹)</th>
              <th>Status</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="userRows"></tbody>
        </table>
      </div>
    </div>
  `;

  const draw = q => {
    const term = q.toLowerCase();
    const filtered = users.filter(u =>
      (u.username || '').toLowerCase().includes(term) ||
      (u.mobile || '').includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      String(u.id).includes(term)
    );
    const tbody = $('userRows');
    if (!tbody) return;
    tbody.innerHTML = filtered.length ? filtered.map(u => `
      <tr>
        <td><strong>#${esc(u.id)}</strong></td>
        <td><strong>${esc(u.username)}</strong></td>
        <td>${esc(u.mobile || '—')}</td>
        <td>${esc(u.email || '—')}</td>
        <td><strong style="color:${Number(u.balance) > 0 ? '#1b8754' : '#6c757d'};font-size:14px">₹ ${esc(u.balance || '0.00')}</strong></td>
        <td><span class="pill ${u.is_blocked ? 'off' : ''}">${u.is_blocked ? 'Blocked' : 'Active'}</span></td>
        <td><small>${esc(u.role)}</small></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="outline" data-adjust-user="${esc(u.id)}" data-uname="${esc(u.username)}" style="padding:6px 10px;font-size:12px">+ / - Points</button>
            <button class="outline" data-toggle-block="${esc(u.id)}" data-blocked="${u.is_blocked ? 'true' : 'false'}" style="padding:6px 10px;font-size:12px;color:${u.is_blocked ? '#198754' : '#dc3545'};border-color:${u.is_blocked ? '#198754' : '#dc3545'}">
              ${u.is_blocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="empty">No users found</td></tr>';

    tbody.querySelectorAll('[data-adjust-user]').forEach(b => {
      b.onclick = async () => {
        const id = b.dataset.adjustUser;
        const uname = b.dataset.uname;
        const pts = prompt(`Adjust points for ${uname}\n(Enter e.g. 500 to add, -200 to deduct):`);
        if (!pts) return;
        const num = Number(pts);
        if (!Number.isSafeInteger(num) || num === 0) return toast('Enter valid integer points');
        const note = prompt('Enter reason / note (optional):', num > 0 ? 'Admin Deposit' : 'Admin Debit');
        b.disabled = true;
        try {
          await post('users/' + id + '/adjust-balance', { points: num, note: note || '' });
          toast(`Successfully ${num > 0 ? 'credited' : 'debited'} ${Math.abs(num)} points for ${uname}`);
          await renderUsers();
        } catch (e) {
          toast(e.message);
          b.disabled = false;
        }
      };
    });

    tbody.querySelectorAll('[data-toggle-block]').forEach(b => {
      b.onclick = async () => {
        const id = b.dataset.toggleBlock;
        const isBlocked = b.dataset.blocked === 'true';
        const action = isBlocked ? 'unblock' : 'block';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        b.disabled = true;
        try {
          await post('users/' + id + '/toggle-block', { blocked: !isBlocked });
          toast(`User ${action}ed successfully`);
          await renderUsers();
        } catch (e) {
          toast(e.message);
          b.disabled = false;
        }
      };
    });
  };

  draw('');
  $('searchUsers').oninput = e => draw(e.target.value);
}

// 2. BET EXPOSURE / LOAD SHEET: Real-time stake exposure on every number
async function renderLoadSheet() {
  const markets = await api('markets');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  $('content').innerHTML = `
    <div class="panel">
      <h2>Live Bet Exposure / Load Sheet</h2>
      <p class="muted">Monitor real-time market bets, total stake on each number, and house exposure.</p>
      <div class="toolbar" style="margin-top:14px;flex-wrap:wrap">
        <select id="loadMarket" style="max-width:200px">
          <option value="">All Markets</option>
          ${markets.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}
        </select>
        <input id="loadDate" type="date" value="${today}" style="max-width:160px">
        <select id="loadSession" style="max-width:140px">
          <option value="">All Sessions</option>
          <option value="OPEN">OPEN Session</option>
          <option value="CLOSE">CLOSE Session</option>
        </select>
        <select id="loadGameType" style="max-width:160px">
          <option value="">All Game Types</option>
          <option value="Single Digit">Single Digit</option>
          <option value="Jodi Digit">Jodi Digit</option>
          <option value="Single Pana">Single Pana</option>
          <option value="Double Pana">Double Pana</option>
          <option value="Triple Pana">Triple Pana</option>
          <option value="Half Sangam">Half Sangam</option>
          <option value="Full Sangam">Full Sangam</option>
        </select>
        <button class="primary" id="fetchLoadSheet" type="button">Check Exposure</button>
      </div>
    </div>
    <div id="exposureContainer">
      <div class="panel empty">Select filters and click "Check Exposure" to view load sheet.</div>
    </div>
  `;

  const loadData = async () => {
    const q = new URLSearchParams();
    if ($('loadMarket').value) q.set('marketId', $('loadMarket').value);
    if ($('loadDate').value) q.set('date', $('loadDate').value);
    if ($('loadSession').value) q.set('session', $('loadSession').value);
    if ($('loadGameType').value) q.set('gameType', $('loadGameType').value);

    $('exposureContainer').innerHTML = '<div class="panel empty">Loading exposure records...</div>';
    try {
      const data = await api('bet-exposure?' + q);
      const top = data.topSelections || [];
      const rows = data.breakdown || [];

      $('exposureContainer').innerHTML = `
        <div class="stats" style="margin-bottom:20px">
          <div class="stat">
            <span class="symbol">₹</span>
            <div class="muted">Total Staked Points</div>
            <div class="metric" style="color:#0e3264">₹ ${esc((data.totalStaked || 0).toLocaleString('en-IN'))}</div>
            <div class="muted">Across selected filters</div>
          </div>
          <div class="stat">
            <span class="symbol">▦</span>
            <div class="muted">Total Bets Placed</div>
            <div class="metric" style="color:#1b8754">${esc((data.totalBids || 0).toLocaleString('en-IN'))}</div>
            <div class="muted">Total tickets</div>
          </div>
          <div class="stat">
            <span class="symbol">⚠️</span>
            <div class="muted">Highest Risk Selection</div>
            <div class="metric" style="color:#d9534f;font-size:22px;margin-top:16px">
              ${top.length ? `${esc(top[0].selection)} (${esc(top[0].game_type)})` : 'None'}
            </div>
            <div class="muted">${top.length ? `₹ ${Number(top[0].total_points).toLocaleString('en-IN')} points staked` : 'No bets placed'}</div>
          </div>
        </div>

        <div class="panel">
          <div class="toolbar">
            <h2>Detailed Number Breakdown (${rows.length} selections)</h2>
            <input id="searchExposure" type="search" placeholder="Search number/selection...">
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Selection / Number</th>
                  <th>Game Type</th>
                  <th>Market</th>
                  <th>Session</th>
                  <th>Bids Count</th>
                  <th>Total Points</th>
                  <th>Risk Meter</th>
                </tr>
              </thead>
              <tbody id="exposureRows"></tbody>
            </table>
          </div>
        </div>
      `;

      const drawExposure = search => {
        const term = search.toLowerCase();
        const filtered = rows.filter(r =>
          r.selection.toLowerCase().includes(term) ||
          r.game_type.toLowerCase().includes(term) ||
          r.market_name.toLowerCase().includes(term)
        );
        const maxPts = top.length ? Number(top[0].total_points) : 1;
        const tbody = $('exposureRows');
        if (!tbody) return;
        tbody.innerHTML = filtered.length ? filtered.map((r, i) => {
          const pts = Number(r.total_points);
          const ratio = Math.min(100, Math.round((pts / maxPts) * 100));
          const riskColor = ratio > 65 ? '#d9534f' : ratio > 30 ? '#f0ad4e' : '#0275d8';
          return `
            <tr>
              <td><strong>#${i + 1}</strong></td>
              <td><strong style="font-size:16px;color:#0d2955;background:#f0f5ff;padding:3px 8px;border-radius:6px">${esc(r.selection)}</strong></td>
              <td>${esc(r.game_type)}</td>
              <td>${esc(r.market_name)}</td>
              <td><span class="pill ${r.session === 'OPEN' ? '' : 'off'}">${esc(r.session)}</span></td>
              <td>${esc(r.total_bids)} bids</td>
              <td><strong style="color:#102e5c;font-size:15px">₹ ${esc(pts.toLocaleString('en-IN'))}</strong></td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:70px;background:#e9ecef;height:8px;border-radius:4px;overflow:hidden">
                    <div style="width:${ratio}%;background:${riskColor};height:100%"></div>
                  </div>
                  <small style="color:${riskColor};font-weight:700">${ratio}%</small>
                </div>
              </td>
            </tr>
          `;
        }).join('') : '<tr><td colspan="8" class="empty">No bets placed for these filters</td></tr>';
      };

      drawExposure('');
      $('searchExposure').oninput = e => drawExposure(e.target.value);
    } catch (e) {
      $('exposureContainer').innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
      toast(e.message);
    }
  };

  $('fetchLoadSheet').onclick = loadData;
  loadData();
}

// 3. STARLINE RESULTS: Hourly Pana and single digit results
async function renderStarlineAdmin() {
  const hours = ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  $('content').innerHTML = `
    <div class="panel">
      <h2>⭐ Declare Hourly Starline Result</h2>
      <p class="muted">Enter 3-digit Pana. The single digit is calculated automatically, or you can verify it before publishing.</p>
      <form id="starlineForm" class="form-grid" style="margin-top:16px">
        <label class="field">
          Starline Hour
          <select id="starlineTime" required>
            ${hours.map(h => `<option value="${h}">STARLINE ${h}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          Date
          <input id="starlineDate" type="date" value="${today}" required>
        </label>
        <label class="field">
          3-Digit Pana
          <input id="starlinePana" required minlength="3" maxlength="3" pattern="[0-9]{3}" inputmode="numeric" placeholder="e.g. 248">
        </label>
        <label class="field">
          Single Digit (Auto-calculated)
          <input id="starlineDigit" required minlength="1" maxlength="1" pattern="[0-9]" inputmode="numeric" placeholder="e.g. 4">
        </label>
        <div class="field" style="grid-column:1 / -1">
          Result Preview:
          <div id="starlinePreview" style="padding:14px;font-size:22px;font-weight:900;color:#0d2955;background:#f0f7ff;border-radius:10px;margin-top:6px">
            *** - *
          </div>
        </div>
        <button class="primary" type="submit" style="grid-column:1 / -1;padding:14px">⭐ Publish Starline Result</button>
      </form>
    </div>

    <div class="panel">
      <h2>Today's Starline Results (${today})</h2>
      <div id="starlineResultsList" class="table-wrap">
        <p class="muted">Loading declared results...</p>
      </div>
    </div>
  `;

  const updatePreview = () => {
    const p = $('starlinePana').value;
    if (/^[0-9]{3}$/.test(p)) {
      const sum = p.split('').reduce((acc, d) => acc + Number(d), 0) % 10;
      if (!$('starlineDigit').value || $('starlineDigit').value.length === 0) {
        $('starlineDigit').value = String(sum);
      }
    }
    const d = $('starlineDigit').value;
    $('starlinePreview').textContent = (p || '***') + ' - ' + (d || '*');
  };

  $('starlinePana').oninput = () => {
    const p = $('starlinePana').value;
    if (/^[0-9]{3}$/.test(p)) {
      const sum = p.split('').reduce((acc, d) => acc + Number(d), 0) % 10;
      $('starlineDigit').value = String(sum);
    }
    updatePreview();
  };
  $('starlineDigit').oninput = updatePreview;

  const loadTodayResults = async () => {
    const el = $('starlineResultsList');
    if (!el) return;
    try {
      const results = await api('starline-results?date=' + $('starlineDate').value);
      if (!results.length) {
        el.innerHTML = '<p class="muted">No Starline results declared yet for this date.</p>';
        return;
      }
      el.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Starline Hour</th>
              <th>Pana</th>
              <th>Digit</th>
              <th>Result Text</th>
              <th>Declared Time</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr>
                <td><strong>STARLINE ${esc(r.starline_time)}</strong></td>
                <td><strong style="color:#0d2955;font-size:15px">${esc(r.pana)}</strong></td>
                <td><strong style="color:#b22222;font-size:15px">${esc(r.digit)}</strong></td>
                <td><span class="pill">${esc(r.pana)} - ${esc(r.digit)}</span></td>
                <td><small>${new Date(r.created_at).toLocaleTimeString('en-IN')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      el.innerHTML = `<p class="muted">${esc(e.message)}</p>`;
    }
  };

  $('starlineDate').onchange = loadTodayResults;
  loadTodayResults();

  $('starlineForm').onsubmit = async e => {
    e.preventDefault();
    const pana = $('starlinePana').value.trim();
    const digit = $('starlineDigit').value.trim();
    const starlineTime = $('starlineTime').value;
    const date = $('starlineDate').value;

    if (!/^[0-9]{3}$/.test(pana) || !/^[0-9]$/.test(digit)) {
      return toast('Enter 3-digit Pana and 1-digit result');
    }
    if (!confirm(`Confirm publishing Starline ${starlineTime} result: ${pana} - ${digit}?`)) return;

    const btn = e.submitter;
    btn.disabled = true;
    try {
      await post('starline-results', { starlineTime, date, pana, digit });
      toast(`Starline ${starlineTime} result declared: ${pana} - ${digit}`);
      $('starlinePana').value = '';
      $('starlineDigit').value = '';
      $('starlinePreview').textContent = '*** - *';
      await loadTodayResults();
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  };
}

// 4. MARKETS & MAIN RESULTS
function renderTable(type, rows) {
  const keys = {
    markets: [['id', 'ID'], ['name', 'Market'], ['opens', 'Opens'], ['closes', 'Closes'], ['result_time', 'Result Time'], ['status_override', 'Override'], ['enabled', 'Status']],
    results: [['id', 'ID'], ['name', 'Market'], ['result_date', 'Date'], ['open_result', 'Open'], ['close_result', 'Close']]
  }[type] || [];

  $('content').innerHTML = `
    <div class="panel">
      <div class="toolbar">
        <h2>${{ markets: 'All Markets', results: 'Recent Results' }[type] || 'Records'}</h2>
        <input id="searchTable" type="search" placeholder="Search records…">
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>${keys.map(([, label]) => '<th>' + label + '</th>').join('')}</tr></thead>
          <tbody id="tableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const draw = q => {
    const filtered = rows.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q.toLowerCase())));
    $('tableBody').innerHTML = filtered.length ? filtered.map(row => '<tr>' + keys.map(([key]) => '<td>' + (key === 'enabled' ? '<span class="pill ' + (row.enabled ? '' : 'off') + '">' + (row.enabled ? 'Active' : 'Disabled') + '</span>' : esc(key === 'created_at' || key === 'result_date' ? String(row[key] || '').slice(0, 10) : row[key] ?? '—')) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + keys.length + '" class="empty">No records found</td></tr>';
  };
  draw('');
  $('searchTable').oninput = e => draw(e.target.value);
}

function addPanel(html) {
  const div = document.createElement('div');
  div.className = 'panel';
  div.innerHTML = html;
  $('content').appendChild(div);
}

function marketControls() {
  addPanel('<h2>Add New Market</h2><form id="marketForm" class="form-grid"><label class="field">Name<input id="marketName" required placeholder="e.g. KALYAN DAY"></label><label class="field">Open Time<input id="marketOpen" required placeholder="10:00 AM"></label><label class="field">Close Time<input id="marketClose" required placeholder="12:00 PM"></label><label class="field">Result Time<input id="marketResultTime" placeholder="12:05 PM"></label><button class="primary" type="submit">Add Market</button></form><p class="muted" style="margin-top:20px">Select a market to edit.</p><select id="marketSelect">' + state.data.map(m => '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>').join('') + '</select><div class="quick-actions"><button class="outline" id="editMarket">Edit selected market</button></div>');
  $('marketForm').onsubmit = async e => {
    e.preventDefault();
    try {
      await post('markets', { name: $('marketName').value, opens: $('marketOpen').value, closes: $('marketClose').value, result_time: $('marketResultTime').value });
      toast('Market added');
      await page('markets');
    } catch (err) { toast(err.message); }
  };
  $('editMarket').onclick = async () => {
    const m = state.data.find(x => String(x.id) === $('marketSelect').value);
    if (!m) return;
    const name = prompt('Market name', m.name);
    if (name === null) return;
    const opens = prompt('Opening time', m.opens);
    if (opens === null) return;
    const closes = prompt('Closing time', m.closes);
    if (closes === null) return;
    const result_time = prompt('Result time (HH:MM AM/PM)', m.result_time || m.closes);
    if (result_time === null) return;
    const status_override = prompt('Status override: auto / holiday / closed', m.status_override || 'auto');
    if (status_override === null) return;
    const enabled = confirm('Keep market ENABLED? Cancel will disable it.');
    try {
      await post('markets/' + m.id, { name, opens, closes, result_time, status_override, enabled }, 'PATCH');
      toast('Market updated');
      await page('markets');
    } catch (e) { toast(e.message); }
  };
}

async function resultControls() {
  const markets = await api('markets');
  addPanel('<h2>Publish Open / Close Result</h2><p class="muted">Select the stage and enter a valid 3-digit Pana.</p><form id="resultForm" class="form-grid"><label class="field">Market<select id="resultMarket" required>' + markets.map(m => '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>').join('') + '</select></label><label class="field">Date<input id="resultDate" type="date" required></label><label class="field">Stage<select id="resultPhase" required><option value="open">Open Result</option><option value="close">Close Result</option></select></label><label class="field">Pana<input id="resultText" required minlength="3" maxlength="3" pattern="[0-9]{3}" inputmode="numeric" placeholder="139"></label><div class="field">Preview<div id="resultPreview" style="padding:14px;font-size:19px;font-weight:800;color:#14365e">*** - ** - ***</div></div><button class="primary" type="submit">Publish Result</button></form>');
  $('resultDate').value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const validPana = x => /^[0-9]{3}$/.test(x) && x === x.split('').sort((a, b) => '1234567890'.indexOf(a) - '1234567890'.indexOf(b)).join('');
  const preview = () => {
    const x = $('resultText').value, phase = $('resultPhase').value;
    $('resultPreview').textContent = !x ? '*** - ** - ***' : validPana(x) ? (phase === 'open' ? 'Open: ' + x + ' - ** - ***' : 'Close Pana: ' + x + ' (Jodi calculated after publishing)') : 'Invalid Pana';
  };
  $('resultText').addEventListener('input', preview);
  $('resultPhase').addEventListener('change', preview);
  $('resultForm').onsubmit = async e => {
    e.preventDefault();
    const result = $('resultText').value;
    if (!validPana(result)) return toast('Invalid Pana: use standard 220 Pana chart');
    if (!confirm('Publish ' + $('resultPhase').value.toUpperCase() + ' Pana ' + result + '?')) return;
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await post('results', { marketId: $('resultMarket').value, date: $('resultDate').value, result, phase: $('resultPhase').value });
      toast('Result published');
      await page('results');
    } catch (err) { toast(err.message); btn.disabled = false; }
  };
}

// 5. WITHDRAWALS
async function renderWithdrawals() {
  let rows = [];
  try { rows = await api('admin/withdrawals'); } catch { rows = await api('withdrawals'); }
  $('content').innerHTML = '<div class="panel"><h2>Withdrawal Queue</h2><p class="muted">Only mark completed after funds are sent and confirmed. A payout reference is required.</p><div class="table-wrap"><table><thead><tr><th>ID</th><th>User</th><th>Points</th><th>Method</th><th>Payout Details</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows.map(r => '<tr><td>' + esc(r.id) + '</td><td>' + esc(r.username) + '</td><td>₹' + esc(Number(r.amount_paise) / 100) + '</td><td>' + esc(r.method) + '</td><td>' + esc(r.payout_details) + '</td><td>' + esc(r.status) + '</td><td>' + (r.status === 'pending' ? '<button class="outline" data-complete="' + esc(r.id) + '">Complete</button> <button class="outline" data-reject="' + esc(r.id) + '">Reject</button>' : esc(r.payout_reference || '—')) + '</td></tr>').join('') + '</tbody></table></div></div>';
  document.querySelectorAll('[data-complete]').forEach(b => b.onclick = async () => {
    const reference = prompt('Enter verified bank/UPI payout reference (UTR / Ref):');
    if (!reference) return;
    try {
      await post('withdrawals/' + b.dataset.complete + '/review', { status: 'completed', reference });
      toast('Withdrawal completed');
      await renderWithdrawals();
    } catch (e) { toast(e.message); }
  });
  document.querySelectorAll('[data-reject]').forEach(b => b.onclick = async () => {
    if (!confirm('Reject withdrawal and release reserved points?')) return;
    try {
      await post('withdrawals/' + b.dataset.reject + '/review', { status: 'rejected' });
      toast('Withdrawal rejected');
      await renderWithdrawals();
    } catch (e) { toast(e.message); }
  });
}

// 6. PAYMENT REQUESTS
async function renderPayments() {
  let rows = [];
  try { rows = await api('admin/payment-requests'); } catch { rows = await api('payment-requests'); }
  $('content').innerHTML = '<div class="panel"><h2>Payment Verification Queue</h2><p class="muted">Confirm funds against UPI/bank records using the 12-digit UTR before approval.</p><div class="table-wrap"><table><thead><tr><th>ID</th><th>User</th><th>Method</th><th>Amount</th><th>UTR Reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows.map(r => '<tr><td>' + esc(r.id) + '</td><td>' + esc(r.username) + '</td><td>' + esc(r.method.toUpperCase()) + '</td><td><strong>₹' + esc((Number(r.amount_paise) / 100).toFixed(2)) + '</strong></td><td><strong style="color:#0d2955;letter-spacing:1px">' + esc(r.utr) + '</strong></td><td><span class="pill ' + (r.status === 'approved' ? '' : r.status === 'rejected' ? 'off' : '') + '">' + esc(r.status) + '</span></td><td><button class="outline" data-proof="' + esc(r.id) + '">Proof</button> ' + (r.status === 'pending' ? '<button class="outline" data-review="' + esc(r.id) + '" data-decision="approved" style="color:#1b8754;border-color:#1b8754">Approve</button> <button class="outline" data-review="' + esc(r.id) + '" data-decision="rejected" style="color:#dc3545;border-color:#dc3545">Reject</button>' : '') + '</td></tr>').join('') + '</tbody></table></div><div id="paymentProof" style="margin-top:16px"></div></div>';
  document.querySelectorAll('[data-proof]').forEach(b => b.onclick = async () => {
    const id = b.dataset.proof;
    const req = rows.find(x => String(x.id) === String(id));
    const box = $('paymentProof');
    box.innerHTML = '';
    if (req && req.proof_data && req.proof_data.startsWith('data:image')) {
      box.innerHTML = '<div class="panel"><h3>Submitted Proof Image for Request #' + esc(id) + '</h3><img src="' + req.proof_data + '" alt="Payment Proof" style="max-width:100%;max-height:450px;border-radius:10px;border:1px solid #ccc;display:block;margin-top:10px"></div>';
    } else {
      box.innerHTML = '<div class="panel"><h3>Proof Details for Request #' + esc(id) + '</h3><p>Verified via 12-digit UTR: <strong>' + esc(req ? req.utr : '') + '</strong> (No image uploaded)</p></div>';
    }
  });
  document.querySelectorAll('[data-review]').forEach(b => b.onclick = async () => {
    const decision = b.dataset.decision;
    if (!confirm('Confirm ' + decision + ' for request #' + b.dataset.review + '?')) return;
    try {
      await post('payment-requests/' + b.dataset.review + '/review', { status: decision });
      toast('Request ' + decision);
      await renderPayments();
    } catch (e) { toast(e.message); }
  });
}

// 7. GAME REPORTS
async function renderGameReports() {
  const [summary, entries] = await Promise.all([api('game-entry-summary').catch(() => []), api('game-entries').catch(() => [])]);
  $('content').innerHTML = '<div class="panel"><h2>Market-wise summary</h2><div class="table-wrap"><table><thead><tr><th>Market</th><th>Entries</th><th>Users</th><th>Points</th></tr></thead><tbody>' + summary.map(r => '<tr><td>' + esc(r.market) + '</td><td>' + esc(r.entries) + '</td><td>' + esc(r.users) + '</td><td>' + esc(r.total_points) + '</td></tr>').join('') + '</tbody></table></div></div><div class="panel"><h2>Entry history</h2><div class="toolbar"><input id="entryUser" placeholder="User ID" inputmode="numeric"><select id="entryMarket"><option value="">All markets</option>' + summary.map(r => '<option value="' + esc(r.market_id) + '">' + esc(r.market) + '</option>').join('') + '</select><input id="entryDate" type="date"><button class="outline" id="filterEntries">Filter</button></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>User</th><th>Market</th><th>Game</th><th>Selection</th><th>Points</th><th>Session</th><th>Date</th></tr></thead><tbody id="entryRows"></tbody></table></div></div>';
  const draw = r => {
    $('entryRows').innerHTML = r.length ? r.map(x => '<tr><td>' + esc(x.id) + '</td><td>' + esc(x.username) + ' (#' + esc(x.user_id) + ')</td><td>' + esc(x.market) + '</td><td>' + esc(x.game_type) + '</td><td>' + esc(x.selection) + '</td><td>' + esc(x.points) + '</td><td>' + esc(x.session) + '</td><td>' + esc(String(x.entry_date).slice(0, 10)) + '</td></tr>').join('') : '<tr><td colspan="8">No entries recorded</td></tr>';
  };
  draw(entries);
  $('filterEntries').onclick = async () => {
    try {
      const q = new URLSearchParams();
      if ($('entryUser').value) q.set('user', $('entryUser').value.trim());
      if ($('entryMarket').value) q.set('market', $('entryMarket').value);
      if ($('entryDate').value) q.set('date', $('entryDate').value);
      draw(await api('game-entries?' + q));
    } catch (e) { toast(e.message); }
  };
}

// 8. SUPPORT & AUDIT
async function renderSupport() {
  const tickets = await api('support');
  $('content').innerHTML = '<div class="panel"><h2>Support Inbox</h2><div id="tickets"></div></div>';
  $('tickets').innerHTML = tickets.map(t => '<div class="admin-card"><div class="admin-top"><div><strong>#' + esc(t.id) + ' · ' + esc(t.username) + '</strong><small>' + esc(String(t.created_at).slice(0, 10)) + '</small></div><span class="pill">' + esc(t.status) + '</span></div><p>' + esc(t.message) + '</p>' + (canDo('manage_support') ? '<div class="quick-actions"><select data-ticket="' + esc(t.id) + '"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><button class="outline" data-ticket-save="' + esc(t.id) + '">Save status</button></div>' : '') + '</div>').join('') || '<div class="empty">No tickets</div>';
  tickets.forEach(t => {
    const sel = document.querySelector('[data-ticket="' + t.id + '"]');
    if (sel) sel.value = t.status;
  });
  document.querySelectorAll('[data-ticket-save]').forEach(b => b.onclick = async () => {
    try {
      await post('support/' + b.dataset.ticketSave, { status: document.querySelector('[data-ticket="' + b.dataset.ticketSave + '"]').value }, 'PATCH');
      toast('Ticket updated');
      await renderSupport();
    } catch (e) { toast(e.message); }
  });
}

async function renderAudit() {
  const rows = await api('audit').catch(() => []);
  $('content').innerHTML = '<div class="panel"><h2>Administrator Activity</h2><div class="table-wrap"><table><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead><tbody>' + rows.map(x => '<tr><td>' + esc(String(x.created_at).slice(0, 19).replace('T', ' ')) + '</td><td>' + esc(x.admin) + '</td><td>' + esc(x.action) + '</td><td>' + esc(x.target) + '</td></tr>').join('') + '</tbody></table></div></div>';
}

async function loadAdmins() {
  state.admins = await api('admins').catch(() => []);
  $('content').innerHTML = '<div class="panel"><div class="toolbar"><div><h2>Create New Admin</h2><p class="muted">Only the Super Admin can add accounts.</p></div></div><form id="createAdmin"><div class="form-grid"><label class="field">Username<input id="newUser" required minlength="3" maxlength="24" placeholder="e.g. support_admin"></label><label class="field">Email<input id="newEmail" type="email" required placeholder="admin@example.com"></label><label class="field">Temporary password<input id="newPass" type="password" minlength="16" maxlength="128" required autocomplete="new-password" placeholder="At least 16 characters"></label></div><div class="checkrow">' + Object.entries(permNames).map(([p, label]) => '<label><input type="checkbox" data-new-perm="' + p + '"> ' + label + '</label>').join('') + '</div><button class="primary" type="submit">+ Create Admin</button></form></div><div class="panel"><h2>Administrator Accounts</h2><p class="muted">Update permissions or disable access for an administrator.</p><div id="adminList"></div></div>';
  $('createAdmin').onsubmit = async e => {
    e.preventDefault();
    const permissions = [...document.querySelectorAll('[data-new-perm]:checked')].map(x => x.dataset.newPerm);
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await post('admins', { username: $('newUser').value, email: $('newEmail').value, password: $('newPass').value, permissions });
      toast('Administrator created');
      await loadAdmins();
    } catch (err) { toast(err.message); btn.disabled = false; }
  };
  const list = $('adminList');
  list.innerHTML = state.admins.map(a => '<div class="admin-card"><div class="admin-top"><div><strong>' + esc(a.username) + '</strong> <span class="pill ' + (a.enabled ? '' : 'off') + '">' + (a.enabled ? 'Active' : 'Disabled') + '</span><small>' + esc(a.email) + ' · ' + (a.admin_role === 'super_admin' ? 'Super Administrator' : 'Administrator') + '</small></div>' + (a.admin_role === 'super_admin' ? '<span class="pill">Protected</span>' : '<button class="outline" data-save="' + esc(a.id) + '">Save changes</button>') + '</div>' + (a.admin_role === 'super_admin' ? '' : '<div class="checkrow"><label><input type="checkbox" data-enabled="' + esc(a.id) + '" ' + (a.enabled ? 'checked' : '') + '> Enabled</label>' + Object.entries(permNames).map(([p, label]) => '<label><input type="checkbox" data-perm="' + p + '" data-admin="' + esc(a.id) + '" ' + (a.permissions.includes(p) ? 'checked' : '') + '> ' + label + '</label>').join('') + '</div>') + '</div>').join('') || '<div class="empty">No administrators found</div>';
  list.querySelectorAll('[data-save]').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.save;
    const enabled = list.querySelector('[data-enabled="' + id + '"]').checked;
    const permissions = [...list.querySelectorAll('[data-admin="' + id + '"]:checked')].map(x => x.dataset.perm);
    btn.disabled = true;
    try {
      await post('admins/' + id, { enabled, permissions }, 'PATCH');
      toast('Permissions saved');
      await loadAdmins();
    } catch (e) { toast(e.message); btn.disabled = false; }
  });
}

ready();
