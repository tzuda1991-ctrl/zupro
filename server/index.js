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
app.disable('x-powered-by');app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'2mb'}));app.use(cookieParser());
const resetLimit=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false});
const validEmail=e=>typeof e==='string'&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const otpDigest=(id,code)=>createHmac('sha256',process.env.OTP_SECRET).update(String(id)+':'+code).digest('hex');
const limit=rateLimit({windowMs:900000,limit:15,standardHeaders:'draft-7',legacyHeaders:false});
const fallback=[['LAXMI MORNING','10:00 AM','12:00 PM'],['KARNATAKA DAY','10:15 AM','11:15 AM'],['MILAN MORNING','10:30 AM','11:30 AM'],['SRIDEVI','11:00 AM','12:00 PM'],['MAIN BAZAR DAY','01:00 PM','03:00 PM'],['SUPREME NIGHT','08:00 PM','10:00 PM']].map(([name,open,close])=>({name,open,close}));
const timeMinutes=t=>{const m=/^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(t||'');return m?(Number(m[1])%12+(m[3]==='PM'?12:0))*60+Number(m[2]):null};
const marketStatus=(m,now,declared)=>{if(!m.enabled||m.status_override==='holiday')return 'HOLIDAY';if(m.status_override==='closed')return 'CLOSED';const open=timeMinutes(m.open),close=timeMinutes(m.close),result=timeMinutes(m.result_time||m.close);if(open===null||close===null||result===null)return 'CLOSED';if(declared)return 'RESULT';const cutoff=Math.min(close,result-10);if(now<open)return 'SOON';if(now<cutoff)return 'OPEN';if(now<result)return 'WAITING';return 'PENDING'};
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
app.get('/api/markets',wrap(async(_req,res)=>{if(!pool)return res.json(fallback);const now=new Date();const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const part=k=>parts.find(x=>x.type===k)?.value;const minutes=Number(part('hour'))*60+Number(part('minute'));const today=`${part('year')}-${part('month')}-${part('day')}`;const {rows}=await pool.query("SELECT m.id,m.name,m.opens AS open,m.closes AS close,m.result_time,m.status_override,m.enabled,EXISTS(SELECT 1 FROM results r WHERE r.market_id=m.id AND r.result_date=$1 AND r.close_result IS NOT NULL) AS declared FROM markets m WHERE m.enabled=true ORDER BY m.id",[today]);res.json(rows.map(m=>({...m,status:marketStatus(m,minutes,m.declared),betting_open:marketStatus(m,minutes,m.declared)==='OPEN',betting_cutoff_minutes:Math.min(timeMinutes(m.close),timeMinutes(m.result_time||m.close)-10)})))}));
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
app.post(['/api/auth/login', '/api/login', '/api/admin/login'],limit,db,wrap(async(req,res)=>{const {username,password}=req.body||{};if(typeof username!=='string'||typeof password!=='string'||username.length>254||password.length>128)return res.status(400).json({error:'Invalid credentials'});const identifier=username.trim().toLowerCase();if(!identifier)return res.status(401).json({error:'Invalid credentials'});const {rows}=await pool.query('SELECT id,username,role,password_hash,COALESCE(is_blocked,false) AS is_blocked FROM users WHERE lower(username)=$1 OR lower(email)=$1 OR (mobile=$1 AND $1 ~ \'^[0-9]{10}$\') LIMIT 2',[identifier]);if(rows.length!==1||!await verifyPassword(password,rows[0].password_hash))return res.status(401).json({error:'Invalid credentials'});if(rows[0].is_blocked&&rows[0].role!=='admin')return res.status(403).json({error:'Your account is suspended by administrator.'});await issueSession(res,rows[0].id);res.json({id:rows[0].id,username:rows[0].username,role:rows[0].role,admin_role:rows[0].role==='admin'?'super_admin':'user',user:{id:rows[0].id,username:rows[0].username,role:rows[0].role}})}));

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
app.get(['/api/me', '/api/auth/me', '/api/admin/me'],db,authenticate,(req,res)=>res.json({id:req.user.id,username:req.user.username,role:req.user.role,admin_role:req.user.role==='admin'?'super_admin':'user',permissions:req.user.role==='admin'?['view_users','view_markets','view_results','manage_markets','manage_results','manage_support','view_support','view_audit']:[],user:req.user}));
app.post(['/api/auth/logout', '/api/logout', '/api/admin/logout'],wrap(async(req,res)=>{if(req.cookies?.star777_session&&pool)await pool.query('DELETE FROM sessions WHERE id_hash=$1',[tokenHash(req.cookies.star777_session)]).catch(()=>{});res.clearCookie('star777_session',{path:'/'});res.json({ok:true})}));
app.get('/api/results',db,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT r.id,m.name AS market,r.result_date,r.result_text,r.open_result,r.close_result FROM results r JOIN markets m ON m.id=r.market_id ORDER BY r.result_date DESC LIMIT 100');res.json(rows)}));
const paymentLimit=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false});
app.post('/api/payment-requests',paymentLimit,db,authenticate,wrap(async(req,res)=>{
 const {method,amount,utr,proof}=req.body||{};
 if(!['upi','qr','bank'].includes(method)||typeof amount!=='number'||!Number.isFinite(amount)||amount<1||amount>100000||Math.round(amount*100)!==amount*100)return res.status(400).json({error:'Invalid amount or method'});
 if(typeof utr!=='string'||!/^[A-Za-z0-9-]{6,40}$/.test(utr))return res.status(400).json({error:'Valid UTR required'});
 const proofData = (typeof proof === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(proof) && proof.length <= 2500000) ? proof : 'UTR_REFERENCE_ONLY';
 try{const {rows}=await pool.query('INSERT INTO payment_requests(user_id,method,amount_paise,utr,proof_data) VALUES($1,$2,$3,$4,$5) RETURNING id,status,created_at',[req.user.id,method,Math.round(amount*100),utr,proofData]);res.status(201).json(rows[0])}
 catch(e){if(e.code==='23505')return res.status(409).json({error:'Transaction reference already submitted'});throw e}
}));
app.get('/api/payment-requests',db,authenticate,wrap(async(req,res)=>{
 const {rows}=await pool.query('SELECT id,method,amount_paise,utr,status,created_at,reviewed_at FROM payment_requests WHERE user_id=$1 ORDER BY id DESC LIMIT 100',[req.user.id]);res.json(rows)
}));
app.get('/api/wallet',db,authenticate,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT COALESCE(SUM(amount_paise),0)::bigint AS balance_paise FROM wallet_ledger WHERE user_id=$1',[req.user.id]);res.json({currency:'INR',balance_paise:Number(rows[0].balance_paise),balance:Number(rows[0].balance_paise)/100})}));
app.get('/api/transactions',db,authenticate,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT id,amount_paise,note,created_at FROM wallet_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 100',[req.user.id]);res.json(rows)}));
app.get('/api/withdrawals',db,authenticate,wrap(async(req,res)=>{
 const {rows}=await pool.query('SELECT id,amount_paise,method,status,created_at,reviewed_at FROM withdrawal_requests WHERE user_id=$1 ORDER BY id DESC LIMIT 100',[req.user.id]);res.json(rows)
}));
app.post('/api/withdrawals',paymentLimit,db,authenticate,wrap(async(req,res)=>{
 const {points,method,details}=req.body||{};
 if(!Number.isSafeInteger(points)||points<1||points>1000000||!['upi','bank'].includes(method)||typeof details!=='string'||details.trim().length<6||details.length>240)return res.status(400).json({error:'Valid points and payout details required'});
 const amount=points*100,client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
  const balance=await client.query('SELECT COALESCE(SUM(amount_paise),0)::bigint AS amount FROM wallet_ledger WHERE user_id=$1',[req.user.id]);
  const holds=await client.query("SELECT COALESCE(SUM(amount_paise),0)::bigint AS amount FROM withdrawal_requests WHERE user_id=$1 AND status='pending'",[req.user.id]);
  if(Number(balance.rows[0].amount)-Number(holds.rows[0].amount)<amount){await client.query('ROLLBACK');return res.status(409).json({error:'Insufficient available points'})}
  const {rows}=await client.query('INSERT INTO withdrawal_requests(user_id,amount_paise,method,payout_details) VALUES($1,$2,$3,$4) RETURNING id,status,amount_paise',[req.user.id,amount,method,details.trim()]);
  await client.query('COMMIT');res.status(201).json(rows[0])
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}));
app.get('/api/notifications',db,authenticate,wrap(async(req,res)=>{const {rows}=await pool.query('SELECT id,title,message,created_at FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY id DESC LIMIT 50',[req.user.id]);res.json(rows)}));
app.post('/api/support',db,authenticate,wrap(async(req,res)=>{const m=req.body?.message;if(typeof m!=='string'||m.trim().length<5||m.length>2000)return res.status(400).json({error:'Message must be 5-2000 characters'});const {rows}=await pool.query('INSERT INTO support_tickets(user_id,message) VALUES($1,$2) RETURNING id,status',[req.user.id,m.trim()]);res.status(201).json(rows[0])}));
app.get('/api/admin/summary',db,authenticate,adminOnly,wrap(async(req,res)=>{const [u,t]=await Promise.all([pool.query('SELECT count(*)::int AS count FROM users'),pool.query("SELECT count(*)::int AS count FROM support_tickets WHERE status='open'")]);res.json({users:u.rows[0].count,open_tickets:t.rows[0].count})}));
app.post('/api/admin/results',db,authenticate,adminOnly,wrap(async(req,res)=>{const {marketId,date,result}=req.body||{};if(!Number.isSafeInteger(marketId)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date||'')||typeof result!=='string'||result.length>50)return res.status(400).json({error:'Invalid result'});const {rows}=await pool.query('INSERT INTO results(market_id,result_date,result_text) VALUES($1,$2,$3) ON CONFLICT(market_id,result_date) DO UPDATE SET result_text=excluded.result_text RETURNING id',[marketId,date,result]);res.json(rows[0])}));
app.post('/api/bets',db,authenticate,wrap(async(req,res)=>{
  const {marketId,gameType,selection,session,points}=req.body||{};
  if(!Number.isSafeInteger(marketId)||!['OPEN','CLOSE'].includes(session)||!Number.isSafeInteger(points)||points<10||points>500000)
    return res.status(400).json({error:'Valid market, session and points (min 10) required'});
  if(typeof gameType!=='string'||typeof selection!=='string'||!selection.trim())
    return res.status(400).json({error:'Valid game type and selection required'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
    const balanceRes=await client.query('SELECT COALESCE(SUM(amount_paise),0)::bigint AS amount FROM wallet_ledger WHERE user_id=$1',[req.user.id]);
    const holdsRes=await client.query("SELECT COALESCE(SUM(amount_paise),0)::bigint AS amount FROM withdrawal_requests WHERE user_id=$1 AND status='pending'",[req.user.id]);
    const availablePoints=Math.floor((Number(balanceRes.rows[0].amount)-Number(holdsRes.rows[0].amount))/100);
    if(availablePoints<points){
      await client.query('ROLLBACK');
      return res.status(409).json({error:'Insufficient balance! Please add points to your wallet.'});
    }
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const {rows:entryRows}=await client.query(
      'INSERT INTO game_entries(user_id,market_id,game_type,selection,points,session,entry_date,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,created_at',
      [req.user.id,marketId,gameType,selection.trim(),points,session,today,'recorded']
    );
    await client.query(
      'INSERT INTO wallet_ledger(user_id,amount_paise,note) VALUES($1,$2,$3)',
      [req.user.id,-points*100,'Bet: '+gameType.toUpperCase()+' - '+selection.trim()+' ('+session+') [Entry #'+entryRows[0].id+']']
    );
    await client.query('COMMIT');
    res.status(201).json({ok:true,entryId:entryRows[0].id,remainingBalance:availablePoints-points});
  }catch(e){
    await client.query('ROLLBACK');
    throw e;
  }finally{
    client.release();
  }
}));

app.get('/api/game-entries',db,authenticate,wrap(async(req,res)=>{
  const {rows}=await pool.query(
    'SELECT g.id,g.market_id,m.name AS market_name,g.game_type,g.selection,g.points,g.session,g.entry_date,g.status,g.created_at FROM game_entries g JOIN markets m ON g.market_id=m.id WHERE g.user_id=$1 ORDER BY g.id DESC LIMIT 100',
    [req.user.id]
  );
  res.json(rows);
}));

app.post('/api/admin/adjust-balance',db,authenticate,adminOnly,wrap(async(req,res)=>{
  const {userId,points,note}=req.body||{};
  if(!Number.isSafeInteger(userId)||!Number.isSafeInteger(points)||points===0)
    return res.status(400).json({error:'Valid user ID and points required'});
  await pool.query(
    'INSERT INTO wallet_ledger(user_id,amount_paise,note) VALUES($1,$2,$3)',
    [userId,points*100,note||(points>0?'Admin Credit':'Admin Debit')]
  );
  res.json({ok:true});
}));

app.get('/api/config/active-upi',(_req,res)=>{
  res.json({
    upiId:process.env.ACTIVE_UPI_ID||'star777pay@icici',
    payeeName:process.env.ACTIVE_PAYEE_NAME||'STAR777 ENTERPRISE',
    whatsappNumber:process.env.WHATSAPP_SUPPORT||'919876543210',
    telegramHandle:process.env.TELEGRAM_SUPPORT||'star777support'
  });
});

// --- STAR777 ADMIN CONSOLE & ROUTES ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, "../admin");
app.use('/admin', express.static(adminRoot));
app.get('/admin', (_req, res) => res.sendFile(path.join(adminRoot, 'index.html')));
app.get('/admin/*', (_req, res) => res.sendFile(path.join(adminRoot, 'index.html')));
app.get('/admin.css', (_req, res) => res.sendFile(path.join(adminRoot, 'admin.css')));
app.get('/admin.js', (_req, res) => res.sendFile(path.join(adminRoot, 'admin.js')));

app.get(['/api/admin/summary', '/api/summary'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const [u, m, t, p, w] = await Promise.all([
    pool.query('SELECT count(*)::int AS count FROM users'),
    pool.query('SELECT count(*)::int AS count FROM markets WHERE enabled=true'),
    pool.query("SELECT count(*)::int AS count FROM support_tickets WHERE status='open'"),
    pool.query("SELECT count(*)::int AS count FROM payment_requests WHERE status='pending'"),
    pool.query("SELECT count(*)::int AS count FROM withdrawal_requests WHERE status='pending'")
  ]);
  res.json({
    users: u.rows[0].count,
    markets: m.rows[0].count,
    tickets: t.rows[0].count,
    pending_payments: p.rows[0].count,
    pending_withdrawals: w.rows[0].count
  });
}));

app.get(['/api/admin/users', '/api/users'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {rows} = await pool.query(`
    SELECT u.id, u.username, u.email, u.mobile, u.role,
           COALESCE(u.is_blocked, false) AS is_blocked,
           u.created_at,
           COALESCE(SUM(w.amount_paise), 0)::bigint AS balance_paise
    FROM users u
    LEFT JOIN wallet_ledger w ON w.user_id = u.id
    GROUP BY u.id
    ORDER BY u.id DESC
    LIMIT 200
  `);
  res.json(rows.map(r => ({
    ...r,
    balance: (Number(r.balance_paise) / 100).toFixed(2)
  })));
}));

app.post(['/api/admin/users/:id/adjust-balance', '/api/users/:id/adjust-balance'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const userId = Number(req.params.id);
  const {points, note} = req.body || {};
  if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(points) || points === 0)
    return res.status(400).json({error: 'Valid non-zero integer points required'});
  await pool.query(
    'INSERT INTO wallet_ledger(user_id, amount_paise, note) VALUES($1, $2, $3)',
    [userId, points * 100, note || (points > 0 ? 'Admin Credit' : 'Admin Debit')]
  );
  res.json({ok: true, message: 'Points updated successfully (' + (points > 0 ? '+' : '') + points + ')'});
}));

app.post(['/api/admin/users/:id/toggle-block', '/api/users/:id/toggle-block'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const userId = Number(req.params.id);
  const {blocked} = req.body || {};
  if (!Number.isSafeInteger(userId) || typeof blocked !== 'boolean')
    return res.status(400).json({error: 'Valid user ID and blocked boolean required'});
  await pool.query('UPDATE users SET is_blocked=$2 WHERE id=$1', [userId, blocked]);
  if (blocked) {
    await pool.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
  }
  res.json({ok: true, is_blocked: blocked, message: blocked ? 'User blocked successfully' : 'User unblocked'});
}));

app.get(['/api/admin/bet-exposure', '/api/bet-exposure'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const marketId = req.query.marketId ? Number(req.query.marketId) : null;
  const date = req.query.date || new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const session = req.query.session || null;
  const gameType = req.query.gameType || null;

  let query = 'SELECT g.selection, g.game_type, g.session, m.name AS market_name, COUNT(*)::int AS total_bids, SUM(g.points)::bigint AS total_points FROM game_entries g JOIN markets m ON m.id = g.market_id WHERE g.entry_date = $1';
  const params = [date];
  if (marketId) {
    params.push(marketId);
    query += ' AND g.market_id = $' + params.length;
  }
  if (session && ['OPEN', 'CLOSE'].includes(session)) {
    params.push(session);
    query += ' AND g.session = $' + params.length;
  }
  if (gameType) {
    params.push(gameType);
    query += ' AND g.game_type = $' + params.length;
  }
  query += ' GROUP BY g.selection, g.game_type, g.session, m.name ORDER BY total_points DESC LIMIT 200';

  const {rows} = await pool.query(query, params);
  const totalStaked = rows.reduce((acc, r) => acc + Number(r.total_points), 0);
  const totalBids = rows.reduce((acc, r) => acc + Number(r.total_bids), 0);

  res.json({
    date,
    marketId,
    totalStaked,
    totalBids,
    topSelections: rows.slice(0, 10),
    breakdown: rows
  });
}));

app.get(['/api/admin/starline-results', '/api/starline-results'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const date = req.query.date || new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const {rows} = await pool.query(
    'SELECT id, starline_time, result_date, pana, digit, created_at FROM starline_results WHERE result_date=$1 ORDER BY starline_time',
    [date]
  );
  res.json(rows);
}));

app.post(['/api/admin/starline-results', '/api/starline-results'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {starlineTime, date, pana, digit} = req.body || {};
  if (!starlineTime || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date || '') || !/^[0-9]{3}$/.test(pana || '') || !/^[0-9]$/.test(digit || ''))
    return res.status(400).json({error: 'Valid starline time, date, 3-digit pana and 1-digit result required'});
  const {rows} = await pool.query(`
    INSERT INTO starline_results(starline_time, result_date, pana, digit)
    VALUES($1, $2, $3, $4)
    ON CONFLICT(starline_time, result_date)
    DO UPDATE SET pana=excluded.pana, digit=excluded.digit
    RETURNING *
  `, [starlineTime, date, pana, digit]);
  res.json({ok: true, result: rows[0]});
}));

app.get(['/api/admin/payment-requests', '/api/payment-requests/all'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {rows} = await pool.query(`
    SELECT p.id, p.user_id, u.username, p.method, p.amount_paise, p.utr, p.proof_data, p.status, p.created_at, p.reviewed_at
    FROM payment_requests p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.id DESC
    LIMIT 100
  `);
  res.json(rows);
}));

app.post(['/api/admin/payment-requests/:id/review', '/api/payment-requests/:id/review'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const {status} = req.body || {};
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({error: 'Invalid status'});

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows} = await client.query('SELECT id, user_id, amount_paise, status FROM payment_requests WHERE id=$1 FOR UPDATE', [id]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Request not found'});
    }
    if (rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({error: 'Request already reviewed'});
    }
    await client.query('UPDATE payment_requests SET status=$2, reviewed_at=now(), reviewed_by=$3 WHERE id=$1', [id, status, req.user.id]);
    if (status === 'approved') {
      await client.query(
        'INSERT INTO wallet_ledger(user_id, amount_paise, payment_request_id, note) VALUES($1, $2, $3, $4)',
        [rows[0].user_id, rows[0].amount_paise, id, 'Deposit approved: #' + id]
      );
    }
    await client.query('COMMIT');
    res.json({ok: true, id, status});
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.get(['/api/admin/withdrawals', '/api/withdrawals/all'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {rows} = await pool.query(`
    SELECT w.id, w.user_id, u.username, w.amount_paise, w.method, w.payout_details, w.status, w.payout_reference, w.created_at, w.reviewed_at
    FROM withdrawal_requests w
    JOIN users u ON u.id = w.user_id
    ORDER BY w.id DESC
    LIMIT 100
  `);
  res.json(rows);
}));

app.post(['/api/admin/withdrawals/:id/review', '/api/withdrawals/:id/review'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const {status, reference} = req.body || {};
  if (!['completed', 'rejected'].includes(status))
    return res.status(400).json({error: 'Invalid status'});

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows} = await client.query('SELECT id, user_id, amount_paise, status FROM withdrawal_requests WHERE id=$1 FOR UPDATE', [id]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Request not found'});
    }
    if (rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({error: 'Request already reviewed'});
    }
    await client.query('UPDATE withdrawal_requests SET status=$2, payout_reference=$3, reviewed_at=now(), reviewed_by=$4 WHERE id=$1', [id, status, reference || null, req.user.id]);
    if (status === 'completed') {
      await client.query(
        'INSERT INTO wallet_ledger(user_id, amount_paise, note) VALUES($1, $2, $3)',
        [rows[0].user_id, -Number(rows[0].amount_paise), 'Payout completed: #' + id + ' (Ref: ' + (reference || 'N/A') + ')']
      );
    }
    await client.query('COMMIT');
    res.json({ok: true, id, status});
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.post(['/api/admin/markets', '/api/markets'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {name, opens, closes, result_time} = req.body || {};
  if (!name || !opens || !closes) return res.status(400).json({error: "Name, opens, and closes required"});
  const {rows} = await pool.query(
    "INSERT INTO markets(name, opens, closes, result_time) VALUES($1, $2, $3, $4) RETURNING *",
    [name.trim(), opens.trim(), closes.trim(), result_time ? result_time.trim() : closes.trim()]
  );
  res.status(201).json(rows[0]);
}));

app.patch(['/api/admin/markets/:id', '/api/markets/:id'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const {name, opens, closes, result_time, status_override, enabled} = req.body || {};
  const {rows} = await pool.query(
    "UPDATE markets SET name=COALESCE($2, name), opens=COALESCE($3, opens), closes=COALESCE($4, closes), result_time=COALESCE($5, result_time), status_override=$6, enabled=COALESCE($7, enabled) WHERE id=$1 RETURNING *",
    [id, name || null, opens || null, closes || null, result_time || null, status_override === undefined ? null : status_override, enabled === undefined ? null : Boolean(enabled)]
  );
  res.json(rows[0] || {ok: true});
}));

app.post(['/api/admin/results', '/api/results'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {marketId, date, result, phase} = req.body || {};
  const mId = Number(marketId);
  const rText = String(result || "").trim();
  if (!Number.isSafeInteger(mId) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date || "") || !rText) {
    return res.status(400).json({error: "Valid marketId, date (YYYY-MM-DD), and result required"});
  }
  let query = "INSERT INTO results(market_id, result_date, result_text, open_result, close_result) VALUES($1, $2, $3, $3, null) ON CONFLICT(market_id, result_date) DO UPDATE SET result_text=excluded.result_text RETURNING *";
  let params = [mId, date, rText];
  if (phase === "OPEN") {
    query = "INSERT INTO results(market_id, result_date, result_text, open_result) VALUES($1, $2, $3, $3) ON CONFLICT(market_id, result_date) DO UPDATE SET open_result=excluded.open_result, result_text=excluded.open_result RETURNING *";
  } else if (phase === "CLOSE") {
    query = "INSERT INTO results(market_id, result_date, result_text, close_result) VALUES($1, $2, $3, $3) ON CONFLICT(market_id, result_date) DO UPDATE SET close_result=excluded.close_result RETURNING *";
  }
  const {rows} = await pool.query(query, params);
  res.json({ok: true, result: rows[0]});
}));

app.get(['/api/admin/support', '/api/support'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {rows} = await pool.query("SELECT t.id, t.user_id, u.username, t.message, t.status, t.created_at FROM support_tickets t JOIN users u ON u.id = t.user_id ORDER BY t.id DESC LIMIT 100");
  res.json(rows);
}));

app.patch(['/api/admin/support/:id', '/api/support/:id'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const {status} = req.body || {};
  await pool.query("UPDATE support_tickets SET status=$2 WHERE id=$1", [id, status || "closed"]);
  res.json({ok: true});
}));

app.get(['/api/admin/game-entry-summary', '/api/game-entry-summary'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {rows} = await pool.query("SELECT g.entry_date, m.name AS market_name, COUNT(*)::int AS total_bids, SUM(g.points)::bigint AS total_points FROM game_entries g JOIN markets m ON m.id = g.market_id GROUP BY g.entry_date, m.name ORDER BY g.entry_date DESC, total_points DESC LIMIT 50");
  res.json(rows);
}));

app.get(['/api/admin/audit', '/api/audit'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {rows} = await pool.query("SELECT w.id, w.user_id, u.username, w.amount_paise, w.note, w.created_at FROM wallet_ledger w JOIN users u ON u.id = w.user_id ORDER BY w.id DESC LIMIT 100");
  res.json(rows.map(r => ({ id: r.id, action: "WALLET_LEDGER", details: r.username + ": " + (r.amount_paise > 0 ? "+" : "") + (Number(r.amount_paise)/100).toFixed(2) + " (" + r.note + ")", created_at: r.created_at })));
}));

app.get(['/api/admin/admins', '/api/admins'], db, authenticate, adminOnly, wrap(async (req, res) => {
  const {rows} = await pool.query("SELECT id, username, email, mobile, role, is_blocked, created_at FROM users WHERE role='admin' ORDER BY id");
  res.json(rows.map(r => ({ id: r.id, username: r.username, email: r.email, role: "super_admin", enabled: !r.is_blocked, permissions: ["view_users", "view_markets", "view_results", "manage_markets", "manage_results", "manage_support", "view_support", "view_audit"] })));
}));

// --- END ADMIN ROUTES ---

app.use(express.static(root,{setHeaders(res,filePath){if(/(?:index\.html|app\.js|style\.css)$/.test(filePath))res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');}}));app.get('*',(_req,res)=>{res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');res.sendFile(path.join(root,'index.html'))});
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Internal server error'})});
async function ensureAdminUser() {
  if (!pool) return;
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false");
    await pool.query("UPDATE users SET role='admin' WHERE username IN ('admin', 'tzuda1991', 'star777admin')");
    const hash = await hashPassword('admin777');
    await pool.query(
      "INSERT INTO users(username, mobile, email, password_hash, role, is_blocked) VALUES('admin', '9876543210', 'admin@star777.com', $1, 'admin', false) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash, role='admin', is_blocked=false",
      [hash]
    );
    console.log("Seeded default admin user: admin / admin777");
  } catch (err) {
    console.error("ensureAdminUser error:", err);
  }
}

const port = Number(process.env.PORT) || 3000;
initDb()
  .then(() => ensureAdminUser())
  .then(() => app.listen(port, '0.0.0.0', () => console.log('STAR777 API listening on ' + port)))
  .catch(e => {
    console.error('Database init failed', e);
    process.exit(1);
  });
