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
  let provider = data.provider || host;
  let thumbnail = data.thumbnail || '';

  if (host.includes('youtube.com') || host === 'youtu.be') {
    provider = data.provider || 'YouTube';
    const id = host === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
    thumbnail = thumbnail || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
  } else if (host.includes('vimeo.com')) {
    provider = data.provider || 'Vimeo';
    const id = parsed.pathname.split('/').filter(Boolean).pop();
    thumbnail = thumbnail || (id ? `https://vumbnail.com/${id}.jpg` : '');
  } else if (host.includes('instagram.com')) {
    provider = data.provider || 'Instagram';
  } else if (host.includes('theringer.com')) {
    provider = data.provider || 'The Ringer';
  }

  return {
    ...data,
    url,
    provider,
    thumbnail,
    title: data.title || tidyTitle(provider, url),
    type: data.type || providerType(provider),
    note: data.note || '',
  };
}

function normalizeUrl(url) {
  return url.trim().replace('youtub e.com', 'youtube.com');
}

function providerType(provider) {
  if (provider === 'Instagram') return 'Reel';
  if (provider === 'The Ringer') return 'Article';
  if (provider === 'Vimeo' || provider === 'YouTube') return 'Video';
  return 'Reference';
}

function tidyTitle(provider, url) {
  const parsed = new URL(url);
  if (provider === 'YouTube') return `Untitled YouTube reference`;
  if (provider === 'Vimeo') return `Untitled Vimeo reference`;
  return parsed.pathname.split('/').filter(Boolean).slice(-1)[0]?.replaceAll('-', ' ') || provider;
}

function render(list) {
  grid.innerHTML = '';
  list.forEach((ref, index) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.ref-card');
    const link = node.querySelector('.ref-link');
    const image = node.querySelector('.thumb');
    card.style.setProperty('--i', index);
    card.style.setProperty('--tilt', `${((index % 7) - 3) * 0.32}deg`);
    link.href = ref.url;
    link.setAttribute('aria-label', `Open ${ref.title}`);
    image.src = ref.thumbnail || fallbackSvg(ref.provider);
    image.alt = ref.title;
    node.querySelector('.index').textContent = String(index + 1).padStart(2, '0');
    node.querySelector('.provider').textContent = ref.provider;
    node.querySelector('.card-title').textContent = ref.title;
    node.querySelector('.type').textContent = ref.type;
    node.querySelector('.note').textContent = ref.note;
    grid.append(node);
  });
  empty.hidden = list.length > 0;
}

function fallbackSvg(label) {
  const safe = encodeURIComponent(label);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23ebe7dc'/%3E%3Cpath d='M0 450 800 0' stroke='%232448ff' stroke-width='10'/%3E%3Ccircle cx='400' cy='225' r='80' fill='%23fff' fill-opacity='.72'/%3E%3Ctext x='400' y='236' font-family='Arial' font-size='42' text-anchor='middle' fill='%23141414'%3E${safe}%3C/text%3E%3C/svg%3E`;
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
