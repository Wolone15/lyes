import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from '../server.mjs';
import {newProject} from '../src/model.js';
test('administration : droits serveur, profils, confidentialité et compatibilité du premier compte',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'lyes-admin-tests-')),server=createServer({dataDirectory:directory});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=async(url,{method='GET',body,user,cookie,account}={})=>{const r=await fetch(base+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(user?{Cookie:user.cookie,'X-Lyes-Account':user.data.user.id}:{}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-Lyes-Account':account}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  assert.equal((await fetch(base+'/admin')).status,200);
  assert.equal((await request('/api/admin/users')).status,401);
  const admin=await request('/api/auth/register',{method:'POST',body:{username:'Proprietaire',password:'test-admin-123'}}),member=await request('/api/auth/register',{method:'POST',body:{username:'Cousin',password:'test-cousin-123',role:'admin',isAdmin:true}});
  assert.equal(admin.data.user.isAdmin,true);assert.equal(member.data.user.isAdmin,false);
  assert.equal((await request('/api/admin/users',{user:member})).status,403);
  assert.equal((await request('/api/admin/users',{user:member,account:admin.data.user.id})).status,409);
  const project=newProject('La production de Cousin');await request('/api/projects/'+project.id,{method:'PUT',body:project,user:member});
  const list=await request('/api/admin/users',{user:admin});assert.equal(list.status,200);assert.equal(list.data.accounts.length,2);assert.equal(list.data.accounts.find(u=>u.username==='Cousin').projectCount,1);
  const profile=await request('/api/admin/users/'+member.data.user.id,{user:admin});assert.equal(profile.status,200);assert.equal(profile.data.profile.projects[0].name,project.name);assert.equal(profile.data.profile.role,'Membre');assert.ok(!('tracks' in profile.data.profile.projects[0]));
  for(const data of [list.data,profile.data])assert.doesNotMatch(JSON.stringify(data),/"(?:hash|salt|password|normalized)"/);
  assert.equal((await request('/api/projects/'+project.id,{user:admin})).status,404);
  assert.equal((await request('/api/admin/users/'+member.data.user.id,{user:member})).status,403);
  assert.equal((await request('/api/admin/users/00000000-0000-0000-0000-000000000000',{user:admin})).status,404);
  for(const method of ['POST','PUT','DELETE'])assert.equal((await request('/api/admin/users/'+member.data.user.id,{method,user:admin})).status,405);
  const file=path.join(directory,'users.json'),users=JSON.parse(await readFile(file,'utf8'));users[0].role='user';await writeFile(file,JSON.stringify(users));
  assert.equal((await request('/api/admin/users',{user:admin})).status,403);
  assert.equal((await request('/api/auth/me',{user:admin})).data.user.isAdmin,false);
  delete users[0].role;await writeFile(file,JSON.stringify(users));assert.equal((await request('/api/admin/users',{user:admin})).status,200);
  await request('/api/auth/logout',{method:'POST',user:admin});assert.equal((await request('/api/admin/users',{user:admin})).status,401);
 }finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});
