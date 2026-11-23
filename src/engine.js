import {instrumentPart} from './instruments.js';
import {presets,extent,clamp} from './model.js';
export function wav(buffer){
 const channels=buffer.numberOfChannels,frames=buffer.length,bytes=frames*channels*2,ab=new ArrayBuffer(44+bytes),v=new DataView(ab);const str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
 str(0,'RIFF');v.setUint32(4,36+bytes,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,bytes,true);
 const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let o=44;for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){const s=clamp(data[c][i],-1,1);v.setInt16(o,Math.round(s*(s<0?32768:32767)),true);o+=2;}return ab;
}
const noiseCache=new WeakMap();
const waveCache=new WeakMap();
function harmonicWave(ctx,preset){
 let waves=waveCache.get(ctx);if(!waves){waves=new Map();waveCache.set(ctx,waves);}
 if(!waves.has(preset.id)){const imaginary=new Float32Array([0,...preset.harmonics]);waves.set(preset.id,ctx.createPeriodicWave(new Float32Array(imaginary.length),imaginary));}
 return waves.get(preset.id);
}
function noise(ctx,seconds){if(noiseCache.has(ctx))return noiseCache.get(ctx);const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);let seed=3571;for(let i=0;i<d.length;i++){seed=(seed*16807)%2147483647;d[i]=(seed/2147483647*2-1);}noiseCache.set(ctx,b);return b;}
function impulse(ctx){const b=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*2),ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);let seed=57+c*179;for(let i=0;i<d.length;i++){seed=seed*16807%2147483647;d[i]=(seed/2147483647*2-1)*Math.pow(1-i/d.length,3);}}return b;}
export class AudioEngine{
 constructor(){this.ctx=null;this.playing=false;this.position=0;this.timer=null;this.buffers=new Map();this.nodes=new Map();this.sources=new Set();this.metronome=false;this.loop=false;this.recording=false;this.onended=()=>{};}
 async init({resume=true}={}){if(!this.ctx){this.ctx=new AudioContext({latencyHint:'interactive'});this.noise=noise(this.ctx,1);this.impulse=impulse(this.ctx);}if(resume&&this.ctx.state==='suspended')await this.ctx.resume();return this.ctx;}
 async decode(id,data){await this.init({resume:false});if(!this.buffers.has(id)){const bytes=typeof data==='string'?await(await fetch(data)).arrayBuffer():data;this.buffers.set(id,await this.ctx.decodeAudioData(bytes.slice(0)));}return this.buffers.get(id);}
 async prepare(p,{resume=true}={}){await this.init({resume});for(const [id,a]of Object.entries(p.assets))await this.decode(id,a.data);}
 graph(ctx,p){const master=ctx.createGain(),limiter=ctx.createDynamicsCompressor(),analyser=ctx.createAnalyser();master.gain.value=p.master;limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.003;limiter.release.value=.1;analyser.fftSize=256;master.connect(limiter);limiter.connect(analyser);analyser.connect(ctx.destination);
 const nodes=new Map(),solo=p.tracks.some(t=>t.solo),live=ctx===this.ctx;const ir=live?this.impulse:impulse(ctx);
 for(const t of p.tracks){const muted=t.mute||(solo&&!t.solo);if(!live&&(muted||t.volume===0))continue;const input=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner(),gain=ctx.createGain(),verb=ctx.createConvolver(),wet=ctx.createGain(),delay=ctx.createDelay(2),feedback=ctx.createGain(),dw=ctx.createGain();filter.type='lowpass';filter.frequency.value=t.filter;pan.pan.value=t.pan;gain.gain.value=muted?0:t.volume;wet.gain.value=t.reverb*.65;delay.delayTime.value=60/p.bpm*.75;feedback.gain.value=.32;dw.gain.value=t.delay*.5;
 input.connect(filter);filter.connect(pan);pan.connect(gain);
 // Offline mixes have fixed settings, so silent effect branches need no processing.
 if(live||t.reverb>0){verb.buffer=ir;pan.connect(verb);verb.connect(wet);wet.connect(gain);}
 if(live||t.delay>0){pan.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(dw);dw.connect(gain);}
 gain.connect(master);nodes.set(t.id,{input,filter,pan,gain,wet,dw,all:[input,filter,pan,gain,verb,wet,delay,feedback,dw]});}return {master,analyser,limiter,nodes};}
 sync(p){this.project=p;if(!this.graphLive)return;this.graphLive.master.gain.setTargetAtTime(p.master,this.ctx.currentTime,.02);const solo=p.tracks.some(t=>t.solo);for(const t of p.tracks){const n=this.graphLive.nodes.get(t.id);if(!n)continue;for(const [param,val]of [[n.filter.frequency,t.filter],[n.pan.pan,t.pan],[n.gain.gain,t.mute||(solo&&!t.solo)?0:t.volume],[n.wet.gain,t.reverb*.65],[n.dw.gain,t.delay*.5]])param.setTargetAtTime(val,this.ctx.currentTime,.02);}}
 voice(ctx,t,n,time,duration,destination,register=()=>{}){
 const p=presets.find(p=>p.id===t.preset)||presets[0],env=ctx.createGain(),freq=440*2**((n.pitch-69)/12),vel=n.velocity*.23;env.connect(destination);
 const start=Math.max(ctx.currentTime,time),dur=Math.max(.025,duration),release=t.release;
 const sources=[];const osc=(wave,f,g=1)=>{const o=ctx.createOscillator(),a=ctx.createGain();if(typeof wave==='string')o.type=wave;else o.setPeriodicWave(wave);o.frequency.setValueAtTime(f,start);a.gain.value=g;o.connect(a);a.connect(env);sources.push(o);return o;};
 let end=start+dur+release;
 const part=instrumentPart(p);
 if(part==='kit'){
 const kit=p.kit??{kick:1,snare:1,hat:1};
 if(n.pitch<38){const o=osc('sine',135*kit.kick);o.frequency.exponentialRampToValueAtTime(42*kit.kick,start+.18);env.gain.setValueAtTime(vel*2.8,start);env.gain.exponentialRampToValueAtTime(.00001,start+.4);end=start+.42;}
 else {const s=ctx.createBufferSource(),f=ctx.createBiquadFilter();s.buffer=ctx===this.ctx?this.noise:noise(ctx,1);f.type='highpass';f.frequency.value=n.pitch>=42?6500*kit.hat:1400*kit.snare;s.connect(f);f.connect(env);sources.push(s);if(n.pitch<42)osc('triangle',170,.3);const len=n.pitch>=42?.075*kit.hat:.19*kit.snare;env.gain.setValueAtTime(vel*(n.pitch>=42?.75:1.6),start);env.gain.exponentialRampToValueAtTime(.00001,start+len);end=start+len+.02;}
 }else if(part==='noise'){
 const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter();s.buffer=noise(ctx,1);filter.type='bandpass';filter.frequency.value=7000;s.connect(filter);filter.connect(env);sources.push(s);
 env.gain.setValueAtTime(vel,start);env.gain.exponentialRampToValueAtTime(.00001,start+.12);end=start+.14;
 }else{
 const wave=p.harmonics?.length?harmonicWave(ctx,p):p.wave;
 osc(wave,freq);if(p.width)osc(wave,freq*1.004,p.width);if(['piano','epiano','bell','organ','choir'].includes(t.preset)){osc('sine',freq*2,.28);osc('sine',freq*3.002,.12);}if(['pad','strings','texture'].includes(t.preset))osc('sawtooth',freq*1.003,.25);
 env.gain.setValueAtTime(.00001,start);env.gain.linearRampToValueAtTime(vel,start+Math.min(t.attack,dur/2));
 const pluck=part==='pluck'||part==='keys'||['bell','fx'].includes(t.preset);env.gain.exponentialRampToValueAtTime(Math.max(.00002,vel*(pluck?.14:.72)),start+dur);env.gain.exponentialRampToValueAtTime(.00001,end);
 }
 for(const s of sources){s.start(start);s.stop(end);register(s);s.onended=()=>{s.disconnect();this.sources.delete(s);};}sources[0]?.addEventListener('ended',()=>env.disconnect(),{once:true});
 }
 async preview(t,pitch=60){await this.init();const filter=this.ctx.createBiquadFilter();filter.frequency.value=t.filter;filter.connect(this.ctx.destination);this.voice(this.ctx,t,{pitch,velocity:.65},this.ctx.currentTime,.4,filter,s=>this.sources.add(s));setTimeout(()=>filter.disconnect(),6000);}
 currentBeat(){return this.playing&&this.ctx&&this.project?Math.max(0,this.position+(this.ctx.currentTime-this.started)*this.project.bpm/60):this.position;}
 async play(p,position=this.position){const request=this.request=(this.request||0)+1;await this.prepare(p);if(request!==this.request)return;this.stop(false,true);this.project=p;this.position=position;this.started=this.ctx.currentTime+.04;this.cursor=position;this.graphLive=this.graph(this.ctx,p);this.playing=true;this.tick();this.timer=setInterval(()=>this.tick(),25);}
 tick(){if(!this.playing)return;const p=this.project,now=this.currentBeat(),end=extent(p),horizon=Math.min(end,now+.18*p.bpm/60);if(horizon>this.cursor){this.schedule(this.ctx,p,this.cursor,horizon,this.started-this.position*60/p.bpm,this.graphLive,s=>this.sources.add(s));this.cursor=horizon;}
 if(now>=end){if(this.recording){this.stop(false);this.onended();return;}if(this.loop){this.play(p,0).catch(console.error);}else{this.stop();this.onended();}}}
 schedule(ctx,p,from,to,origin,g,register=()=>{}){const sec=60/p.bpm;for(const t of p.tracks){const dest=g.nodes.get(t.id)?.input;if(!dest)continue;for(const c of t.clips){if(c.type==='midi'){for(const n of c.notes){const b=c.start+n.time;const noteEnd=Math.min(b+n.duration,c.start+c.length);if(b<to&&noteEnd>from&&(b>=from||from===this.position||from===0)){const onset=Math.max(b,from);this.voice(ctx,t,n,origin+onset*sec,(noteEnd-onset)*sec,dest,register);}}}
 else if(c.start<to&&c.start+c.length>from&&(c.start>=from||from===this.position||from===0)){const buffer=this.buffers.get(c.asset);if(!buffer)continue;const beat=Math.max(c.start,from),offset=c.offset+(beat-c.start)*sec,duration=Math.min((c.start+c.length-beat)*sec,buffer.duration-offset);if(duration<=0)continue;const s=ctx.createBufferSource();s.buffer=buffer;s.connect(dest);s.start(Math.max(ctx.currentTime,origin+beat*sec),offset,duration);register(s);s.onended=()=>{s.disconnect();this.sources.delete(s);};}}
 }if(this.metronome){for(let b=Math.ceil(from);b<to;b++){const t={preset:'bell',attack:.001,release:.04};this.voice(ctx,t,{pitch:b%4?84:96,velocity:.3},origin+b*sec,.025,g.master,register);}}}
 stop(reset=true,internal=false){if(!internal)this.request=(this.request||0)+1;if(this.timer)clearInterval(this.timer);this.timer=null;if(this.playing)this.position=Math.max(0,this.currentBeat());this.playing=false;for(const s of this.sources)try{s.stop();}catch{}this.sources.clear();if(this.graphLive){for(const n of this.graphLive.nodes.values())for(const a of n.all)a.disconnect();this.graphLive.master.disconnect();this.graphLive.limiter.disconnect();this.graphLive.analyser.disconnect();this.graphLive=null;}if(reset)this.position=0;}
 async render(p,trackId=null,{onProgress=()=>{}}={}){this.renderStatus='Initialisation du moteur';await this.prepare(p,{resume:false});const copy=structuredClone(p);if(trackId)copy.tracks=copy.tracks.filter(t=>t.id===trackId).map(t=>({...t,mute:false,solo:false}));this.renderStatus='Création du graphe audio';const seconds=extent(copy)*60/copy.bpm+4;if(seconds>900)throw Error('Export limité à 15 minutes pour protéger la mémoire.');const ctx=new OfflineAudioContext(2,Math.ceil(seconds*44100),44100),g=this.graph(ctx,copy);this.renderStatus='Programmation des notes';const metro=this.metronome;this.metronome=false;try{this.schedule(ctx,copy,0,extent(copy),0,g);}finally{this.metronome=metro;}onProgress(0);this.renderStatus='Calcul des échantillons';
 const rendering=ctx.startRendering();this.offlineContext=ctx;return rendering;}
 meter(){if(!this.graphLive)return 0;const d=new Float32Array(256);this.graphLive.analyser.getFloatTimeDomainData(d);return Math.max(...d.map(Math.abs));}
}
