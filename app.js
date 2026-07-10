const DATA_URL = 'data/references.json';
const grid = document.querySelector('#grid');
const template = document.querySelector('#card-template');
const search = document.querySelector('#search');
const empty = document.querySelector('#empty');
let references = [];
const isBoardPage = Boolean(grid && template && search && empty);

export function parseReference(raw) {
  const url = normalizeUrl(typeof raw === 'string' ? raw : raw.url);
  const data = typeof raw === 'string' ? {} : raw;
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, '');
  let provider = host;
  let embed = '';

  if (host.includes('youtube.com') || host === 'youtu.be') {
    provider = 'YouTube';
    const id = host === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
    embed = id ? `https://www.youtube-nocookie.com/embed/${id}` : '';
  } else if (host.includes('vimeo.com')) {
    provider = 'Vimeo';
    const id = parsed.pathname.split('/').filter(Boolean).pop();
    embed = id ? `https://player.vimeo.com/video/${id}` : '';
  } else if (host.includes('instagram.com')) {
    provider = 'Instagram';
  } else if (host.includes('theringer.com')) {
    provider = 'The Ringer';
  }

  return {
    ...data,
    url,
    embed,
    provider,
    title: data.title || tidyTitle(provider, url),
    note: data.note || '',
  };
}

function normalizeUrl(url) {
  return url.trim().replace('youtub e.com', 'youtube.com');
}

function tidyTitle(provider, url) {
  const parsed = new URL(url);
  if (provider === 'YouTube') return `YouTube · ${parsed.searchParams.get('v') || parsed.pathname.slice(1)}`;
  if (provider === 'Vimeo') return `Vimeo · ${parsed.pathname.split('/').filter(Boolean).pop()}`;
  return parsed.pathname.split('/').filter(Boolean).slice(-1)[0]?.replaceAll('-', ' ') || provider;
}

function render(list) {
  grid.innerHTML = '';
  list.forEach((ref, index) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.card');
    const link = node.querySelector('.media');
    const iframe = node.querySelector('iframe');
    const fallback = node.querySelector('.fallback');
    card.style.setProperty('--tilt', `${((index % 5) - 2) * 0.45}deg`);
    link.href = ref.url;
    node.querySelector('.index').textContent = String(index + 1).padStart(2, '0');
    node.querySelector('.provider').textContent = ref.provider;
    const title = node.querySelector('.card-title');
    title.href = ref.url;
    title.textContent = ref.title;
    node.querySelector('.type').textContent = ref.type || '';
    node.querySelector('.note').textContent = ref.note;
    if (ref.embed) {
      iframe.src = ref.embed;
      iframe.title = ref.title;
      fallback.remove();
    } else {
      iframe.remove();
    }
    grid.append(node);
  });
  empty.hidden = list.length > 0;
}

function filter() {
  const term = search.value.trim().toLowerCase();
  const list = references.filter((ref) => [ref.provider, ref.title, ref.type, ref.note].join(' ').toLowerCase().includes(term));
  render(list);
}

if (isBoardPage) {
  fetch(DATA_URL)
    .then((response) => response.json())
    .then((items) => {
      references = items.map(parseReference);
      render(references);
    })
    .catch((error) => {
      grid.innerHTML = `<p class="empty">Could not load references: ${error.message}</p>`;
    });

  search.addEventListener('input', filter);
}
