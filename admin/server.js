import express from 'express';
import pg from 'pg';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import {randomBytes,createHash,scrypt as scryptCb,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const app=express(),scrypt=promisify(scryptCb);
app.disable('x-powered-by');app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'","'unsafe-inline'"],styleSrc:["'self'","'unsafe-inline'"],connectSrc:["'self'"],imgSrc:["'self'","data:"],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"]}}}));app.use(express.json({limit:'12kb'}));app.use(cookieParser());
const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL,max:5}):null;
const SUPER_USERNAME='star777admin';
const permissions=['view_users','view_markets','view_results'];
const validPerms=x=>Array.isArray(x)&&x.every(p=>permissions.includes(p))?[...new Set(x)]:null;
const isSuper=req=>req.admin?.username===SUPER_USERNAME&&req.admin?.admin_role==='super_admin';
const superOnly=(req,res,next)=>isSuper(req)?next():res.status(403).json({error:'Super Admin only'});
const requirePermission=p=>(req,res,next)=>isSuper(req)||req.admin?.permissions?.includes(p)?next():res.status(403).json({error:'Permission denied'});
const digest=x=>createHash('sha256').update(x).digest('hex');
const wrap=f=>(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next);
app.get('/api/health',(req,res)=>res.json({ok:true,database:!!pool}));
app.use('/api',(req,res,next)=>{if(!pool)return res.status(503).json({error:'Database unavailable'});if(req.method==='GET')return next();const origin=req.get('origin');if(!origin)return res.status(403).json({error:'Origin denied'});let expected,actual;try{expected=new URL(process.env.ADMIN_ORIGIN).origin;actual=new URL(origin).origin}catch{return res.status(403).json({error:'Origin denied'})}const host=req.get('x-forwarded-host')||req.get('host');const actualHost=new URL(actual).host;if(actual!==expected||actualHost!==host)return res.status(403).json({error:'Origin denied'});next()});
const loginLimit=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false});
app.post('/api/login',loginLimit,wrap(async(req,res)=>{const {username,password}=req.body||{};if(typeof username!=='string'||typeof password!=='string'||username.length>254||password.length>128)return res.status(401).json({error:'Invalid credentials'});const {rows}=await pool.query("SELECT u.id,u.username,u.password_hash FROM users u JOIN admin_accounts a ON a.user_id=u.id WHERE (u.username=$1 OR lower(u.email)=$1) AND u.role='admin' AND a.enabled=true LIMIT 1",[username.trim().toLowerCase()]);if(!rows.length)return res.status(401).json({error:'Invalid credentials'});const [salt,hex]=rows[0].password_hash.split(':');if(!/^[a-f0-9]{32}$/i.test(salt)||!/^[a-f0-9]{128}$/i.test(hex))return res.status(401).json({error:'Invalid credentials'});const expected=Buffer.from(hex,'hex'),actual=await scrypt(password,salt,expected.length);if(!timingSafeEqual(expected,actual))return res.status(401).json({error:'Invalid credentials'});const token=randomBytes(32).toString('hex');await pool.query("INSERT INTO admin_sessions(id_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digest(token),rows[0].id]);res.cookie('star777_admin',token,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:28800000});res.json({username:rows[0].username})}));
const auth=wrap(async(req,res,next)=>{const token=req.cookies.star777_admin;if(!token)return res.status(401).json({error:'Login required'});const {rows}=await pool.query("SELECT u.id,u.username,a.admin_role,a.permissions FROM admin_sessions s JOIN users u ON u.id=s.user_id JOIN admin_accounts a ON a.user_id=u.id WHERE s.id_hash=$1 AND s.expires_at>now() AND u.role='admin' AND a.enabled=true",[digest(token)]);if(!rows.length)return res.status(401).json({error:'Session expired'});req.admin=rows[0];next()});
app.get('/api/me',auth,(req,res)=>res.json(req.admin));
app.post('/api/logout',auth,wrap(async(req,res)=>{await pool.query('DELETE FROM admin_sessions WHERE id_hash=$1',[digest(req.cookies.star777_admin)]);res.clearCookie('star777_admin',{path:'/'});res.json({ok:true})}));
app.get('/api/summary',auth,wrap(async(req,res)=>{const [u,m,t]=await Promise.all([pool.query('SELECT count(*)::int AS count FROM users'),pool.query('SELECT count(*)::int AS count FROM markets WHERE enabled=true'),pool.query("SELECT count(*)::int AS count FROM support_tickets WHERE status='open'")]);res.json({users:u.rows[0].count,markets:m.rows[0].count,tickets:t.rows[0].count})}));
app.get('/api/users',auth,requirePermission('view_users'),wrap(async(req,res)=>{const {rows}=await pool.query('SELECT id,username,email,mobile,role,created_at FROM users ORDER BY id DESC LIMIT 100');res.json(rows)}));
app.get('/api/markets',auth,requirePermission('view_markets'),wrap(async(req,res)=>{const {rows}=await pool.query('SELECT id,name,opens,closes,enabled FROM markets ORDER BY id');res.json(rows)}));
app.get('/api/results',auth,requirePermission('view_results'),wrap(async(req,res)=>{const {rows}=await pool.query('SELECT r.id,m.name,r.result_date,r.result_text FROM results r JOIN markets m ON m.id=r.market_id ORDER BY r.result_date DESC LIMIT 100');res.json(rows)}));

const manageLimit=rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false});
app.get('/api/admins',auth,superOnly,wrap(async(req,res)=>{const {rows}=await pool.query("SELECT u.id,u.username,u.email,a.admin_role,a.enabled,a.permissions,a.created_at FROM admin_accounts a JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC");res.json(rows)}));
app.post('/api/admins',manageLimit,auth,superOnly,wrap(async(req,res)=>{
 const {username,email,password,permissions:requested=[]}=req.body||{};
 if(typeof username!=='string'||!/^[a-zA-Z0-9_]{3,24}$/.test(username)||username.toLowerCase()===SUPER_USERNAME||typeof email!=='string'||email.length>254||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||typeof password!=='string'||password.length<16||password.length>128)return res.status(400).json({error:'Valid username, email and 16+ character password required'});
 const allowed=validPerms(requested);if(!allowed)return res.status(400).json({error:'Invalid permissions'});
 const salt=randomBytes(16).toString('hex'),hash=salt+':'+(await scrypt(password,salt,64)).toString('hex');
 const client=await pool.connect();
 try{await client.query('BEGIN');const {rows}=await client.query("INSERT INTO users(username,email,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id,username,email",[username.toLowerCase(),email.trim().toLowerCase(),hash]);await client.query("INSERT INTO admin_accounts(user_id,admin_role,permissions,enabled,created_by) VALUES($1,'admin',$2,true,$3)",[rows[0].id,allowed,req.admin.id]);await client.query('COMMIT');res.status(201).json({...rows[0],admin_role:'admin',permissions:allowed,enabled:true})}catch(e){await client.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({error:'Username or email already exists'});throw e}finally{client.release()}
}));
app.patch('/api/admins/:id',manageLimit,auth,superOnly,wrap(async(req,res)=>{
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1||Object.keys(req.body||{}).some(k=>!['enabled','permissions'].includes(k)))return res.status(400).json({error:'Invalid update'});
 const {enabled,permissions:requested}=req.body||{};if(enabled!==undefined&&typeof enabled!=='boolean')return res.status(400).json({error:'Invalid enabled value'});
 const allowed=requested===undefined?undefined:validPerms(requested);if(requested!==undefined&&!allowed)return res.status(400).json({error:'Invalid permissions'});
 const {rows}=await pool.query("UPDATE admin_accounts SET enabled=COALESCE($2,enabled),permissions=COALESCE($3,permissions) WHERE user_id=$1 AND admin_role='admin' RETURNING user_id,enabled,permissions",[id,enabled??null,allowed??null]);
 if(!rows.length)return res.status(404).json({error:'Admin not found or protected'});
 if(enabled===false)await pool.query('DELETE FROM admin_sessions WHERE user_id=$1',[id]);
 res.json(rows[0]);
}));

const adminRoot=path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(adminRoot,{index:false,fallthrough:true}));
app.get('/',(_req,res)=>res.sendFile(path.join(adminRoot,'index.html')));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Internal server error'})});
async function start(){if(!process.env.ADMIN_ORIGIN)throw Error('ADMIN_ORIGIN required');if(pool){await pool.query("CREATE TABLE IF NOT EXISTS admin_sessions(id_hash TEXT PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL)");await pool.query("CREATE TABLE IF NOT EXISTS admin_accounts(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,admin_role TEXT NOT NULL CHECK(admin_role IN ('super_admin','admin')),enabled BOOLEAN NOT NULL DEFAULT true,permissions TEXT[] NOT NULL DEFAULT '{}',created_by BIGINT REFERENCES users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now())");await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS single_super_admin ON admin_accounts(admin_role) WHERE admin_role='super_admin'");await pool.query("INSERT INTO admin_accounts(user_id,admin_role,permissions) SELECT id,'super_admin',ARRAY['view_users','view_markets','view_results'] FROM users WHERE username=$1 AND role='admin' ON CONFLICT(user_id) DO NOTHING",[SUPER_USERNAME]);}app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('STAR777 admin listening'))}start().catch(e=>{console.error(e);process.exit(1)});
