import {clamp,noteName,validateProject,newTrack,presets} from './model.js';
import {interpretArrangement,applyArrangement} from './arrangement.js';
import {findInstrument} from './composer.js';
import {normalizeText} from './instruments.js';
export const providerContract={request:'{project, selection, message}',response:'{explanation, commands: [{type, trackId, clipId?, noteId?, value}]}',note:'Un fournisseur distant doit être appelé par un serveur protégeant ses clés. Toutes ses commandes doivent être validées ici.'};
export function interpret(message,p,selection={}){
 const text=message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/^(qu.est|explique|c.est quoi|comment|pourquoi)/.test(text)){
 const lessons={bpm:'Le BPM compte les pulsations par minute. À 90 BPM, une noire dure 0,667 seconde. Changer le tempo adapte le MIDI ; les fichiers audio gardent leur vitesse.',reverb:'La réverbération ajoute des réflexions qui évoquent un espace. Une petite quantité rapproche le son ; une longue queue crée une ambiance.',808:'Une 808 est un son de grosse caisse électronique, souvent accordé pour servir aussi de basse.',refrain:'Un refrain peut revenir avec une mélodie reconnaissable et davantage de densité. Tu peux aussi choisir une structure sans refrain.',mineur:'Une tonalité mineure organise les notes autour d’une tonique avec une tierce mineure. Elle peut évoquer la mélancolie selon le rythme et le timbre.'};
 return {explanation:Object.entries(lessons).find(([k])=>text.includes(k))?.[1]||'Je peux expliquer le BPM, la réverbération, la 808, le refrain et le mode mineur. Ce conseiller local ne dispose pas encore d’un modèle de langage.',commands:[]};}
 if(/ton avis|que penses|tu penses|conseille/.test(text))return {explanation:'Pour mieux distinguer les parties, tu peux renforcer le rythme des refrains et laisser davantage de place à la voix dans les couplets. Je n’ai pas analysé ton mix à l’oreille : c’est une piste d’arrangement, pas un jugement sur sa qualité. Rien n’a été modifié.',commands:[]};
 const changeInstrument=text.match(/(?:remplace|change|transforme)\s+(.*?)\s+(?:par|en|pour)\s+(.+)/);
 if(changeInstrument){
  const destination=findInstrument(changeInstrument[2]);
  if(!destination)throw Error('Je ne trouve pas ce nouvel instrument dans la bibliothèque.');
  const sourceName=normalizeText(changeInstrument[1]);
  const sourceInstrument=findInstrument(sourceName);
  const named=p.tracks.filter(t=>normalizeText(t.name)===sourceName||
   sourceName.includes(normalizeText(t.name))||t.preset===sourceInstrument?.id);
  const selected=named.find(t=>t.id===selection.trackId);
  const source=selected??(named.length===1?named[0]:null)??(/cette piste|instrument selectionne/.test(sourceName)?p.tracks.find(t=>t.id===selection.trackId):null);
  if(!source)throw Error('Précise le nom de la piste à remplacer, ou sélectionne-la.');
  if(source.clips.some(c=>c.type!=='midi')||source.role==='vocal'||source.role==='backing')throw Error('Un changement d’instrument s’applique aux pistes MIDI.');
  return {explanation:`Remplacer ${source.name} par ${destination.name} en gardant les notes et l’arrangement.`,
   commands:[{type:'instrument',trackId:source.id,preset:destination.id,value:0}]};
 }
 const arrangement=interpretArrangement(message,p);if(arrangement)return arrangement;
 const aliases={piano:/piano|clavier/,guitar:/guitare/,bass:/basse|808/,drums:/batterie|drums/,pad:/nappe/};
 const target=p.tracks.find(t=>text.includes(t.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')))||p.tracks.find(t=>aliases[t.preset]?.test(text))||p.tracks.find(t=>selection.trackId===t.id);
 const num=text.match(/-?\d+(?:[.,]\d+)?/);const value=num?Number(num[0].replace(',','.')):null;
 if(/bpm|tempo/.test(text)&&value!==null)return {explanation:`Tempo : ${clamp(value,30,240)} BPM.`,commands:[{type:'tempo',value:clamp(value,30,240)}]};
 if(!target)throw Error('Sélectionne une piste avant de demander une modification.');
 const base={trackId:target.id};let cmd,explanation;
 if(/reverb/.test(text)){cmd={type:'parameter',...base,key:'reverb',value:value!==null?clamp(value/100,0,1):clamp(target.reverb+(/baisse|moins|diminue/.test(text)?-.15:.15),0,1)};explanation=`Réverbération de ${target.name} : ${Math.round(cmd.value*100)} %.`;}
 else if(/delay/.test(text)){cmd={type:'parameter',...base,key:'delay',value:value!==null?clamp(value/100,0,1):clamp(target.delay+.15,0,1)};explanation=`Delay : ${Math.round(cmd.value*100)} %.`;}
 else if(/volume/.test(text)){cmd={type:'parameter',...base,key:'volume',value:value!==null?clamp(value/100,0,1):clamp(target.volume+(/baisse|moins|diminue/.test(text)?-.1:.1),0,1)};explanation=`Volume : ${Math.round(cmd.value*100)} %.`;}
 else if(/octave|demi.ton|note|hauteur/.test(text)){
 const c=target.clips.find(c=>c.id===selection.clipId&&c.type==='midi');if(!c)throw Error('Sélectionne un clip MIDI.');const n=c.notes.find(n=>n.id===selection.noteId);
 const pitch=text.match(/\b(do|re|mi|fa|sol|la|si)(#|♯)?\s*(-?\d)\b/);let delta=/baisse|descend|grave/.test(text)?-1:1;delta*=text.includes('octave')?12:(value??1);
 if(pitch){if(!n)throw Error('Sélectionne une note précise.');const targetPitch=({do:0,re:2,mi:4,fa:5,sol:7,la:9,si:11}[pitch[1]])+(pitch[2]?1:0)+(Number(pitch[3])+1)*12;delta=targetPitch-n.pitch;}
 cmd={type:'transpose',...base,clipId:c.id,noteId:n?.id,value:delta};explanation=n?`${noteName(n.pitch)} devient ${noteName(clamp(n.pitch+delta,0,127))}.`:`Transposer le clip de ${delta} demi-tons.`;
 }else if(/decale|deplace|entrer/.test(text)&&value!==null){const c=target.clips.find(c=>c.id===selection.clipId);if(!c)throw Error('Sélectionne un clip.');let beat=/milliseconde|\bms\b/.test(text)?value*p.bpm/60000:/mesure/.test(text)?value*4:value;if(/avance|avant/.test(text))beat=-beat;cmd={type:'move',...base,clipId:c.id,value:Math.max(0,c.start+beat)};explanation=`Déplacer « ${c.name} » au temps ${cmd.value+1}.`;
 }else throw Error('Je ne sais pas encore traduire cette formulation en modification fiable. Je peux notamment dynamiser un refrain, marquer les couplets, varier les répétitions, alléger une partie ou modifier un instrument. Indique la partie concernée et le changement que tu veux entendre.');
 return {explanation,commands:[cmd]};
}
export function applyCommands(p,commands){
 if(!Array.isArray(commands)||commands.length>64)throw Error('Commandes invalides');let result=structuredClone(p);
 for(const cmd of commands){if(!cmd||!Number.isFinite(cmd.value))throw Error('Valeur invalide');if(cmd.type==='arrange'){result=applyArrangement(result,cmd);continue;}if(cmd.type==='tempo'){if(cmd.value<30||cmd.value>240)throw Error('Tempo invalide');result.bpm=cmd.value;continue;}
 const t=result.tracks.find(t=>t.id===cmd.trackId);if(!t)throw Error('Piste introuvable');
 if(cmd.type==='instrument'){
  const preset=presets.find(p=>p.id===cmd.preset);
  if(!preset||t.role==='vocal'||t.role==='backing'||t.clips.some(c=>c.type!=='midi'))throw Error('Instrument ou piste MIDI invalide.');
  const sound=newTrack(preset.id);
  Object.assign(t,{preset:sound.preset,name:sound.name,attack:sound.attack,release:sound.release,filter:sound.filter});
 }else if(cmd.type==='parameter'){if(!['volume','reverb','delay'].includes(cmd.key)||cmd.value<0||cmd.value>1)throw Error('Paramètre interdit');t[cmd.key]=cmd.value;}
 else {const c=t.clips.find(c=>c.id===cmd.clipId);if(!c)throw Error('Clip introuvable');if(cmd.type==='move'){if(cmd.value<0||cmd.value+c.length>2048)throw Error('Position invalide');c.start=cmd.value;}
 else if(cmd.type==='transpose'){if(c.type!=='midi'||!Number.isInteger(cmd.value)||Math.abs(cmd.value)>127)throw Error('Transposition invalide');if(cmd.noteId&&!c.notes.some(n=>n.id===cmd.noteId))throw Error('Note introuvable');for(const n of c.notes)if(!cmd.noteId||n.id===cmd.noteId)n.pitch=clamp(n.pitch+cmd.value,0,127);}
 else throw Error('Commande interdite');}}
 return validateProject(result);
}
