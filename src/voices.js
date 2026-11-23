import {uid,newTrack,extent,validateProject} from './model.js';
export function makeVocalProject(project,{asset,data,duration}){
 const p=structuredClone(project);if(!Number.isFinite(duration)||duration<=0||typeof data!=='string')throw Error('L’instrumentale n’a pas pu être préparée.');
 const sources=p.tracks.filter(t=>t.role!=='vocal'&&t.role!=='backing');
 if(!sources.length)throw Error('Ajoute une production avant de passer aux voix.');
 p.tracks=p.tracks.filter(t=>t.role!=='backing');
 const state=sources.map(t=>({id:t.id,mute:t.mute,solo:t.solo}));for(const t of p.tracks)if(t.role!=='vocal'){t.mute=true;t.solo=false;}
 const backing=newTrack();backing.role='backing';backing.name='Instrumentale enregistrée';backing.volume=1;backing.reverb=0;backing.delay=0;backing.filter=20000;backing.color='#8068ff';backing.clips=[{id:uid(),type:'audio',name:'Instrumentale',asset,start:0,length:duration*p.bpm/60,offset:0}];
 p.assets[asset]={name:'Instrumentale.wav',mime:'audio/wav',data};p.tracks.push(backing);p.voices={active:true,backingTrackId:backing.id,sourceState:state,preparedAt:Date.now()};p.kind='Avec voix';return validateProject(p);
}
export function returnToProduction(project){const p=structuredClone(project);if(!p.voices)return p;for(const t of p.tracks){if(t.role==='backing'){t.mute=true;t.solo=false;}const state=p.voices.sourceState.find(s=>s.id===t.id);if(state){t.mute=state.mute;t.solo=state.solo;}}p.voices.active=false;return p;}
export function instrumentalSource(project){const p=structuredClone(project);p.tracks=p.tracks.filter(t=>t.role!=='vocal'&&t.role!=='backing');p.master=1;p.bars=extent({...p,bars:project.brief?project.brief.durationSeconds*p.bpm/240:project.bars})/4;return p;}
