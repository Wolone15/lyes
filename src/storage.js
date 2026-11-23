import {validateProject} from './model.js';
import {api,currentAccount} from './auth.js';
let db;
async function open(){if(db)return db;db=await new Promise((resolve,reject)=>{const r=indexedDB.open('lyes-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return db;}
async function transaction(mode,fn){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('projects',mode);const r=fn(t.objectStore('projects'));let result;r.onsuccess=()=>result=r.result;t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Sauvegarde interrompue'));});}
export async function save(p){validateProject(p);const copy=structuredClone(p);return (await api('/api/projects/'+encodeURIComponent(copy.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(copy)})).updated;}
export const list=async()=>(await api('/api/projects')).projects;
export const load=async id=>(await api('/api/projects/'+encodeURIComponent(id))).project;
export const remove=id=>api('/api/projects/'+encodeURIComponent(id),{method:'DELETE'});
export async function importLegacy(){if(!currentAccount()?.canImportLegacy)throw Error('Les anciens projets de cet appareil sont réservés au premier compte créé.');const projects=await transaction('readonly',s=>s.getAll());for(const p of projects)await save(p);return projects.length;}
export async function blobData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
