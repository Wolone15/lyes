import {newProject,newTrack,newClip,uid,clamp,validateProject,presets} from './model.js';
import {isArrangementRequest} from './arrangement.js';
export const normalize=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const families={piano:['piano','clavier'],guitar:['guitare','guitares','guitar'],bass:['basse','808','basses'],drums:['batterie','drums','rythmique','percussions'],pad:['nappe','ambiance aerienne','atmospherique'],strings:['cordes','violon'],flute:['flute'],organ:['orgue'],brass:['cuivres','trompette']};
export function isCompositionRequest(message,{hasProject=false}={}){const text=normalize(message);if(hasProject&&isArrangementRequest(text)&&!/(?:nouvelle|autre)\s+(?:prod|production|musique|composition)|(?:repars|recommence).{0,15}(?:zero|debut)/.test(text))return false;return /(?:fais|cree|compose|genere|veux|voudrais|construis|prepare).{0,90}(?:prod|morceau|son\b|musique|instrumental|composition|beat\b)/.test(text);}
export function parseBrief(message,{references=[],memories=[]}={}){
 const text=normalize(message);if(!text.trim())throw Error('Décris le morceau que tu souhaites créer.');
 let duration=180;const minute=text.match(/(\d+(?:[.,]\d+)?)\s*(?:minutes?\b|min\b|m\b)/),second=text.match(/(\d+)\s*(?:secondes?|sec|s)\b/),time=text.match(/(?:duree|durera|de)\s*(\d+):(\d{2})/);
 if(minute)duration=Number(minute[1].replace(',','.'))*60+(second?Number(second[1]):0);else if(second)duration=Number(second[1]);else if(time)duration=Number(time[1])*60+Number(time[2]);
 const tempo=text.match(/(?:bpm|tempo|vitesse|rythme)\s*(?:a|de|:)?\s*(\d{2,3})|\b(\d{2,3})\s*bpm/);
 const style=/afro|tiakola|tiako|palav|meuda|r&b|rnb/.test(text)?'afro mélodique':/electro|house|dance/.test(text)?'électronique':/trap|drill/.test(text)?'trap':/rap|la fouine|rotterdam/.test(text)?'rap mélodique':'mélodique';
 const ref=references.find(r=>r.analysis?.tempo?.bpm);let bpm=tempo?Number(tempo[1]||tempo[2]):ref?.analysis.tempo.bpm??(style==='électronique'?124:style==='afro mélodique'?102:style==='trap'?140:90);
 const mood=/joyeu|lumineu|majeur|festif/.test(text)?'major':'minor';
 const instruments=Object.entries(families).filter(([,aliases])=>aliases.some(a=>text.includes(a))).map(([id])=>id);
 for(const [id,aliases]of Object.entries(families))if(aliases.some(a=>new RegExp(`(?:sans|pas de|retire)\\s+(?:la? |les? |de )?${a}`).test(text))){const i=instruments.indexOf(id);if(i>=0)instruments.splice(i,1);}
 const excluded=id=>families[id]?.some(a=>new RegExp(`(?:sans|pas de)\\s+(?:la? |les? |de )?${a}`).test(text));
 if(!instruments.length)instruments.push(...['piano','guitar','bass','drums'].filter(id=>!excluded(id)));
 else for(const id of ['bass','drums'])if(!instruments.includes(id)&&!excluded(id))instruments.push(id);
 if(!instruments.length)throw Error('Indique au moins un instrument que tu souhaites entendre.');
 const durationSeconds=clamp(duration,30,600);bpm=clamp(Math.round(bpm),45,200);
 let names=/directement.{0,20}couplet|commence.{0,20}couplet/.test(text)?['Couplet 1','Pré-refrain','Refrain','Couplet 2','Refrain final','Outro']:['Introduction','Couplet 1','Pré-refrain','Refrain','Couplet 2','Pré-refrain 2','Refrain final','Outro'];
 if(/sans refrain/.test(text))names=['Introduction','Partie 1','Développement','Partie 2','Outro'];
 if(/un seul refrain/.test(text))names=['Introduction','Couplet 1','Pré-refrain','Refrain','Couplet 2','Outro'];
 if(/directement.{0,20}couplet|commence.{0,20}couplet/.test(text))names=names.filter(name=>name!=='Introduction');
 const weights=names.map(name=>/Introduction/.test(name)?1:/Outro/.test(name)?1:/Pré/.test(name)?1:/Refrain/.test(name)?2:3);
 const explicit=[];const rx=/(\d{1,2}):(\d{2})\s*[-–—à]+\s*(\d{1,2}):(\d{2})\s*[:：-]?\s*(introduction|intro|pre[- ]?refrain|refrain|couplet(?:\s*\d+)?|pont|outro)/g;let match;
 while((match=rx.exec(text)))explicit.push({name:match[5].replace('pre','Pré'),startSeconds:Number(match[1])*60+Number(match[2]),endSeconds:Number(match[3])*60+Number(match[4]),energy:/refrain/.test(match[5])&&!/pre/.test(match[5])?.95:/intro|outro/.test(match[5])?.35:.65});
 let elapsed=0;const sum=weights.reduce((a,b)=>a+b,0);const sections=names.map((name,i)=>{const startSeconds=elapsed;elapsed=i===names.length-1?durationSeconds:Math.round(elapsed+durationSeconds*weights[i]/sum);return {name,startSeconds,endSeconds:elapsed,energy:/Refrain/.test(name)&&!/Pré/.test(name)?1:/Introduction|Outro/.test(name)?.35:/Pré/.test(name)?.65:.75};});
 const plan={name:mood==='minor'?'Échos de nuit':'Nouvelle lumière',durationSeconds,bpm,mood,style,instruments,sections:explicit.length?explicit:sections,description:message.slice(0,8000),references:references.map(r=>({name:r.name,url:r.url,analysis:r.analysis})),source:'Interprétation locale LYES',memoryUsed:memories.length};
 if(explicit.length)plan.durationSeconds=explicit.at(-1).endSeconds;
 return validatePlan(plan);
}
export function validatePlan(p){
 if(!p||typeof p.name!=='string'||!Number.isFinite(p.bpm)||p.bpm<30||p.bpm>240||!Number.isFinite(p.durationSeconds)||p.durationSeconds<30||p.durationSeconds>600||!['minor','major'].includes(p.mood)||!Array.isArray(p.instruments)||!p.instruments.length||p.instruments.length>12||p.instruments.some(id=>!presets.some(x=>x.id===id)))throw Error('La description musicale doit préciser une durée de 30 secondes à 10 minutes et des instruments disponibles.');
 if(!Array.isArray(p.sections)||!p.sections.length||p.sections.length>32)throw Error('La structure doit contenir de 1 à 32 parties.');let previous=0;
 for(const s of p.sections){if(typeof s.name!=='string'||!Number.isFinite(s.startSeconds)||!Number.isFinite(s.endSeconds)||Math.abs(s.startSeconds-previous)>.01||s.endSeconds<=s.startSeconds||s.endSeconds>p.durationSeconds+.01||!Number.isFinite(s.energy)||s.energy<0||s.energy>1)throw Error('Les parties doivent se suivre sans trou ni chevauchement, du début à la fin du morceau.');previous=s.endSeconds;}
 if(Math.abs(previous-p.durationSeconds)>.01)throw Error('La dernière partie doit se terminer à la durée demandée.');return p;
}
export function buildComposition(plan){
 validatePlan(plan);let seed=[...plan.description+uid()].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,17);const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const p=newProject(plan.name);p.bpm=plan.bpm;p.bars=plan.durationSeconds*plan.bpm/240;p.brief=structuredClone(plan);p.markers=plan.sections.map(s=>({name:s.name,beat:s.startSeconds*p.bpm/60,endBeat:s.endSeconds*p.bpm/60}));
 const chords=plan.mood==='minor'?[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]:[[60,64,67],[55,59,62],[57,60,64],[53,57,60]];
 const shift=[0,2,-2,3][Math.floor(random()*4)],colors=['#8b64ff','#e56bc0','#4fc8ce','#b27cff','#7c8cff'];
 for(const [index,id]of plan.instruments.entries()){
 const t=newTrack(id);t.color=colors[index%colors.length];t.volume=id==='drums'?.6:id==='bass'?.6:.43;t.reverb=['piano','guitar','pad'].includes(id)?.25:.06;
 for(const [sectionIndex,s]of plan.sections.entries()){
 const start=s.startSeconds*p.bpm/60,end=s.endSeconds*p.bpm/60;if((id==='drums'||id==='bass')&&/Introduction/.test(s.name))continue;
 for(let at=start;at<end-.0625;at+=16){const length=Math.min(16,end-at);const c=newClip(at,length);c.name=s.name;
 const add=(time,pitch,duration,velocity)=>{if(time>=length-.03125||time<0)return;duration=Math.min(duration,length-time);if(duration<.03125)return;c.notes.push({id:uid(),time,pitch:clamp(Math.round(pitch+shift),0,127),duration,velocity:clamp(velocity,.05,.95)});};
 for(let beat=0;beat<length;beat+=4){const bar=Math.floor((at+beat)/4),chord=chords[(bar+Math.floor(sectionIndex/3))%4],power=s.energy;
 if(id==='drums'){for(const [b,pitch,v]of [[0,36,.9],[1,38,.7],[2.5,36,.8],[3,38,.8]])if(beat+b<length){add(beat+b,pitch-shift,.16,v*power);}const step=plan.style==='trap'?.25:.5;for(let h=0;h<4;h+=step)add(beat+h,42-shift,.08,(h%1?.35:.55)*power);}
 else if(id==='bass'){add(beat,chord[0]-12,1.5,.8*power);add(beat+2.5,chord[0]-12,1.2,.65*power);}
 else if(id==='piano'||['pad','strings','choir','organ','brass'].includes(id)){chord.forEach((n,j)=>add(beat+j*.025,n,id==='piano'?3.2:3.8,.58*(.65+power*.35)));if(power>.8&&id==='piano')add(beat+2.5,chord[2]+12,.5,.35);}
 else {for(let j=0;j<(power>.7?8:4);j++){const step=power>.7?.5:1;if(random()<.13)continue;const note=chord[(j+Math.floor(random()*3))%3]+12;add(beat+j*step,note,step*.8,.4+random()*.25);}}
 }
 if(c.notes.length)t.clips.push(c);
 }
 }
 p.tracks.push(t);
 }
 return validateProject(p);
}
export function describePlan(plan){return `${plan.source}. ${clock(plan.durationSeconds)} · ${plan.style} · ${plan.bpm} BPM.\n${plan.sections.map(s=>`${clock(s.startSeconds)}–${clock(s.endSeconds)} : ${s.name}`).join('\n')}\nLes liens servent de repères descriptifs ; aucune mélodie ni aucun enregistrement n’est repris.`;}
