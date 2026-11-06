import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web');
app.disable('x-powered-by');
app.use(express.json());
app.get('/api/health', (_req,res)=>res.json({ok:true,app:'STAR777',mode:'demo'}));
app.get('/api/markets', (_req,res)=>res.json([
 {name:'LAXMI MORNING',open:'10:00 AM',close:'12:00 PM'},
 {name:'KARNATAKA DAY',open:'10:15 AM',close:'11:15 AM'},
 {name:'MILAN MORNING',open:'10:30 AM',close:'11:30 AM'},
 {name:'SRIDEVI',open:'11:00 AM',close:'12:00 PM'},
 {name:'MAIN BAZAR DAY',open:'01:00 PM',close:'03:00 PM'},
 {name:'SUPREME NIGHT',open:'08:00 PM',close:'10:00 PM'}
]));
app.use(express.static(root));
app.get('*',(_req,res)=>res.sendFile(path.join(root,'index.html')));
const port=Number(process.env.PORT)||3000;
app.listen(port,'0.0.0.0',()=>console.log('STAR777 demo listening on '+port));
