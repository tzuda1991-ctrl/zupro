import {randomBytes,createHash,scrypt as cb,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {pool} from './db.js';
const scrypt=promisify(cb);
export async function hashPassword(p){const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(p,salt,64)).toString('hex')}
export async function verifyPassword(p,stored){try{const [salt,hex]=stored.split(':');const expected=Buffer.from(hex,'hex');return timingSafeEqual(expected,await scrypt(p,salt,expected.length))}catch{return false}}
export const tokenHash=t=>createHash('sha256').update(t).digest('hex');
export async function issueSession(res,id){const token=randomBytes(32).toString('hex');await pool.query("INSERT INTO sessions(id_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[tokenHash(token),id]);res.cookie('star777_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800000})}
export async function authenticate(req,res,next){try{const token=req.cookies?.star777_session;if(!token)return res.status(401).json({error:'Login required'});const {rows}=await pool.query('SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id_hash=$1 AND s.expires_at>now()',[tokenHash(token)]);if(!rows.length)return res.status(401).json({error:'Session expired'});req.user=rows[0];next()}catch(error){next(error)}}
export function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Admin only'});next()}
