import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const projectFilename = /^[a-f0-9-]{36}\.json$/i;
const duplicate = () => Object.assign(Error('Ce pseudo est déjà utilisé. Choisis-en un autre.'), { status: 409 });
const full = () => Object.assign(Error('Le nombre maximal de comptes est atteint. Connecte-toi avec ton compte existant.'), { status: 403 });

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJSON(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

function fileStorage(directory) {
  const usersFile = path.join(directory, 'users.json');
  const readUsers = () => readJSON(usersFile, []);
  const projectFolder = userId => path.join(directory, 'projects', userId);
  const projectFile = (userId, id) => path.join(projectFolder(userId), id + '.json');
  let registration = Promise.resolve();

  return {
    readUsers,
    createUser(user, limit) {
      const result = registration.then(async () => {
        const users = await readUsers();
        if (users.some(existing => existing.normalized === user.normalized)) throw duplicate();
        if (users.length >= limit) throw full();
        const first = users.length === 0;
        const created = { ...user, legacyOwner: first, role: first ? 'admin' : 'user' };
        await writeJSON(usersFile, [...users, created]);
        return created;
      });
      registration = result.catch(() => {});
      return result;
    },
    async listProjects(userId) {
      const folder = projectFolder(userId);
      let files;
      try {
        files = await readdir(folder);
      } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
      }
      const projects = await Promise.all(files.filter(file => projectFilename.test(file))
        .map(file => readJSON(path.join(folder, file), null)));
      return projects.filter(Boolean);
    },
    readProject: (userId, id) => readJSON(projectFile(userId, id), null),
    writeProject: (userId, project) => writeJSON(projectFile(userId, project.id), project),
    async deleteProject(userId, id) {
      try {
        await unlink(projectFile(userId, id));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  };
}

function supabaseStorage(url, key) {
  const endpoint = new URL('/rest/v1/', url);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
    throw Error('SUPABASE_URL doit être une URL HTTPS sans identifiants.');
  }
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + key;
  const fromRow = ({ legacy_owner, ...user }) => ({ ...user, legacyOwner: legacy_owner });

  async function request(resource, { query = {}, method = 'GET', body, prefer } = {}) {
    const target = new URL(resource, endpoint);
    target.search = new URLSearchParams(query);
    const response = await fetch(target, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (resource === 'rpc/lyes_register' && error.code === '23505') throw duplicate();
      if (resource === 'rpc/lyes_register' && error.code === 'PT403') throw full();
      throw Error('Supabase a refusé une opération de stockage (HTTP ' + response.status + ').');
    }
    return prefer?.includes('return=minimal') ? null : response.json();
  }

  async function list(resource, filters) {
    const rows = [];
    let after;
    for (;;) {
      const page = await request(resource, { query: {
        ...filters, order: 'id.asc', limit: '100', ...(after ? { id: 'gt.' + after } : {})
      } });
      if (page.length === 0) return rows;
      rows.push(...page);
      after = page.at(-1).id;
    }
  }

  const owner = userId => ({ user_id: 'eq.' + userId });
  const projectKey = (userId, id) => ({ ...owner(userId), id: 'eq.' + id });
  return {
    async readUsers() {
      return (await list('users', {})).map(fromRow);
    },
    async createUser(user, limit) {
      const [row] = await request('rpc/lyes_register', {
        method: 'POST', body: { candidate: user, account_limit: limit }
      });
      return fromRow(row);
    },
    async listProjects(userId) {
      const rows = await list('projects', { ...owner(userId), select: 'id,metadata' });
      return rows.map(row => row.metadata);
    },
    async readProject(userId, id) {
      const [row] = await request('projects', { query: { ...projectKey(userId, id), select: 'data' } });
      return row?.data ?? null;
    },
    async writeProject(userId, project) {
      await request('projects', {
        method: 'POST',
        query: { on_conflict: 'user_id,id' },
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: { user_id: userId, id: project.id, updated: project.updated, data: project }
      });
    },
    async deleteProject(userId, id) {
      await request('projects', { method: 'DELETE', query: projectKey(userId, id), prefer: 'return=minimal' });
    }
  };
}

export function createStorage({ directory, url, key }) {
  if (!url && !key) return fileStorage(directory);
  if (!url || !key) throw Error('Renseigne SUPABASE_URL et SUPABASE_SERVICE_KEY ensemble.');
  return supabaseStorage(url, key);
}
