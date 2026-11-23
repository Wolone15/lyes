import {instrumentPart} from './instruments.js';
import {uid,clamp,extent,validateProject,presets} from './model.js';
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ');
const sectionKind=name=>{const t=norm(name);return /pre\s*-?\s*refrain/.test(t)?'prechorus':/refrain|chorus/.test(t)?'chorus':/coupl(?:et|est)|verse/.test(t)?'verse':/intro/.test(t)?'intro':/outro|fin/.test(t)?'outro':/pont|bridge/.test(t)?'bridge':'other';};
export function projectSections(p){const end=extent(p);return [...p.markers].sort((a,b)=>a.beat-b.beat).map((m,i,all)=>({name:m.name,start:m.beat,end:Math.min(end,m.endBeat??all[i+1]?.beat??end),kind:sectionKind(m.name)})).filter(s=>s.end>s.start);}
export function isArrangementRequest(message){const t=norm(message);return /transitions?/.test(t)&&/ameli|travail|progress|fluide|adouci|renforc/.test(t)||/refrain|coupl(?:et|est)|intro|outro|pont|prod|morceau/.test(t)&&/\bmou\b|molle|ambian|peche|punch|energi|dynam|prononc|marqu|contrast|repet|pareil|monoton|vari|different|doux|douce|calm|alle[gé]er|aer[ée]|charg[ée]|explos|bouge|dansant|sature|trop fort/.test(t);}
export function interpretArrangement(message,p){
 const text=norm(message);if(!isArrangementRequest(text))return null;
 if(!p.tracks.some(t=>t.clips.some(c=>c.type==='midi'&&c.notes.length)))throw Error('Je peux varier les notes d’une production MIDI. Sur un fichier audio déjà mixé, je ne peux pas encore réécrire séparément la batterie ou les instruments.');
 if(p.voices?.active)throw Error('Reviens d’abord à « Modifier la production » pour changer ses refrains et ses couplets. Tes prises vocales seront conservées.');
 const sections=projectSections(p),commands=[],descriptions=[];const clauses=text.split(/[.!?;\n]|\b(?:et que|tandis que|alors que|mais)\b/).filter(Boolean);
 const occurrence=clause=>/deuxieme|second|\b2e?\b/.test(clause)?2:/premier|\b1er\b/.test(clause)?1:/dernier|final/.test(clause)?-1:0;
 const add=(scope,operation,clause,value=.7)=>{const matches=sections.filter(s=>scope==='all'||s.kind===scope);if(!matches.length)throw Error(`Je ne trouve pas de ${scope==='chorus'?'refrain':scope==='verse'?'couplet':'partie nommée'} dans ce projet. Utilise « Nommer une partie » pour repérer son début ; je ne vais pas inventer sa position.`);const nth=occurrence(clause);if(nth>matches.length)throw Error('La partie demandée n’existe pas dans les marqueurs.');if(commands.some(c=>c.scope===scope&&c.operation===operation&&c.occurrence===nth))return;commands.push({type:'arrange',scope,operation,occurrence:nth,value});const title=scope==='chorus'?'Refrains':scope==='verse'?'Couplets':'Arrangement';descriptions.push(`${title}${nth?' ('+(nth===-1?'dernier':nth)+')':''} : ${operation==='energize'?'batterie plus dense, accents de basse et notes aiguës supplémentaires':operation==='articulate'?'rythme plus marqué et espaces dans l’accompagnement':operation==='transition'?'montée sur la dernière mesure avant la partie demandée':operation==='soften'?'accompagnement allégé et notes moins appuyées':'variations rythmiques et mélodiques entre les répétitions'}.`);};
 for(const clause of clauses){
 const scope=/pre\s*-?\s*refrain/.test(clause)?'prechorus':/refrain/.test(clause)?'chorus':/coupl(?:et|est)/.test(clause)?'verse':null;
 if(/transitions?/.test(clause)&&/ameli|travail|progress|fluide|adouci|renforc/.test(clause)){
  const destination=clause.match(/(?:vers|avant)\s+(?:le |les |un |la )?(refrain|couplet|outro|pont)/)?.[1];
  add(({refrain:'chorus',couplet:'verse',outro:'outro',pont:'bridge'})[destination]??'all','transition',clause);
  continue;
 }
 if(!scope)continue;
 const softer=/moins\s+(?:dynam|energi|charg)|plus\s+(?:doux|douce|calm)|trop\s+(?:charg|fort)|alleger|aerer/.test(clause);
 if(softer)add(scope,'soften',clause);
 else if(/ambian|\bmou\b|molle|peche|punch|energi|dynam|explos|bouge|dansant/.test(clause))add(scope,'energize',clause);
 else if(/prononc|marqu|contrast|plus.*present|\+.*present/.test(clause))add(scope,'articulate',clause);
 else if(/varie|repet|pareil|different|monoton/.test(clause))add(scope,'vary',clause);
 }
 if(/trop pareil|tout le long|repetitif|repetitive|monotone|plus de variations|moins repet|differenc|contraste/.test(text))add('all','vary','',.55);
 if(!commands.length)return null;
 return {explanation:'Je propose ces changements sur le morceau existant :\n'+descriptions.join('\n')+'\nLa durée, le tempo et tes pistes vocales restent conservés. Écoute la différence après application ; tu peux annuler.',commands};
}
function sliceClip(c,start,end){const a=Math.max(c.start,start),b=Math.min(c.start+c.length,end);if(b-a<.0625)return null;const copy=structuredClone(c);if(a===c.start&&b===c.start+c.length)return copy;copy.id=uid();copy.start=a;copy.length=b-a;const local=a-c.start;if(c.type==='midi')copy.notes=c.notes.filter(n=>n.time+n.duration>local&&n.time<local+copy.length).map(n=>n.time>=local&&n.time+n.duration<=local+copy.length?{...n,time:n.time-local}:{...n,id:uid(),time:Math.max(0,n.time-local),duration:Math.min(n.time+n.duration,local+copy.length)-Math.max(n.time,local)}).filter(n=>n.duration>=.03125);return copy;}
function partition(c,sections){const boundaries=[c.start,c.start+c.length,...sections.flatMap(s=>[s.start,s.end]).filter(x=>x>c.start&&x<c.start+c.length)].sort((a,b)=>a-b);return [...new Set(boundaries)].slice(0,-1).map((a,i,all)=>sliceClip(c,a,[...new Set(boundaries)][i+1])).filter(Boolean);}
function addNote(c,n){if(n.time<0||n.time>=c.length-.03125)return false;const duration=Math.min(n.duration,c.length-n.time);if(duration<.03125||c.notes.some(x=>x.pitch===n.pitch&&Math.abs(x.time-n.time)<.035))return false;c.notes.push({id:uid(),...n,duration,velocity:clamp(n.velocity,.05,.96)});return true;}
function changeNotes(track,c,operation,strength,index){
 const before=JSON.stringify(c.notes);const part=instrumentPart(presets.find(p=>p.id===track.preset));const drums=part==='kit',bass=part==='bass';
 if(operation==='transition'){
  if(drums){
   for(let at=Math.max(0,c.length-1);at<c.length-.0625;at+=.25)addNote(c,{time:at,pitch:38,duration:.08,velocity:.38+(at-c.length+1)*.29*strength});
  }else{
   c.notes=c.notes.map(n=>({...n,velocity:clamp(n.velocity*(.68+.3*n.time/c.length),.05,.96),duration:Math.min(n.duration,Math.max(.03125,c.length-n.time-.12))}));
  }
 }else if(operation==='soften'){c.notes=c.notes.filter((n,i)=>drums?(n.pitch<42||i%2===0):i%3!==2).map(n=>({...n,velocity:Math.max(.05,n.velocity*(1-.28*strength))}));}
 else if(operation==='energize'){
 c.notes=c.notes.map(n=>({...n,velocity:clamp(n.velocity*(1+.2*strength),.05,.96)}));
 if(drums){for(let beat=0;beat<c.length;beat+=4){for(const off of [.5,1.5,2.5,3.5])addNote(c,{time:beat+off,pitch:42,duration:.09,velocity:.46+.12*strength});addNote(c,{time:beat+2.75,pitch:36,duration:.16,velocity:.73});}for(let off=.5;off<2;off+=.25)addNote(c,{time:c.length-2+off,pitch:off<1?38:42,duration:.08,velocity:.45+off*.13});}
 else if(bass){for(const n of [...c.notes].filter(n=>Math.abs(n.time%4)<.1))addNote(c,{time:n.time+1.75,pitch:n.pitch,duration:.4,velocity:.72});}
 else {for(const n of [...c.notes].filter(n=>Math.abs(n.time%4)<.1))addNote(c,{time:n.time+.5,pitch:Math.min(127,n.pitch+12),duration:Math.min(.75,n.duration),velocity:Math.min(.65,n.velocity*.8)});}
 }else if(operation==='articulate'){
 if(drums){for(let at=0;at<c.length;at+=4){addNote(c,{time:at,pitch:36,duration:.2,velocity:.86});addNote(c,{time:at+1,pitch:38,duration:.16,velocity:.74});addNote(c,{time:at+3,pitch:38,duration:.16,velocity:.8});}c.notes=c.notes.map(n=>({...n,velocity:Math.abs(n.time%1)<.04?Math.max(n.velocity,.74):n.velocity*.88}));}
 else c.notes=c.notes.map(n=>({...n,duration:Math.max(.03125,n.duration*(bass?.85:.68)),velocity:clamp(n.velocity*(bass?1.12:.86),.05,.96)}));
 }else if(operation==='vary'){
 if(drums){for(let beat=0;beat<c.length;beat+=4){addNote(c,{time:beat+(index%2?3.75:2.25),pitch:index%2?38:36,duration:.12,velocity:.52+.1*strength});}c.notes=c.notes.map(n=>({...n,velocity:clamp(n.velocity*(Math.floor(n.time*2+index)%3===0?1.1:.91),.05,.96)}));}
 else if(bass)c.notes=c.notes.map((n,i)=>({...n,time:Math.min(c.length-n.duration,n.time+(i%2===index%2?.125:0))}));
 else c.notes=c.notes.map((n,i)=>({...n,time:Math.min(c.length-n.duration,n.time+(i%3===index%3?.125:0)),duration:Math.max(.03125,n.duration*(i%2?.88:1)),velocity:clamp(n.velocity*(i%3===0?1.08:.92),.05,.96)}));
 }
 c.notes.sort((a,b)=>a.time-b.time||a.pitch-b.pitch);return before!==JSON.stringify(c.notes);
}
export function applyArrangement(project,cmd){
 if(!['all','chorus','verse','prechorus','intro','bridge','outro'].includes(cmd.scope)||!['energize','articulate','vary','soften','transition'].includes(cmd.operation)||!Number.isFinite(cmd.value)||cmd.value<0||cmd.value>1||!Number.isInteger(cmd.occurrence)||cmd.occurrence< -1||cmd.occurrence>32)throw Error('Modification d’arrangement invalide.');
 if(project.voices?.active)throw Error('Reviens à la production pour modifier les instruments.');
 const p=structuredClone(project),all=projectSections(p);let sections=all.filter(s=>cmd.scope==='all'||s.kind===cmd.scope);if(cmd.occurrence)sections=sections.slice(cmd.occurrence===-1?-1:cmd.occurrence-1,cmd.occurrence===-1?undefined:cmd.occurrence);if(cmd.operation==='transition')sections=sections.flatMap(s=>{
  const previous=all[all.indexOf(s)-1];if(!previous||previous.end<s.start-.001)return [];
  return [{...previous,start:Math.max(previous.start,s.start-4),end:s.start}];
 });if(!sections.length)throw Error('Aucune transition musicale trouvée avant la partie demandée.');let changes=0;
 for(const t of p.tracks){if(t.role==='vocal'||t.role==='backing')continue;t.clips=t.clips.flatMap(c=>{if(c.type!=='midi')return [c];return partition(c,sections).map(piece=>{const section=sections.find(s=>piece.start>=s.start-.00001&&piece.start+piece.length<=s.end+.00001);if(section&&changeNotes(t,piece,cmd.operation,cmd.value,all.indexOf(section)+Math.floor(piece.start/4)))changes++;return piece;});});}
 if(!changes)throw Error('Ces parties ne contiennent pas de notes modifiables. Je ne vais pas annoncer une modification qui n’a pas été faite.');
 p.arrangementChanges=[...(p.arrangementChanges||[]).slice(-19),{scope:cmd.scope,operation:cmd.operation,clipsChanged:changes,date:Date.now()}];return validateProject(p);
}
