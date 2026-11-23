import {compose,newProject,newTrack,newClip,uid,validateProject} from './model.js';
import {AudioEngine,wav} from './engine.js';
import {interpret,applyCommands} from './assistant.js';
import * as storage from './storage.js';
import {readMidi,writeMidi} from './midi.js';
export async function runDiagnostics(){
 const lines=[],check=(condition,label)=>{if(!condition)throw Error(label);lines.push('OK · '+label);};const engine=new AudioEngine();let tempId;
 try{
 const p=compose({bars:4});p.bars=1;p.tracks.forEach(t=>t.clips=t.clips.slice(0,1));validateProject(p);check(p.tracks.length===4,'Projet à quatre instruments valide');
 const buffer=await engine.render(p),data=buffer.getChannelData(0);let peak=0;for(const n of data)peak=Math.max(peak,Math.abs(n));check(peak>.001,'Rendu multipiste non silencieux ('+peak.toFixed(3)+')');
 const ab=wav(buffer),header=new DataView(ab);check(header.getUint32(24,true)===44100&&header.getUint16(22,true)===2&&ab.byteLength===44+buffer.length*4,'WAV stéréo 44,1 kHz / 16 bits');
 const t=p.tracks[0],c=t.clips[0],n=c.notes[0],selection={trackId:t.id,clipId:c.id,noteId:n.id};const commands=interpret('Monte cette note d’une octave',p,selection),changed=applyCommands(p,commands.commands);check(changed.tracks[0].clips[0].notes[0].pitch===n.pitch+12&&p.tracks[0].clips[0].notes[0].pitch===n.pitch,'Commande locale appliquée sans mutation source');
 const make=()=>{const p=newProject('FX test');p.bars=1;const t=newTrack('guitar'),c=newClip(0,4);c.notes=[{id:uid(),pitch:60,time:0,duration:.5,velocity:.8}];t.reverb=0;t.clips=[c];p.tracks=[t];return p;};const dry=make(),wet=structuredClone(dry);wet.tracks[0].reverb=.9;const b1=await engine.render(dry),b2=await engine.render(wet);let difference=0;for(let i=0;i<b1.length;i++)difference+=Math.abs(b1.getChannelData(0)[i]-b2.getChannelData(0)[i]);check(difference>1,'Réverbération modifie les échantillons audio');
 const imported=readMidi(writeMidi(p).buffer);check(imported.tracks.flatMap(t=>t.clips.flatMap(c=>c.notes)).length===p.tracks.flatMap(t=>t.clips.flatMap(c=>c.notes)).length,'Aller-retour MIDI sans perte de notes');
 const sample=newProject('Diagnostic temporaire');tempId=sample.id;const id=uid();sample.assets[id]={name:'test.wav',mime:'audio/wav',data:await storage.blobData(new Blob([ab],{type:'audio/wav'}))};await storage.save(sample);const recovered=await storage.load(tempId);check(recovered.assets[id].data===sample.assets[id].data,'La sauvegarde privée du compte conserve les ressources audio');await storage.remove(tempId);tempId=null;
 const decoded=await engine.decode('roundtrip',ab);check(Math.abs(decoded.duration-buffer.duration)<.001,'WAV exporté redécodable dans le navigateur (rééchantillonnage autorisé)');
 lines.push('\nNon testés ici : écoute humaine, microphone réel, latence, autres navigateurs et appareils.');return lines.join('\n');
 }finally{engine.stop();if(engine.ctx)await engine.ctx.close();if(tempId)await storage.remove(tempId);}
}

