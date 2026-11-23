import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createAccounts} from './accounts.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.pdf':'application/pdf'};
export function referenceEndpoint(value){
 let u;try{u=new URL(value);}catch{throw Error('Ce lien est invalide.');}if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Utilise un lien public https:// sans identifiants.');
 const host=u.hostname.toLowerCase();let endpoint;
 if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host))endpoint='https://www.youtube.com/oembed';
 else if(host==='open.spotify.com')endpoint='https://open.spotify.com/oembed';
 else if(['soundcloud.com','www.soundcloud.com'].includes(host))endpoint='https://soundcloud.com/oembed';
 else throw Error('Ce service n’est pas encore pris en charge. Les liens YouTube, Spotify et SoundCloud sont reconnus. Pour analyser le son d’une autre source, importe un fichier audio autorisé.');
 const out=new URL(endpoint);out.searchParams.set('url',u.href);out.searchParams.set('format','json');return out;
}
export function createServer(options={}){const accounts=createAccounts({directory:options.dataDirectory||process.env.LYES_DATA_DIR||path.resolve(root,'../../work/lyes-data'),maxAccounts:options.maxAccounts||2});return http.createServer(async(req,res)=>{
 const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{const url=new URL(req.url,'http://127.0.0.1');
 if(await accounts(req,res,url))return;
 if(url.pathname==='/api/reference'){
 if(req.method!=='POST')return json(405,{error:'Cette opération nécessite une demande de consultation.'});
 const origin=req.headers.origin;if(origin&&!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))return json(403,{error:'Cette demande doit provenir du studio local.'});
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)return json(413,{error:'Le lien est trop long.'});}let body;try{body=JSON.parse(raw);}catch{return json(400,{error:'La demande est illisible.'});}
 let endpoint;try{endpoint=referenceEndpoint(body.url);}catch(e){return json(400,{error:e.message});}
 try{const r=await fetch(endpoint,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!r.ok)return json(422,{error:'Les informations de ce lien sont indisponibles. Importe un fichier audio que tu es autorisé à utiliser pour analyser le son.'});const data=await r.json();return json(200,{name:String(data.title||'Référence musicale').slice(0,300),author:String(data.author_name||'').slice(0,150),url:body.url,provider:String(data.provider_name||endpoint.hostname),audioAnalyzed:false,notice:'Informations publiques consultées. Le son de ce lien n’a pas été téléchargé ni analysé. Ajoute un fichier audio autorisé pour une analyse musicale.'});}catch{return json(502,{error:'Le service musical ne répond pas. Tu peux conserver ce lien comme repère et importer un fichier autorisé pour analyser le son.'});}}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Méthode non autorisée');return;}
 const page=url.pathname==='/'?'/index.html':/^\/admin\/?$/.test(url.pathname)?'/admin.html':url.pathname;
 const file=path.resolve(root,'.'+decodeURIComponent(page));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Accès refusé');return;}
 const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Ressource introuvable');}
 });}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||5173);createServer().listen(port,'127.0.0.1',()=>console.log(`LYES : http://127.0.0.1:${port}`));}
