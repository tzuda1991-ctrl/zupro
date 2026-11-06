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
 const markets=[['LAXMI MORNING','10:00 AM','12:00 PM'],['KARNATAKA DAY','10:15 AM','11:15 AM'],['MILAN MORNING','10:30 AM','11:30 AM'],['SRIDEVI','11:00 AM','12:00 PM'],['MAIN BAZAR DAY','01:00 PM','03:00 PM'],['SUPREME NIGHT','08:00 PM','10:00 PM']];
 for(const [name,opens,closes] of markets)await pool.query('INSERT INTO markets(name,opens,closes) VALUES($1,$2,$3) ON CONFLICT(name) DO NOTHING',[name,opens,closes]);
}