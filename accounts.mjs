import {readFile,writeFile,rename,mkdir,unlink,readdir} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {validateProject} from './src/model.js';
const scrypt=promisify(scryptCallback),ttl=7*24*3600*1000;
async function readJSON(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function atomicJSON(file,data){await mkdir(path.dirname(file),{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(data),{mode:0o600});await rename(temporary,file);}
async function bodyJSON(req,limit=128*1024*1024){if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(Error('La demande doit être envoyée au format JSON.'),{status:415});let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(Error('Ce projet est trop volumineux pour être enregistré (128 Mo maximum).'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('La demande est illisible.'),{status:400});}}
export function createAccounts({directory,maxAccounts=2}={}){
 const sessions=new Map(),attempts=new Map();let queue=Promise.resolve();
 const serial=fn=>{const result=queue.catch(()=>{}).then(fn);queue=result.catch(()=>{});return result;};
 const usersFile=path.join(directory,'users.json'),users=()=>readJSON(usersFile,[]);
 const token=req=>String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('lyes_session='))?.slice(13);
 const digest=t=>t?createHash('sha256').update(t).digest('hex'):'';
 const current=req=>{const key=digest(token(req)),s=sessions.get(key);if(!s||s.expires<Date.now()){sessions.delete(key);return null;}return s;};
 const cookie=(req,value,age)=>`lyes_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${req.socket.encrypted?'; Secure':''}`;
 const isAdmin=u=>u?.role==='admin'||(u?.role==null&&u?.legacyOwner===true);
 const summary=u=>({id:u.id,username:u.username,canImportLegacy:!!u.legacyOwner,isAdmin:isAdmin(u)});
 const projectSummaries=async userId=>{const folder=path.join(directory,'projects',userId);let files;try{files=await readdir(folder);}catch(e){if(e.code==='ENOENT')return [];throw e;}return (await Promise.all(files.filter(f=>/^[a-f0-9-]{36}\.json$/i.test(f)).map(async f=>{const p=await readJSON(path.join(folder,f),null);if(!p)return null;return {id:p.id,name:p.name,bpm:p.bpm,status:p.status,kind:p.kind,updated:p.updated,trackCount:p.tracks.length,durationSeconds:Math.max(p.bars*4,...p.tracks.flatMap(t=>t.clips.map(c=>c.start+c.length)))*60/p.bpm};}))).filter(Boolean);};
 const startSession=(req,res,u)=>{const old=digest(token(req));sessions.delete(old);const t=randomBytes(32).toString('base64url');sessions.set(digest(t),{user:summary(u),expires:Date.now()+ttl});res.setHeader('Set-Cookie',cookie(req,t,ttl/1000));return summary(u);};
 const keyFor=req=>req.socket.remoteAddress||'local';
 const rateLimit=req=>{const key=keyFor(req),now=Date.now(),recent=(attempts.get(key)||[]).filter(t=>t>now-15*60*1000);if(recent.length>=15)throw Object.assign(Error('Trop de tentatives. Attends quinze minutes avant de réessayer.'),{status:429});recent.push(now);attempts.set(key,recent);};
 return async function handle(req,res,url){
 if(!url.pathname.startsWith('/api/auth/')&&!url.pathname.startsWith('/api/projects')&&!url.pathname.startsWith('/api/admin/'))return false;
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 try{
 if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{}if(!origin||origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol)){send(403,{error:'Cette demande doit provenir du site LYES.'});return true;}}
 const pathname=url.pathname,session=current(req);
 if(pathname==='/api/auth/me'&&req.method==='GET'){const user=session&&(await users()).find(u=>u.id===session.user.id);send(200,{user:user?summary(user):null});return true;}
 if(pathname==='/api/auth/logout'&&req.method==='POST'){sessions.delete(digest(token(req)));res.setHeader('Set-Cookie',cookie(req,'',0));send(200,{ok:true});return true;}
 if((pathname==='/api/auth/register'||pathname==='/api/auth/login')&&req.method==='POST'){
 rateLimit(req);const data=await bodyJSON(req,4096),username=typeof data.username==='string'?data.username.trim().normalize('NFKC'):'',normalized=username.toLocaleLowerCase('fr-FR'),password=data.password;
 if(!/^[\p{L}\p{N}_-]{3,32}$/u.test(username)||typeof password!=='string'||password.length<8||password.length>128){send(400,{error:'Choisis un pseudo de 3 à 32 lettres, chiffres, tirets ou traits bas, et un mot de passe de 8 caractères minimum (128 maximum).'});return true;}
 if(pathname==='/api/auth/register'){
 const user=await serial(async()=>{const all=await users();if(all.some(u=>u.normalized===normalized))throw Object.assign(Error('Ce pseudo est déjà utilisé. Choisis-en un autre.'),{status:409});if(all.length>=maxAccounts)throw Object.assign(Error('Les deux comptes de test ont déjà été créés. Connecte-toi avec ton compte existant.'),{status:403});const salt=randomBytes(16).toString('hex'),hash=Buffer.from(await scrypt(password,salt,64)).toString('hex'),u={id:randomUUID(),username,normalized,salt,hash,legacyOwner:all.length===0,role:all.length===0?'admin':'user',created:Date.now()};await atomicJSON(usersFile,[...all,u]);return u;});send(201,{user:startSession(req,res,user)});return true;}
 const all=await users(),user=all.find(u=>u.normalized===normalized),salt=user?.salt||'lyes-identifiant-inconnu';const hash=Buffer.from(await scrypt(password,salt,64)),expected=user?Buffer.from(user.hash,'hex'):Buffer.alloc(64);
 if(!user||expected.length!==hash.length||!timingSafeEqual(hash,expected)){send(401,{error:'Pseudo ou mot de passe incorrect.'});return true;}attempts.delete(keyFor(req));send(200,{user:startSession(req,res,user)});return true;
 }
 if(!session){send(401,{error:'Connecte-toi à ton compte pour accéder à tes projets.'});return true;}
 if(req.headers['x-lyes-account']!==session.user.id){send(409,{error:'Le compte connecté a changé. Recharge la page pour retrouver le bon espace.'});return true;}
 if(pathname.startsWith('/api/admin/')){
 const all=await users(),actor=all.find(u=>u.id===session.user.id);
 if(!isAdmin(actor)){send(403,{error:'Cet espace est réservé à l’administrateur de LYES.'});return true;}
 if(req.method!=='GET'){send(405,{error:'La consultation administrateur est en lecture seule.'});return true;}
 const profile=u=>({id:u.id,username:u.username,created:u.created,role:isAdmin(u)?'Administrateur':'Membre'});
 if(pathname==='/api/admin/users'){const accounts=await Promise.all(all.map(async u=>({...profile(u),projectCount:(await projectSummaries(u.id)).length})));send(200,{accounts});return true;}
 const match=pathname.match(/^\/api\/admin\/users\/([a-f0-9-]{36})$/i),user=match&&all.find(u=>u.id===match[1]);
 if(!user){send(404,{error:'Ce profil est introuvable.'});return true;}
 send(200,{profile:{...profile(user),projects:await projectSummaries(user.id)}});return true;
 }
 const userDirectory=path.join(directory,'projects',session.user.id);
 if(pathname==='/api/projects'&&req.method==='GET'){let files;try{files=await readdir(userDirectory);}catch(e){if(e.code==='ENOENT')files=[];else throw e;}const projects=await Promise.all(files.filter(f=>/^[a-f0-9-]{36}\.json$/i.test(f)).map(async file=>{const p=await readJSON(path.join(userDirectory,file),null);return p?{id:p.id,name:p.name,bpm:p.bpm,status:p.status,kind:p.kind,updated:p.updated}:null;}));send(200,{projects:projects.filter(Boolean)});return true;}
 const match=pathname.match(/^\/api\/projects\/([a-f0-9-]{36})$/i);if(!match){send(404,{error:'Ce projet est introuvable.'});return true;}const id=match[1],file=path.join(userDirectory,id+'.json');
 if(req.method==='GET'){const project=await readJSON(file,null);if(!project)send(404,{error:'Ce projet est introuvable dans ton compte.'});else send(200,{project});return true;}
 if(req.method==='PUT'){const project=await bodyJSON(req);if(project.id!==id)throw Object.assign(Error('L’identifiant du projet est invalide.'),{status:400});try{validateProject(project);}catch(e){throw Object.assign(e,{status:400});}project.updated=Date.now();await atomicJSON(file,project);send(200,{updated:project.updated});return true;}
 if(req.method==='DELETE'){try{await unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}send(200,{ok:true});return true;}
 send(405,{error:'Cette opération n’est pas disponible.'});return true;
 }catch(e){send(e.status||500,{error:e.status?e.message:'Le serveur n’a pas pu terminer cette opération. Ton projet ouvert reste disponible ; télécharge une copie si nécessaire.'});return true;}
 };
}
