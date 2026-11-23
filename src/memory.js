let key='lyes-memoire-anonyme-v1';
export function setMemoryScope(id){key=id?'lyes-memoire-v1-'+id:'lyes-memoire-anonyme-v1';}
export function getMemory(){try{const p=JSON.parse(localStorage.getItem(key));return p&&Array.isArray(p.entries)?p:{enabled:false,entries:[]};}catch{return {enabled:false,entries:[]};}}
export function setMemory(enabled){const p=getMemory();p.enabled=enabled;localStorage.setItem(key,JSON.stringify(p));return p;}
export function remember(question,answer){const p=getMemory();if(!p.enabled)return;p.entries.push({id:crypto.randomUUID(),question:question.slice(0,2000),answer:answer.slice(0,4000),date:Date.now()});p.entries=p.entries.slice(-40);localStorage.setItem(key,JSON.stringify(p));}
export function forgetMemory(id=null){const p=getMemory();p.entries=id?p.entries.filter(e=>e.id!==id):[];localStorage.setItem(key,JSON.stringify(p));}
export function relevantMemories(message){const words=message.toLowerCase().match(/[a-zà-ÿ]{4,}/g)||[];return getMemory().enabled?getMemory().entries.map(e=>({...e,score:words.filter(w=>e.question.toLowerCase().includes(w)).length})).filter(e=>e.score>=2).sort((a,b)=>b.score-a.score).slice(0,3):[];}
