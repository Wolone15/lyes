export const uid=()=>globalThis.crypto.randomUUID();
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const presets=[
 ['piano','Piano feutré','Pianos','triangle',.006,.9,2400],['epiano','Piano électrique','Pianos','sine',.01,1.4,4200],
 ['guitar','Guitare pincée','Guitares','triangle',.003,.65,3200],['bass','Basse profonde','Basses','sine',.008,.25,650],
 ['drums','Batterie électronique','Batteries','sine',.001,.12,12000],['perc','Percussions sèches','Percussions','triangle',.001,.13,2200],
 ['pad','Nappe nocturne','Synthétiseurs','sawtooth',.35,1.8,1600],['lead','Synthé solo cobalt','Synthétiseurs','square',.015,.2,3000],
 ['strings','Cordes synthétiques','Cordes','sawtooth',.15,.8,2200],['brass','Cuivres synthétiques','Cuivres','sawtooth',.06,.3,1800],
 ['flute','Flûte douce','Vents','sine',.06,.25,3500],['organ','Orgue harmonique','Orgues','sine',.01,.12,5000],
 ['bell','Cloche cristalline','Acoustiques','sine',.002,1.7,8000],['texture','Texture orbitale','Textures','triangle',.5,2.5,1000],
 ['choir','Nappe chorale synthétique','Chœurs','triangle',.2,1.1,1200],['fx','Impact électronique','Effets','sawtooth',.001,1,700]
].map(([id,name,category,wave,attack,release,filter])=>({id,name,category,wave,attack,release,filter}));
export function newProject(name='Projet sans titre'){return {format:'lyes',version:1,id:uid(),name,bpm:90,bars:16,master:.75,tracks:[],markers:[],assets:{},updated:Date.now(),status:'En cours',kind:'Instrumental'};}
export function newTrack(preset='piano'){const p=presets.find(p=>p.id===preset)||presets[0];return {id:uid(),name:p.name,preset:p.id,color:['#6674ff','#b18aff','#f379b4','#48c6c5','#f0b779'][Math.floor(Math.random()*5)],volume:.65,pan:0,mute:false,solo:false,attack:p.attack,release:p.release,filter:p.filter,reverb:.15,delay:0,clips:[]};}
export function newClip(start=0,length=16){return {id:uid(),type:'midi',name:'Nouvelle séquence',start,length,notes:[]};}
export const noteName=n=>['Do','Do♯','Ré','Ré♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'][((n%12)+12)%12]+(Math.floor(n/12)-1);
export function validateProject(p){
 if(!p||p.format!=='lyes'||p.version!==1)throw Error('Format de projet LYES v1 attendu.');
 const number=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 if(typeof p.name!=='string'||p.name.length>200||typeof p.id!=='string'||!number(p.bpm,30,240)||!number(p.bars,1,512)||!number(p.master,0,1)||!Array.isArray(p.tracks)||p.tracks.length>64||!p.assets||typeof p.assets!=='object'||!Array.isArray(p.markers))throw Error('Projet invalide ou limites dépassées.');
 for(const a of Object.values(p.assets))if(!a||typeof a.name!=='string'||typeof a.data!=='string'||!/^data:[^,]*;base64,[A-Za-z0-9+/=\r\n]+$/.test(a.data))throw Error('Une ressource audio doit être incorporée en base64.');
 let clipCount=0,noteCount=0;
 const ids=new Set();const id=x=>{if(typeof x!=='string'||x.length>100||ids.has(x))throw Error('Identifiant dupliqué ou invalide.');ids.add(x);};id(p.id);
 for(const t of p.tracks){id(t.id);if(typeof t.name!=='string'||!presets.some(p=>p.id===t.preset)||!/^#[\da-f]{6}$/i.test(t.color)||!number(t.volume,0,1)||!number(t.pan,-1,1)||!number(t.reverb,0,1)||!number(t.delay,0,1)||!number(t.attack,.001,2)||!number(t.release,.03,4)||!number(t.filter,80,20000)||!Array.isArray(t.clips))throw Error('Piste invalide.');
 for(const c of t.clips){if(++clipCount>2000)throw Error('Limite de 2 000 clips atteinte.');id(c.id);if(!number(c.start,0,2048)||!number(c.length,.0625,2048)||c.start+c.length>2048||typeof c.name!=='string'||!['midi','audio'].includes(c.type))throw Error('Clip invalide.');
 if(c.type==='midi'){if(!Array.isArray(c.notes)||c.notes.length>10000)throw Error('Notes invalides.');for(const n of c.notes){if(++noteCount>50000)throw Error('Limite de 50 000 notes atteinte.');id(n.id);if(!Number.isInteger(n.pitch)||!number(n.pitch,0,127)||!number(n.time,0,c.length)||!number(n.duration,.03125,2048)||!number(n.velocity,.01,1)||n.time+n.duration>c.length+.00001)throw Error('Note hors du clip.');}}
 else if(typeof c.asset!=='string'||!p.assets[c.asset]||!number(c.offset,0,86400))throw Error('Ressource audio manquante.');}}
 for(const m of p.markers)if(typeof m.name!=='string'||!number(m.beat,0,2048))throw Error('Marqueur invalide.');
 return p;
}
export function extent(p){return Math.max(p.bars*4,...p.tracks.flatMap(t=>t.clips.map(c=>c.start+c.length)));}
export class History{constructor(){this.past=[];this.future=[];} push(p){this.past.push(structuredClone(p));if(this.past.length>60)this.past.shift();this.future=[];} undo(p){if(!this.past.length)return p;this.future.push(structuredClone(p));return this.past.pop();} redo(p){if(!this.future.length)return p;this.past.push(structuredClone(p));return this.future.pop();}}
// Composition procédurale déterministe : aucun modèle IA, aucun morceau de référence.
export function compose({name='Nocturne',bpm=90,bars=16,mood='minor'}={}){
 const p=newProject(name);p.bpm=clamp(Number(bpm),30,240);p.bars=clamp(Number(bars),4,128);
 const minor=mood==='minor',chords=minor?[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]:[[60,64,67],[55,59,62],[57,60,64],[53,57,60]];
 for(const instrument of ['piano','guitar','bass','drums']){const t=newTrack(instrument);t.color={piano:'#7181ff',guitar:'#b58cf4',bass:'#4dc3bd',drums:'#ee8eb5'}[instrument];t.volume=instrument==='drums'?.55:.48;
 for(let bar=0;bar<p.bars;bar+=4){const c=newClip(bar*4,Math.min(16,(p.bars-bar)*4));c.name={piano:'Accords de nuit',guitar:'Éclats pincés',bass:'Fondation',drums:'Pulse / 01'}[instrument];
 const add=(time,pitch,duration,velocity)=>c.notes.push({id:uid(),time,pitch,duration,velocity});
 for(let b=0;b<c.length/4;b++){const chord=chords[(bar+b)%4];if(instrument==='piano')chord.forEach(n=>add(b*4,n,3.5,.6));if(instrument==='guitar')for(let j=0;j<8;j++)add(b*4+j*.5,chord[(j+b)%3]+12,.4,j%2?.45:.65);if(instrument==='bass'){add(b*4,chord[0]-12,1.5,.8);add(b*4+2.5,chord[0]-12,1,.65);}if(instrument==='drums'){add(b*4,36,.25,.9);add(b*4+2,36,.25,.75);add(b*4+1,38,.25,.7);add(b*4+3,38,.25,.8);for(let j=0;j<8;j++)add(b*4+j*.5,42,.125,j%2?.4:.6);}}
 t.clips.push(c);}p.tracks.push(t);}
 p.markers=[{name:'Départ',beat:0},{name:'Développement',beat:Math.floor(p.bars/2)*4}];return p;
}
