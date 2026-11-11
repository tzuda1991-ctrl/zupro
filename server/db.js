import pg from 'pg';
const {Pool}=pg;
export const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,max:5}):null;
export async function initDb(){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS users(id BIGSERIAL PRIMARY KEY,username TEXT NOT NULL UNIQUE,mobile TEXT UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS sessions(id_hash TEXT PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL);
 CREATE TABLE IF NOT EXISTS markets(id BIGSERIAL PRIMARY KEY,name TEXT NOT NULL UNIQUE,opens TEXT NOT NULL,closes TEXT NOT NULL,enabled BOOLEAN NOT NULL DEFAULT true);
 CREATE TABLE IF NOT EXISTS results(id BIGSERIAL PRIMARY KEY,market_id BIGINT NOT NULL REFERENCES markets(id),result_date DATE NOT NULL,result_text TEXT NOT NULL,UNIQUE(market_id,result_date));
 CREATE TABLE IF NOT EXISTS notifications(id BIGSERIAL PRIMARY KEY,user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,message TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS support_tickets(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS demo_ledger(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),delta INTEGER NOT NULL,note TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
 await pool.query("ALTER TABLE markets ADD COLUMN IF NOT EXISTS result_time TEXT");
 await pool.query("ALTER TABLE markets ADD COLUMN IF NOT EXISTS status_override TEXT");
 await pool.query("UPDATE markets SET result_time=closes WHERE result_time IS NULL");
 await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT");
 await pool.query("CREATE TABLE IF NOT EXISTS fcm_devices(user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token TEXT PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
 await pool.query("CREATE TABLE IF NOT EXISTS push_subscriptions(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,endpoint TEXT NOT NULL UNIQUE,subscription JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
 await pool.query("ALTER TABLE results ADD COLUMN IF NOT EXISTS open_result TEXT");
 await pool.query("ALTER TABLE results ADD COLUMN IF NOT EXISTS close_result TEXT");
 await pool.query("UPDATE results SET open_result=result_text WHERE open_result IS NULL AND close_result IS NULL AND result_text ~ '^[0-9]{3}$'");
 await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email)) WHERE email IS NOT NULL");
 await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_otps(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,code_hash TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,attempts_left INT NOT NULL DEFAULT 5,requested_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 await pool.query(`CREATE TABLE IF NOT EXISTS pending_registrations(email TEXT PRIMARY KEY,username TEXT NOT NULL,mobile TEXT,password_hash TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,attempts_left INTEGER NOT NULL DEFAULT 5,requested_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 await pool.query(`CREATE TABLE IF NOT EXISTS payment_requests(
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 method TEXT NOT NULL CHECK(method IN ('upi','qr','bank')),
 amount_paise BIGINT NOT NULL CHECK(amount_paise>0),
 utr TEXT NOT NULL,
 proof_data TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 reviewed_at TIMESTAMPTZ,
 reviewed_by BIGINT REFERENCES users(id)
 )`);
 await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_utr_unique ON payment_requests(lower(utr))");
 await pool.query(`CREATE TABLE IF NOT EXISTS wallet_ledger(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),amount_paise BIGINT NOT NULL CHECK(amount_paise<>0),payment_request_id BIGINT UNIQUE REFERENCES payment_requests(id),note TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 await pool.query(`CREATE TABLE IF NOT EXISTS game_entries(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),market_id BIGINT NOT NULL REFERENCES markets(id),game_type TEXT NOT NULL,selection TEXT NOT NULL,points INTEGER NOT NULL CHECK(points>0),session TEXT NOT NULL CHECK(session IN ('OPEN','CLOSE')),entry_date DATE NOT NULL,status TEXT NOT NULL DEFAULT 'recorded',created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 await pool.query("CREATE INDEX IF NOT EXISTS game_entries_market_date_idx ON game_entries(market_id,entry_date)");
 await pool.query("CREATE INDEX IF NOT EXISTS game_entries_user_date_idx ON game_entries(user_id,entry_date)");
 const markets=[['LAXMI MORNING','10:00 AM','12:00 PM'],['KARNATAKA DAY','10:15 AM','11:15 AM'],['MILAN MORNING','10:30 AM','11:30 AM'],['SRIDEVI','11:00 AM','12:00 PM'],['MAIN BAZAR DAY','01:00 PM','03:00 PM'],['SUPREME NIGHT','08:00 PM','10:00 PM']];
 for(const [name,opens,closes] of markets)await pool.query('INSERT INTO markets(name,opens,closes) VALUES($1,$2,$3) ON CONFLICT(name) DO NOTHING',[name,opens,closes]);
}