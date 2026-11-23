import {newProject,newTrack,newClip,uid,clamp,validateProject,presets} from './model.js';
import {instrumentPart,normalizeText} from './instruments.js';
import {isArrangementRequest} from './arrangement.js';
export const normalize=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const aliases={
 piano:['piano','clavier'], guitar:['guitare','guitares','guitar','guitare acoustique','guitare douce'],
 steel:['guitare folk','guitare acoustique folk'], nylon:['guitare classique','guitare nylon'],
 'clean-electric':['guitare electrique','guitare clean'], 'distorted-guitar':['guitare saturee'],
 'sub808':['808'], epiano:['clavier electrique'], bass:['basse','basses'], sax:['sax'],
 drums:['batterie','drums','rythmique'], perc:['percussions','percussion'], pad:['nappe','nappes'],
 strings:['cordes'], flute:['flute'], organ:['orgue'], brass:['cuivres'], choir:['choeur','choeurs'],
 lead:['synthe','synthes','synth','lead']
};
const defaults={
 'afro mélodique':['nylon','electric-bass','acoustic-kit','shaker','analog-pad'],
 'synth-pop nocturne':['analog-pad','synth-bass','drums','analog-arp','clean-electric'],
 'électronique':['house-kit','synth-bass','analog-arp','synth-brass'],
 trap:['trap-kit','sub808','bell','soft-lead'],
 'rap mélodique':['piano','nylon','sub808','trap-kit','strings'],
 jazz:['grand-piano','upright-bass','acoustic-kit','sax'],
 acoustique:['steel','upright-bass','cello','shaker'],
 mélodique:['piano','guitar','bass','drums']
};
const lookup=new Map(presets.map(p=>[p.id,p]));
const dictionary=presets.flatMap(p=>[p.name,...(aliases[p.id]??[])].map(value=>[normalizeText(value),p.id]))
 .sort(([a],[b])=>b.length-a.length);
export function findInstrument(message){
 const words=' '+normalizeText(message)+' ';
 const match=dictionary.find(([name])=>words.includes(' '+name+' '));
 return match?lookup.get(match[1]):null;
}
function chooseInstruments(message,style){
 const clauses=normalize(message).split(/[,;.!?\n]|\b(?:mais|avec|puis|par contre)\b/);
 const selected=new Set(),excluded=new Set();
 const denyFamilies={guitar:'Guitares',piano:'Pianos',bass:'Basses',drums:'Batteries',perc:'Percussions',strings:'Cordes',brass:'Cuivres'};
 for(const clause of clauses){
  let negative=false;
  const chunks=normalizeText(clause).split(/\b(sans|pas de|pas d|retire|enleve|aucun|aucune)\b/);
  for(const [index,chunk] of chunks.entries()){
   if(index%2){negative=true;continue;}
   let words=' '+chunk.trim()+' ';
   for(const [name,id] of dictionary){
    if(!words.includes(' '+name+' '))continue;
    words=words.replaceAll(' '+name+' ',' ');
    if(!negative){selected.add(id);continue;}
    const category=denyFamilies[id];
    if(category&&aliases[id]?.some(a=>normalizeText(a)===name))for(const p of presets.filter(p=>p.category===category))excluded.add(p.id);
    else excluded.add(id);
   }
  }
 }
 const explicit=[...selected].filter(id=>!excluded.has(id));
 const only=/\b(?:seulement|uniquement|juste|seul|seule)\b/.test(normalizeText(message));
 if(only&&selected.size&&explicit.length===0)throw Error('La demande inclut et exclut les mêmes instruments.');
 const accompaniment=defaults[style].filter(id=>!excluded.has(id));
 if(!selected.size)return accompaniment;
 const instruments=explicit.length&&!only?explicit.concat(accompaniment.filter(id=>
  ['bass','kit'].includes(instrumentPart(lookup.get(id)))&&
  !explicit.some(other=>instrumentPart(lookup.get(other))===instrumentPart(lookup.get(id))))):explicit;
 return [...new Set(instruments)];
}
export function isCompositionRequest(message,{hasProject=false}={}){const text=normalize(message);if(/\b(?:ton avis|que penses|tu penses|comment faire|conseille)\b/.test(text))return false;if(hasProject&&isArrangementRequest(text)&&!/(?:nouvelle|autre)\s+(?:prod|production|musique|composition)|(?:repars|recommence).{0,15}(?:zero|debut)/.test(text))return false;return /(?:fais|cree|compose|genere|veux|voudrais|construis|prepare).{0,90}(?:prod|morceau|son\b|musique|instrumental|composition|beat\b)/.test(text);}
export function parseBrief(message,{references=[],memories=[]}={}){
 const text=normalize(message);if(!text.trim())throw Error('Décris le morceau que tu souhaites créer.');
 let duration=180;const minute=text.match(/(\d+(?:[.,]\d+)?)\s*(?:minutes?\b|min\b|m\b)/),second=text.match(/(\d+)\s*(?:secondes?|sec|s)\b/),time=text.match(/(?:duree|durera|de)\s*(\d+):(\d{2})/);
 if(minute)duration=Number(minute[1].replace(',','.'))*60+(second?Number(second[1]):0);else if(second)duration=Number(second[1]);else if(time)duration=Number(time[1])*60+Number(time[2]);
 const tempo=text.match(/(?:bpm|tempo|vitesse|rythme)\s*(?:a|de|:)?\s*(\d{2,3})|\b(\d{2,3})\s*bpm/);
 const style=/weeknd|weekend|synth.?pop|synthwave/.test(text)?'synth-pop nocturne':/jazz|swing/.test(text)?'jazz':/acoustique|folk/.test(text)?'acoustique':/afro|tiakola|tiako|palav|meuda|r&b|rnb/.test(text)?'afro mélodique':/electro|house|dance/.test(text)?'électronique':/trap|drill/.test(text)?'trap':/rap|la fouine|rotterdam/.test(text)?'rap mélodique':'mélodique';
 const ref=references.find(r=>r.analysis?.tempo?.bpm);let bpm=tempo?Number(tempo[1]||tempo[2]):ref?.analysis.tempo.bpm??(style==='synth-pop nocturne'?116:style==='jazz'?108:style==='électronique'?124:style==='afro mélodique'?102:style==='trap'?140:90);
 const mood=/joyeu|lumineu|majeur|festif/.test(text)?'major':'minor';
 const instruments=chooseInstruments(message,style);
 if(!instruments.length)throw Error('Indique au moins un instrument que tu souhaites entendre.');
 if(tempo&&(bpm<30||bpm>240))throw Error('Choisis un tempo de 30 à 240 BPM.');
 const durationSeconds=clamp(duration,30,600);bpm=clamp(Math.round(bpm),30,240);
 let names=/directement.{0,20}couplet|commence.{0,20}couplet/.test(text)?['Couplet 1','Pré-refrain','Refrain','Couplet 2','Refrain final','Outro']:['Introduction','Couplet 1','Pré-refrain','Refrain','Couplet 2','Pré-refrain 2','Refrain final','Outro'];
 if(/sans refrain/.test(text))names=['Introduction','Partie 1','Développement','Partie 2','Outro'];
 if(/un seul refrain/.test(text))names=['Introduction','Couplet 1','Pré-refrain','Refrain','Couplet 2','Outro'];
 if(/directement.{0,20}couplet|commence.{0,20}couplet/.test(text))names=names.filter(name=>name!=='Introduction');
 if(/sans (?:introduction|intro)\b/.test(text))names=names.filter(name=>name!=='Introduction');
 if(/sans outro/.test(text))names=names.filter(name=>name!=='Outro');
 const weights=names.map(name=>/Introduction/.test(name)?1:/Outro/.test(name)?1:/Pré/.test(name)?1:/Refrain/.test(name)?2:3);
 const explicit=[];const rx=/(\d{1,2}):(\d{2})\s*[-–—à]+\s*(\d{1,2}):(\d{2})\s*[:：-]?\s*(introduction|intro|pre[- ]?refrain|refrain|couplet(?:\s*\d+)?|pont|outro)/g;let match;
 while((match=rx.exec(text)))explicit.push({name:match[5].replace('pre','Pré'),startSeconds:Number(match[1])*60+Number(match[2]),endSeconds:Number(match[3])*60+Number(match[4]),energy:/refrain/.test(match[5])&&!/pre/.test(match[5])?.95:/intro|outro/.test(match[5])?.35:.65});
 let elapsed=0;const sum=weights.reduce((a,b)=>a+b,0);const sections=names.map((name,i)=>{const startSeconds=elapsed;elapsed=i===names.length-1?durationSeconds:Math.round(elapsed+durationSeconds*weights[i]/sum);return {name,startSeconds,endSeconds:elapsed,energy:/Refrain/.test(name)&&!/Pré/.test(name)?1:/Introduction|Outro/.test(name)?.35:/Pré/.test(name)?.65:.75};});
 const plan={name:mood==='minor'?'Échos de nuit':'Nouvelle lumière',durationSeconds,bpm,mood,style,instruments,sections:explicit.length?explicit:sections,description:message.slice(0,8000),references:references.map(r=>({name:r.name,url:r.url,analysis:r.analysis})),source:'Interprétation locale LYES',memoryUsed:memories.length};
 if(explicit.length)plan.durationSeconds=explicit.at(-1).endSeconds;
 return validatePlan(plan);
}
export function validatePlan(p){
 if(!p||typeof p.name!=='string'||!Number.isFinite(p.bpm)||p.bpm<30||p.bpm>240||!Number.isFinite(p.durationSeconds)||p.durationSeconds<30||p.durationSeconds>600||!['minor','major'].includes(p.mood)||!Array.isArray(p.instruments)||!p.instruments.length||p.instruments.length>24||p.instruments.some(id=>!presets.some(x=>x.id===id)))throw Error('La description musicale doit préciser une durée de 30 secondes à 10 minutes et des instruments disponibles.');
 if(p.durationSeconds*p.bpm>2048*60)throw Error('Ce tempo et cette durée dépassent les 512 mesures du studio.');
 if(!Array.isArray(p.sections)||!p.sections.length||p.sections.length>32)throw Error('La structure doit contenir de 1 à 32 parties.');let previous=0;
 for(const s of p.sections){if(typeof s.name!=='string'||!Number.isFinite(s.startSeconds)||!Number.isFinite(s.endSeconds)||Math.abs(s.startSeconds-previous)>.01||s.endSeconds<=s.startSeconds||s.endSeconds>p.durationSeconds+.01||!Number.isFinite(s.energy)||s.energy<0||s.energy>1)throw Error('Les parties doivent se suivre sans trou ni chevauchement, du début à la fin du morceau.');previous=s.endSeconds;}
 if(Math.abs(previous-p.durationSeconds)>.01)throw Error('La dernière partie doit se terminer à la durée demandée.');return p;
}
export function buildComposition(plan){
 validatePlan(plan);let seed=[...plan.description+uid()].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,17);const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const p=newProject(plan.name);p.bpm=plan.bpm;p.bars=plan.durationSeconds*plan.bpm/240;p.brief=structuredClone(plan);p.markers=plan.sections.map(s=>({name:s.name,beat:s.startSeconds*p.bpm/60,endBeat:s.endSeconds*p.bpm/60}));
 const minor=plan.mood==='minor';
 const harmony=minor?[[57,60,64],[53,57,60],[48,52,55],[55,59,62],[50,53,57],[52,56,59]]:
  [[60,64,67],[55,59,62],[57,60,64],[53,57,60],[50,53,57],[52,55,59]];
 const progressions={
  'afro mélodique':[[0,1,2,3],[0,3,1,3],[1,2,3,0]],
  'synth-pop nocturne':[[0,3,1,2],[4,1,3,5],[0,1,2,3]],
  'électronique':[[0,1,2,3],[1,3,4,0],[0,3,1,3]],
  trap:[[0,0,1,3],[0,4,1,5],[0,0,1,1]],
  jazz:[[0,2,4,5],[4,5,0,2],[0,4,3,5]],
  acoustique:[[0,2,3,1],[4,2,3,0],[0,3,1,2]]
 };
 const [verseChords,preChords,hookChords]=progressions[plan.style]??[[0,1,2,3],[4,1,3,5],[0,3,1,2]];
 const notesPerTrack=Math.floor(49_000/plan.instruments.length);
 const barCount=Math.ceil(plan.durationSeconds*plan.bpm/240)+plan.sections.length;
 const perBar=Math.max(3,Math.floor(notesPerTrack/barCount));
 const shift=[0,2,-2,3][Math.floor(random()*4)],colors=['#8b64ff','#e56bc0','#4fc8ce','#b27cff','#7c8cff'];
 const palette=plan.instruments.map(id=>instrumentPart(lookup.get(id)));
 const primary=palette.findIndex(part=>!['kit','bass','noise'].includes(part));
 const motif=Array.from({length:8},()=>Math.floor(random()*3));
 for(const [index,id]of plan.instruments.entries()){
 const part=palette[index],t=newTrack(id);t.color=colors[index%colors.length];t.volume=part==='kit'?.62:part==='bass'?.57:.42;
 t.volume/=Math.max(1,Math.sqrt(plan.instruments.length/5));
 t.reverb=['keys','harmony'].includes(part)?.2:.06;
 if(part!=='kit'&&part!=='bass'&&index!==primary)t.pan=(index%2?.22:-.22);
 for(const [sectionIndex,s]of plan.sections.entries()){
 const start=s.startSeconds*p.bpm/60,end=s.endSeconds*p.bpm/60;const intro=/intro/i.test(s.name),outro=/outro/i.test(s.name),pre=/pré|pre/i.test(s.name),chorus=!pre&&/refrain/i.test(s.name);
 if(primary>=0&&intro&&(part==='kit'||part==='bass'||(index!==primary&&part==='lead')))continue;
 if(outro&&index!==primary&&['kit','lead','noise'].includes(part)&&plan.instruments.length>1)continue;
 for(let at=start;at<end-.0625;at+=16){const length=Math.min(16,end-at);const c=newClip(at,length);c.name=s.name;
 let barNotes=0;
 const add=(time,pitch,duration,velocity)=>{if(barNotes>=perBar||time>=length-.03125||time<0)return;duration=Math.min(duration,length-time);if(duration<.03125)return;barNotes++;c.notes.push({id:uid(),time,pitch:clamp(Math.round(pitch+shift),0,127),duration,velocity:clamp(velocity,.05,.95)});};
 for(let beat=0;beat<length;beat+=4){
 barNotes=0;
 const progression=chorus?hookChords:pre?preChords:verseChords;
 const bar=Math.round((at+beat-start)/4),chord=harmony[progression[bar%progression.length]],power=s.energy;
 const sectionBeat=at+beat-start,remaining=end-(at+beat);
 const next=plan.sections[sectionIndex+1],build=next&&next.energy>s.energy&&remaining<=4;
 const fade=outro?Math.max(.28,1-sectionBeat/Math.max(4,end-start)*.68):1;
 const level=(.46+power*.54)*fade;
 if(part==='kit'){
  const groove=plan.style==='afro mélodique'?[[0,36,.9],[1.5,36,.67],[2,38,.76],[3.5,36,.8]]:
   plan.style==='électronique'?[[0,36,.95],[1,36,.83],[2,36,.88],[3,36,.85],[1,38,.74],[3,38,.76]]:
   plan.style==='trap'?[[0,36,.95],[1.75,36,.66],[2,38,.82],[3.25,36,.72]]:
   plan.style==='jazz'?[[0,36,.52],[1,38,.33],[2,36,.42],[3,38,.36]]:
   plan.style==='synth-pop nocturne'?[[0,36,.92],[1,38,.76],[2,36,.83],[2.75,36,.65],[3,38,.83]]:
   [[0,36,.9],[1,38,.72],[2.5,36,.81],[3,38,.81]];
  for(const [b,pitch,v] of groove)add(beat+b,pitch-shift,.15,v*level);
  const step=chorus&&plan.style==='trap'?.25:.5;
  for(let h=0;h<4&&(!build||h<remaining-.25);h+=step){
   const swing=plan.style==='jazz'&&h%1?.16:0;
   add(beat+h+swing,42-shift,.08,(h%1?.32:.49)*level);
  }
  if(build)for(let h=Math.max(0,remaining-1);h<remaining-.0625;h+=.25)add(beat+h,38-shift,.09,.39+h*.12);
 }else if(part==='bass'){
  add(beat,chord[0]-24,chorus?1.9:1.48,.76*level);
  add(beat+(plan.style==='afro mélodique'?1.75:2.5),chord[chorus&&bar%2?2:0]-24,1.08,.61*level);
  if(build)add(beat+remaining-.5,chord[2]-24,.42,.54*level);
 }else if(part==='keys'||part==='harmony'){
  const inversion=chorus&&bar%2?1:0;
  chord.forEach((n,j)=>add(beat+j*.034,n+(j<inversion?12:0),build?Math.max(.1,remaining-.5):pre?2.3:3.52,(chorus?.61:.49)*level));
  if(chorus&&part==='keys')add(beat+2.5,chord[2]+12,.51,.36*level);
 }else if(part==='noise'){
  for(const offset of (chorus?[.5,1.5,2.5,3.5]:[1.5,3.5]))add(beat+offset,54,.11,.42*level);
 }else{
  const pattern=chorus?[0,.5,1.5,2,2.75,3.5]:pre?[0,1,2.5,3.5]:[0,1.25,2.5,3.25];
  for(const [i,off] of pattern.entries()){
   if(!chorus&&i>0&&random()<.14)continue;
   const note=chord[(motif[(i+index+Math.floor(sectionBeat/4))%motif.length]+(bar%4===3?1:0))%3];
   const oct=part==='pluck'&&/guitare/i.test(t.name)?0:12;
   add(beat+off,note+oct,part==='pluck'?.38:.66,(.45+(i%3===0?.14:0))*level);
  }
  if(build)add(beat+remaining-.25,chord[2]+12,.19,.46*level);
 }
 }
 if(c.notes.length)t.clips.push(c);
 }
 }
 p.tracks.push(t);
 }
 return validateProject(p);
}
export function describePlan(plan){return `${plan.source}. ${clock(plan.durationSeconds)} · ${plan.style} · ${plan.bpm} BPM.\nInstruments : ${plan.instruments.map(id=>lookup.get(id).name).join(', ')}.\n${plan.sections.map(s=>`${clock(s.startSeconds)}–${clock(s.endSeconds)} : ${s.name}`).join('\n')}\nLes liens servent de repères descriptifs ; aucune mélodie ni aucun enregistrement n’est repris.`;}
