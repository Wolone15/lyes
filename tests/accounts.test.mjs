import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from '../server.mjs';
import {newProject} from '../src/model.js';
const prefix=path.join(tmpdir(),'lyes-account-tests-');
const start=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
const close=server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
test('comptes persistants, sessions et projets isolés entre deux utilisateurs',async()=>{
 const directory=await mkdtemp(prefix),server=createServer({dataDirectory:directory,maxAccounts:2}),base=await start(server);let second;
 const request=async(url,{method='GET',body,cookie,account,origin}={})=>{const r=await fetch(base+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-Lyes-Account':account}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],setCookie:r.headers.get('set-cookie')};};
 try{
 assert.equal((await request('/api/projects')).status,401);
 const a=await request('/api/auth/register',{method:'POST',body:{username:'Alpha_test',password:'mot-de-passe-A-123'}});assert.equal(a.status,201);assert.ok(a.data.user.canImportLegacy);assert.match(a.setCookie,/HttpOnly/);assert.match(a.setCookie,/SameSite=Strict/);
 const b=await request('/api/auth/register',{method:'POST',body:{username:'Cousin_test',password:'mot-de-passe-B-456'}});assert.equal(b.status,201);assert.equal(b.data.user.canImportLegacy,false);
 assert.equal((await request('/api/auth/register',{method:'POST',body:{username:'Troisieme',password:'un-autre-password'}})).status,403);
 const saved=newProject('Projet privé Alpha');assert.equal((await request('/api/projects/'+saved.id,{method:'PUT',cookie:a.cookie,account:a.data.user.id,body:saved})).status,200);
 assert.equal((await request('/api/projects',{cookie:a.cookie,account:a.data.user.id})).data.projects.length,1);
 assert.equal((await request('/api/projects',{cookie:b.cookie,account:b.data.user.id})).data.projects.length,0);
 assert.equal((await request('/api/projects/'+saved.id,{cookie:b.cookie,account:b.data.user.id})).status,404);
 assert.equal((await request('/api/projects/'+saved.id,{method:'DELETE',cookie:b.cookie,account:b.data.user.id})).status,200);
 assert.equal((await request('/api/projects/'+saved.id,{cookie:a.cookie,account:a.data.user.id})).data.project.name,saved.name);
 assert.equal((await request('/api/projects/'+saved.id,{method:'PUT',cookie:b.cookie,account:a.data.user.id,body:saved})).status,409);
 assert.equal((await request('/api/projects/'+saved.id,{method:'PUT',cookie:a.cookie,account:a.data.user.id,origin:'https://exemple-intrus.test',body:saved})).status,403);
 const mine=newProject('Projet privé Cousin');await request('/api/projects/'+mine.id,{method:'PUT',cookie:b.cookie,account:b.data.user.id,body:mine});assert.equal((await request('/api/projects',{cookie:a.cookie,account:a.data.user.id})).data.projects.length,1);
 assert.equal((await request('/api/auth/login',{method:'POST',body:{username:'Alpha_test',password:'mauvais-password'}})).status,401);
 const database=await readFile(path.join(directory,'users.json'),'utf8');assert.ok(!database.includes('mot-de-passe-A-123'));assert.ok(!database.includes('mot-de-passe-B-456'));const users=JSON.parse(database);assert.equal(users[0].hash.length,128);assert.notEqual(users[0].salt,users[1].salt);
 await request('/api/auth/logout',{method:'POST',cookie:a.cookie});assert.equal((await request('/api/projects',{cookie:a.cookie,account:a.data.user.id})).status,401);
 await close(server);second=createServer({dataDirectory:directory});const next=await start(second);const response=await fetch(next+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'ALPHA_TEST',password:'mot-de-passe-A-123'})});assert.equal(response.status,200);const login=await response.json(),cookie=response.headers.get('set-cookie').split(';')[0];const restored=await fetch(next+'/api/projects/'+saved.id,{headers:{Cookie:cookie,'X-Lyes-Account':login.user.id}});assert.equal(restored.status,200);assert.equal((await restored.json()).project.name,saved.name);
 }finally{if(server.listening)await close(server);if(second?.listening)await close(second);}
});
