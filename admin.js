import { parseReference } from './app.js';

const links = document.querySelector('#links');
const json = document.querySelector('#json');
const status = document.querySelector('#status');
const repo = document.querySelector('#repo');
const branch = document.querySelector('#branch');
const token = document.querySelector('#token');
let existingByUrl = new Map();

function inferRepo() {
  const host = location.hostname;
  if (host.endsWith('.github.io')) {
    const owner = host.replace('.github.io', '');
    const project = location.pathname.split('/').filter(Boolean)[0] || `${owner}.github.io`;
    repo.value = `${owner}/${project}`;
  }
}

async function loadExisting() {
  const response = await fetch('data/references.json', { cache: 'no-store' });
  const refs = await response.json();
  existingByUrl = new Map(refs.map((ref) => [ref.url, ref]));
  links.value = refs.map((ref) => ref.url).join('\n');
  writeJson();
}

function uniqueUrls() {
  const seen = new Set();
  return links.value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace('youtub e.com', 'youtube.com'))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

function itemForUrl(url) {
  const parsed = parseReference(url);
  const saved = existingByUrl.get(url) || {};
  return {
    url,
    title: saved.title || parsed.title,
    provider: saved.provider || parsed.provider,
    type: saved.type || providerType(parsed.provider),
    ...(saved.note ? { note: saved.note } : {}),
  };
}

function providerType(provider) {
  if (provider === 'Instagram') return 'Reel';
  if (provider === 'The Ringer') return 'Article';
  if (provider === 'Vimeo' || provider === 'YouTube') return 'Video';
  return 'Reference';
}

function getItems() {
  return uniqueUrls().map(itemForUrl);
}

function writeJson() {
  const items = getItems();
  json.value = `${JSON.stringify(items, null, 2)}\n`;
  status.textContent = `${items.length} references ready. Add titles/types in the JSON before committing if needed.`;
  return items;
}

function download() {
  writeJson();
  const blob = new Blob([json.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'references.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

async function commitToGitHub() {
  writeJson();
  const [owner, name] = repo.value.trim().split('/');
  if (!owner || !name || !token.value.trim()) throw new Error('Repo and token are required.');
  const path = 'data/references.json';
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.value.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const getUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}?ref=${encodeURIComponent(branch.value.trim())}`;
  const current = await fetch(getUrl, { headers }).then((res) => {
    if (!res.ok) throw new Error('Could not read current file from GitHub.');
    return res.json();
  });
  const body = {
    message: 'Update reference deck',
    content: btoa(unescape(encodeURIComponent(json.value))),
    sha: current.sha,
    branch: branch.value.trim(),
  };
  const put = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!put.ok) throw new Error((await put.json()).message || 'GitHub commit failed.');
  status.textContent = 'Committed. GitHub Pages will refresh after the workflow finishes.';
}

document.querySelector('#preview').addEventListener('click', writeJson);
document.querySelector('#download').addEventListener('click', download);
document.querySelector('#commit').addEventListener('click', () => {
  status.textContent = 'Committing…';
  commitToGitHub().catch((error) => { status.textContent = error.message; });
});

inferRepo();
loadExisting().catch(() => writeJson());
