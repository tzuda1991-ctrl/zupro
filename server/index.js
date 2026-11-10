import {randomInt,createHmac,timingSafeEqual} from 'node:crypto';
import {sendOtp,sendWelcome,sendUsernameReminder,mailConfigured} from './mail.js';
import express from 'express';
import webpush from 'web-push';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {pool,initDb} from './db.js';
import {hashPassword,verifyPassword,issueSession,authenticate,adminOnly,tokenHash} from './security.js';
const app=express(),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
app.disable('x-powered-by');app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'16kb'}));app.use(cookieParser());
const resetLimit=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false});
const validEmail=e=>typeof e==='string'&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const otpDigest=(id,code)=>createHmac('sha256',process.env.OTP_SECRET).update(String(id)+':'+code).digest('hex');
const limit=rateLimit({windowMs:900000,limit:15,standardHeaders:'draft-7',legacyHeaders:false});
const fallback=[['LAXMI MORNING','10:00 AM','12:00 PM'],['KARNATAKA DAY','10:15 AM','11:15 AM'],['MILAN MORNING','10:30 AM','11:30 AM'],['SRIDEVI','11:00 AM','12:00 PM'],['MAIN BAZAR DAY','01:00 PM','03:00 PM'],['SUPREME NIGHT','08:00 PM','10:00 PM']].map(([name,open,close])=>({name,open,close}));
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const db=(req,res,next)=>pool?next():res.status(503).json({error:'Database not configured'});
app.get('/api/health',(_req,res)=>res.json({ok:true,app:'STAR777',database:pool?'configured':'unconfigured'}));
const pushReady=Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);
app.post('/api/fcm/register',db,authenticate,wrap(async(req,res)=>{
 const token=req.body?.token;
 if(typeof token!=='string'||token.length<50||token.length>4096||!/^[A-Za-z0-9_:\-]+$/.test(token))return res.status(400).json({error:'Invalid FCM token'});
 await pool.query('INSERT INTO fcm_devices(user_id,token) VALUES($1,$2) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id',[req.user.id,token]);
 res.json({ok:true});
}));
app.get('/api/push/config',(_req,res)=>res.json({enabled:pushReady,publicKey:pushReady?process.env.VAPID_PUBLIC_KEY:null}));
app.post('/api/push/subscribe',db,authenticate,wrap(async(req,res)=>{
 if(!pushReady)return res.status(503).json({error:'Push notifications not configured'});
 const sub=req.body?.subscription;
 if(!sub||typeof sub.endpoint!=='string'||!sub.endpoint.startsWith('https://')||sub.endpoint.length>2048||typeof sub.keys?.p256dh!=='string'||typeof sub.keys?.auth!=='string')return res.status(400).json({error:'Invalid subscription'});
 await pool.query('INSERT INTO push_subscriptions(user_id,endpoint,subscription) VALUES($1,$2,$3) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,subscription=excluded.subscription',[req.user.id,sub.endpoint,JSON.stringify(sub)]);
 res.json({ok:true});
}));
app.post('/api/push/unsubscribe',db,authenticate,wrap(async(req,res)=>{const endpoint=req.body?.endpoint;if(typeof endpoint!=='string')return res.status(400).json({error:'Invalid endpoint'});await pool.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2',[endpoint,req.user.id]);res.json({ok:true})}));
app.get('/api/markets',wrap(async(_req,res)=>{if(!pool)return res.json(fallback);const {rows}=await pool.query('SELECT id,name,opens AS open,closes AS close FROM markets WHERE enabled=true ORDER BY id');res.json(rows)}));
app.use('/api',(req,res,next)=>{if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const origin=req.get('origin');if(!origin)return next();try{if(new URL(origin).host===req.get('host'))return next()}catch{}res.status(403).json({error:'Invalid origin'})});
app.post('/api/auth/register',limit,db,wrap(async(req,res)=>{
 const {username,password,mobile,email}=req.body||{};
 if(typeof username!=='string'||!/^[a-zA-Z0-9_]{3,24}$/.test(username)||typeof password!=='string'||password.length<12||password.length>128||(mobile!==undefined&&!/^[0-9]{10}$/.test(mobile))||!validEmail(email))return res.status(400).json({error:'Enter a valid username, 12+ character password, mobile and email'});
 if(!mailConfigured())return res.status(503).json({error:'Email verification is not configured'});
 const user=username.toLowerCase(),address=email.trim().toLowerCase();
 const {rows:existing}=await pool.query('SELECT 1 FROM users WHERE username=$1 OR lower(email)=$2 OR ($3::text IS NOT NULL AND mobile=$3) LIMIT 1',[user,address,mobile||null]);
 if(existing.length)return res.status(409).json({error:'Username, mobile or email already registered'});
 const {rows:recent}=await pool.query("SELECT 1 FROM pending_registrations WHERE email=$1 AND requested_at>now()-interval '60 seconds'",[address]);
 if(recent.length)return res.status(429).json({error:'Please wait 60 seconds before requesting another OTP'});
 const code=String(randomInt(0,1000000)).padStart(6,'0');
 const hash=await hashPassword(password);
 await pool.query("INSERT INTO pending_registrations(email,username,mobile,password_hash,code_hash,expires_at,attempts_left,requested_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes',5,now()) ON CONFLICT(email) DO UPDATE SET username=excluded.username,mobile=excluded.mobile,password_hash=excluded.password_hash,code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts_left=5,requested_at=now()",[address,user,mobile||null,hash,otpDigest(address,code)]);
 await sendOtp(address,code,'register');
 res.status(202).json({verificationRequired:true,message:'Verification OTP sent. Check your email.'});
}));
app.post('/api/auth/resend-registration-otp',limit,db,wrap(async(req,res)=>{
 const email=req.body?.email;
 if(!validEmail(email))return res.status(400).json({error:'Enter a valid email address'});
 if(!mailConfigured())return res.status(503).json({error:'Email verification is unavailable'});
 const address=email.trim().toLowerCase();
 const {rows}=await pool.query("SELECT email,requested_at FROM pending_registrations WHERE email=$1",[address]);
 if(!rows.length)return res.status(400).json({error:'Registration expired or not found. Please sign up again.'});
 const elapsed=Date.now()-new Date(rows[0].requested_at).getTime();
 if(elapsed<60000)return res.status(429).json({error:'Please wait '+Math.ceil((60000-elapsed)/1000)+' seconds before resending OTP',retryAfter:Math.ceil((60000-elapsed)/1000)});
 const code=String(randomInt(0,1000000)).padStart(6,'0');
 const updated=await pool.query("UPDATE pending_registrations SET code_hash=$2,expires_at=now()+interval '10 minutes',attempts_left=5,requested_at=now() WHERE email=$1 AND requested_at<=now()-interval '60 seconds' RETURNING email",[address,otpDigest(address,code)]);
 if(!updated.rowCount)return res.status(429).json({error:'Please wait 60 seconds before resending OTP',retryAfter:60});
 await sendOtp(address,code,'register');
 res.json({message:'A new verification code has been sent.',retryAfter:60});
}));
app.post('/api/auth/verify-registration',limit,db,wrap(async(req,res)=>{
 const {email,otp}=req.body||{};
 if(!validEmail(email)||typeof otp!=='string'||!/^[0-9]{6}$/.test(otp))return res.status(400).json({error:'Enter email and 6 digit OTP'});
 const address=email.trim().toLowerCase(),client=await pool.connect();
 let user;
 try{
  await client.query('BEGIN');
  const {rows}=await client.query('SELECT * FROM pending_registrations WHERE email=$1 FOR UPDATE',[address]);
  const pending=rows[0];
  if(!pending||pending.attempts_left<=0||new Date(pending.expires_at)<=new Date()){await client.query('ROLLBACK');return res.status(400).json({error:'Invalid or expired OTP'})}
  const expected=Buffer.from(pending.code_hash,'hex'),actual=Buffer.from(otpDigest(address,otp),'hex');
  if(!timingSafeEqual(expected,actual)){
   await client.query('UPDATE pending_registrations SET attempts_left=attempts_left-1 WHERE email=$1',[address]);
   await client.query('COMMIT');return res.status(400).json({error:'Invalid or expired OTP'});
  }
  const result=await client.query('INSERT INTO users(username,mobile,password_hash,email) VALUES($1,$2,$3,$4) RETURNING id,username,role',[pending.username,pending.mobile,pending.password_hash,address]);
  user=result.rows[0];
  await client.query('DELETE FROM pending_registrations WHERE email=$1',[address]);
  await client.query('COMMIT');
 }catch(error){
  await client.query('ROLLBACK');
  if(error.code==='23505')return res.status(409).json({error:'Username, mobile or email already registered'});
  throw error;
 }finally{client.release()}
 await issueSession(res,user.id);
 sendWelcome(address,user.username).catch(err=>console.error('Welcome email failed',err.message));
 res.status(201).json({user,message:'Email verified. Account created.'});
}));
app.post('/api/auth/login',limit,db,wrap(async(req,res)=>{const {username,password}=req.body||{};if(typeof username!=='string'||typeof password!=='string'||username.length>254||password.length>128)return res.status(400).json({error:'Invalid credentials'});const identifier=username.trim().toLowerCase();if(!identifier)return res.status(401).json({error:'Invalid credentials'});const {rows}=await pool.query('SELECT id,username,role,password_hash FROM users WHERE username=$1 OR lower(email)=$1 OR (mobile=$1 AND $1 ~ \'^[0-9]{10}$\') LIMIT 2',[identifier]);if(rows.length!==1||!await verifyPassword(password,rows[0].password_hash))return res.status(401).json({error:'Invalid credentials'});await issueSession(res,rows[0].id);res.json({user:{id:rows[0].id,username:rows[0].username,role:rows[0].role}})}));

app.post('/api/auth/forgot-username',resetLimit,db,wrap(async(req,res)=>{
 const email=req.body?.email;
 if(!validEmail(email))return res.status(400).json({error:'Enter a valid email address'});
 if(!mailConfigured())return res.status(503).json({error:'Email recovery is not configured'});
 const generic={message:'If this email is registered, your username will be emailed.'};
 const {rows}=await pool.query('SELECT username,email FROM users WHERE lower(email)=$1',[email.trim().toLowerCase()]);
 if(rows.length)await sendUsernameReminder(rows[0].email,rows[0].username);
 res.json(generic);
}));
app.post('/api/auth/forgot-password',resetLimit,db,wrap(async(req,res)=>{
 const email=req.body?.email;
 if(!validEmail(email))return res.status(400).json({error:'Enter a valid email address'});
 if(!mailConfigured())return res.status(503).json({error:'Email recovery is not configured yet'});
 const generic={message:'If this email is registered, a reset code will be sent.'};
 const {rows}=await pool.query('SELECT id,email FROM users WHERE lower(email)=$1',[email.trim().toLowerCase()]);
 if(!rows.length)return res.json(generic);
 const id=rows[0].id;
 const {rows:recent}=await pool.query("SELECT requested_at FROM password_reset_otps WHERE user_id=$1 AND requested_at>now()-interval '60 seconds'",[id]);
 if(recent.length)return res.json(generic);
 const code=String(randomInt(0,1000000)).padStart(6,'0');
 await pool.query("INSERT INTO password_reset_otps(user_id,code_hash,expires_at,attempts_left,requested_at) VALUES($1,$2,now()+interval '10 minutes',5,now()) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts_left=5,requested_at=now()",[id,otpDigest(id,code)]);
 await sendOtp(rows[0].email,code);
 res.json(generic);
}));
app.post('/api/auth/reset-password',resetLimit,db,wrap(async(req,res)=>{
 const {email,otp,password}=req.body||{};
 if(!validEmail(email)||typeof otp!=='string'||!/^[0-9]{6}$/.test(otp)||typeof password!=='string'||password.length<12||password.length>128)return res.status(400).json({error:'Valid email, 6 digit OTP and password of 12-128 characters required'});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const {rows}=await client.query('SELECT p.user_id,p.code_hash,p.attempts_left,p.expires_at FROM password_reset_otps p JOIN users u ON u.id=p.user_id WHERE lower(u.email)=$1 FOR UPDATE OF p',[email.trim().toLowerCase()]);
  const row=rows[0];
  if(!row||row.attempts_left<=0||new Date(row.expires_at)<=new Date()){await client.query('ROLLBACK');return res.status(400).json({error:'Invalid or expired code'})}
  const expected=Buffer.from(row.code_hash,'hex'),actual=Buffer.from(otpDigest(row.user_id,otp),'hex');
  if(!timingSafeEqual(expected,actual)){await client.query('UPDATE password_reset_otps SET attempts_left=attempts_left-1 WHERE user_id=$1',[row.user_id]);await client.query('COMMIT');return res.status(400).json({error:'Invalid or expired code'})}
  const hash=await hashPassword(password);
  await client.query('UPDATE users SET password_hash=$1 WHERE id=$2',[hash,row.user_id]);
  await client.query('DELETE FROM sessions WHERE user_id=$1',[row.user_id]);
  await client.query('DELETE FROM password_reset_otps WHERE user_id=$1',[row.user_id]);
  await client.query('COMMIT');
  res.clearCookie('star777_session',{path:'/'});
  res.json({message:'Password updated. Please log in.'});
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}));
app.get('/api/me',db,authenticate,(req,res)=>res.json({user:req.user}));
app.post('/api/auth/logout',db,authenticate,wrap(async(req,res)=>{await pool.query('DELETE FROM sessions WHERE id_hash=$1',[tokenHash(req.cookies.star777_session)]);res.clearCookie('star777_session',{path:'/'});res.json({ok:true})}));
app.get('/api/results',db,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT r.id,m.name AS market,r.result_date,r.result_text,r.open_result,r.close_result FROM results r JOIN markets m ON m.id=r.market_id ORDER BY r.result_date DESC LIMIT 100');res.json(rows)}));
app.get('/api/wallet',db,authenticate,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT COALESCE(SUM(delta),0)::int AS balance FROM demo_ledger WHERE user_id=$1',[req.user.id]);res.json({currency:'DEMO_POINTS',balance:rows[0].balance})}));
app.get('/api/transactions',db,authenticate,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT id,delta,note,created_at FROM demo_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 100',[req.user.id]);res.json(rows)}));
app.get('/api/notifications',db,authenticate,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT id,title,message,created_at FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY id DESC LIMIT 50',[req.user.id]);res.json(rows)}));
app.post('/api/support',db,authenticate,wrap(async(req,res)=>{const m=req.body?.message;if(typeof m!=='string'||m.trim().length<5||m.length>2000)return res.status(400).json({error:'Message must be 5-2000 characters'});const {rows}=await pool.query('INSERT INTO support_tickets(user_id,message) VALUES($1,$2) RETURNING id,status',[req.user.id,m.trim()]);res.status(201).json(rows[0])}));
app.get('/api/admin/summary',db,authenticate,adminOnly,wrap(async(req,res)=>{const [u,t]=await Promise.all([pool.query('SELECT count(*)::int AS count FROM users'),pool.query("SELECT count(*)::int AS count FROM support_tickets WHERE status='open'")]);res.json({users:u.rows[0].count,open_tickets:t.rows[0].count})}));
app.post('/api/admin/results',db,authenticate,adminOnly,wrap(async(req,res)=>{const {marketId,date,result}=req.body||{};if(!Number.isSafeInteger(marketId)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date||'')||typeof result!=='string'||result.length>50)return res.status(400).json({error:'Invalid result'});const {rows}=await pool.query('INSERT INTO results(market_id,result_date,result_text) VALUES($1,$2,$3) ON CONFLICT(market_id,result_date) DO UPDATE SET result_text=excluded.result_text RETURNING id',[marketId,date,result]);res.json(rows[0])}));
app.use(express.static(root));app.get('*',(_req,res)=>res.sendFile(path.join(root,'index.html')));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Internal server error'})});
const port=Number(process.env.PORT)||3000;initDb().then(()=>app.listen(port,'0.0.0.0',()=>console.log('STAR777 API listening on '+port))).catch(e=>{console.error('Database init failed',e);process.exit(1)});
