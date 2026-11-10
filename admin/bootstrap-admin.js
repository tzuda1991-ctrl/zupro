// One-time, operator-run bootstrap. No public signup or admin-creation endpoint.
import pg from 'pg';
import {randomBytes,scrypt as cb} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(cb);
const username='star777admin';
const email='tufail.dhorajiwala@gmail.com';
const password=process.env.ADMIN_BOOTSTRAP_PASSWORD;
if(!process.env.DATABASE_URL||!password||password.length<16||password.length>128){
 console.error('Set DATABASE_URL and ADMIN_BOOTSTRAP_PASSWORD (16-128 characters) securely before running.');process.exit(1);
}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
try{
 const salt=randomBytes(16).toString('hex');
 const passwordHash=salt+':'+(await scrypt(password,salt,64)).toString('hex');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const existing=await client.query('SELECT id,username,email FROM users WHERE username=$1 OR lower(email)=$2 FOR UPDATE',[username,email]);
  if(existing.rowCount){throw new Error('Username or email already exists. No existing account was modified.');}
  const created=await client.query("INSERT INTO users(username,email,mobile,password_hash,role) VALUES($1,$2,NULL,$3,'admin') RETURNING id,username,email,role",[username,email,passwordHash]);
  await client.query("CREATE TABLE IF NOT EXISTS admin_accounts(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,admin_role TEXT NOT NULL CHECK(admin_role IN ('super_admin','admin')),enabled BOOLEAN NOT NULL DEFAULT true,permissions TEXT[] NOT NULL DEFAULT '{}',created_by BIGINT REFERENCES users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now())");await client.query("CREATE UNIQUE INDEX IF NOT EXISTS single_super_admin ON admin_accounts(admin_role) WHERE admin_role='super_admin'");await client.query("INSERT INTO admin_accounts(user_id,admin_role,permissions) VALUES($1,'super_admin',ARRAY['view_users','view_markets','view_results'])",[created.rows[0].id]);await client.query('COMMIT');
  console.log('Admin created:',JSON.stringify(created.rows[0]));
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}catch(e){console.error('Bootstrap failed:',e.message);process.exitCode=1}
finally{await pool.end()}
