import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, runtimeConfig } from '../server.mjs';
import { newProject } from '../src/model.js';

const start = server => new Promise(resolve => server.listen(0, '127.0.0.1', () =>
  resolve('http://127.0.0.1:' + server.address().port)));
const close = server => new Promise(resolve => {
  server.close(resolve);
  server.closeAllConnections();
});
const json = { 'Content-Type': 'application/json' };

test('configuration Render, fichiers publics, origine et IP du proxy', async t => {
  assert.equal(runtimeConfig({}).host, '127.0.0.1');
  assert.equal(runtimeConfig({}).maxAccounts, 50);
  assert.equal(runtimeConfig({ PORT: '10000', LYES_MAX_ACCOUNTS: '7' }).host, '0.0.0.0');
  assert.equal(runtimeConfig({ LYES_MAX_ACCOUNTS: '7' }).maxAccounts, 7);
  const directory = await mkdtemp(path.join(tmpdir(), 'lyes-hosting-'));
  const server = createServer({ dataDirectory: directory });
  const base = await start(server);
  t.after(async () => { await close(server); await rm(directory, { recursive: true, force: true }); });
  for (const file of ['/', '/admin', '/src/auth.js', '/style-v2.css', '/assets/LYES-guide-debutant.pdf', '/examples/Nocturne.lyes']) {
    assert.equal((await fetch(base + file)).status, 200, file);
  }
  for (const file of ['/server.mjs', '/accounts.mjs', '/storage-server.mjs', '/supabase.sql', '/package.json',
    '/.env', '/tests/browser.html', '/README.md', '/src/%2e%2e%2faccounts.mjs']) {
    assert.equal((await fetch(base + file)).status, 404, file);
  }
  const reference = origin => fetch(base + '/api/reference', {
    method: 'POST', headers: { ...json, Origin: origin }, body: '{}'
  });
  assert.equal((await reference('https://intrus.example')).status, 403);
  assert.equal((await reference(base.replace('http:', 'https:'))).status, 400);
  assert.equal((await reference('http://localhost:5173')).status, 400);

  function auth(route, ip, body) {
    return fetch(base + '/api/auth/' + route, {
      method: 'POST', headers: { ...json, 'X-Forwarded-For': ip, 'X-Forwarded-Proto': 'https' },
      body: JSON.stringify(body)
    });
  }
  for (let i = 0; i < 15; i++) {
    assert.equal((await auth('login', '203.0.113.1, 192.0.2.1', {})).status, 400);
  }
  assert.equal((await auth('login', '203.0.113.1, 192.0.2.2', {})).status, 429);
  const registered = await auth('register', '203.0.113.2, 192.0.2.2', { username: 'TestProxy', password: 'MotDePasse-test' });
  assert.equal(registered.status, 201);
  assert.match(registered.headers.get('set-cookie'), /; Secure$/);
});

test('mode Supabase : reconnexion et projet après remplacement du serveur Node', async t => {
  const fetchHTTP = globalThis.fetch;
  const users = [];
  const projects = new Map();
  const key = 'sb_secret_test_fake';
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.hostname !== 'lyes-test.supabase.co') return fetchHTTP(input, options);
    assert.equal(options.headers.apikey, key);
    assert.equal(options.headers.Authorization, undefined);
    const body = options.body && JSON.parse(options.body);
    const query = url.searchParams;
    if (url.pathname.endsWith('/rpc/lyes_register')) {
      assert.equal(body.account_limit, runtimeConfig().maxAccounts);
      const user = { ...body.candidate, legacy_owner: users.length === 0, role: users.length ? 'user' : 'admin' };
      users.push(user);
      return Response.json([user]);
    }
    if (url.pathname.endsWith('/users')) return Response.json(query.has('id') ? [] : users);
    assert.equal(url.pathname, '/rest/v1/projects');
    if (options.method === 'POST') {
      assert.equal(query.get('on_conflict'), 'user_id,id');
      projects.set(body.user_id + ':' + body.id, body.data);
      return new Response(null, { status: 201 });
    }
    const id = query.get('id')?.slice(3);
    const owner = query.get('user_id')?.slice(3);
    const project = projects.get(owner + ':' + id);
    return Response.json(project ? [{ data: project }] : []);
  });
  const previous = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY };
  process.env.SUPABASE_URL = 'https://lyes-test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = key;
  let server = createServer();
  t.after(async () => {
    if (server.listening) await close(server);
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  const credentials = { username: 'TestSupabase', password: 'MotDePasse-test' };
  const connect = (base, route) => fetchHTTP(base + '/api/auth/' + route, {
    method: 'POST', headers: json, body: JSON.stringify(credentials)
  });
  async function session(response, status) {
    assert.equal(response.status, status);
    const { user } = await response.json();
    return { Cookie: response.headers.get('set-cookie').split(';')[0], 'X-Lyes-Account': user.id };
  }
  const base = await start(server);
  const first = await session(await connect(base, 'register'), 201);
  const project = newProject('Conservé après redéploiement');
  const route = '/api/projects/' + project.id;
  assert.equal((await fetchHTTP(base + route, {
    method: 'PUT', headers: { ...json, ...first }, body: JSON.stringify(project)
  })).status, 200);
  await close(server);
  server = createServer();
  const restarted = await start(server);
  assert.equal((await fetchHTTP(restarted + route, { headers: first })).status, 401);
  const second = await session(await connect(restarted, 'login'), 200);
  const restored = await fetchHTTP(restarted + route, { headers: second });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).project.name, project.name);
});
