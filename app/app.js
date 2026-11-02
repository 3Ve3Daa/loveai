// LoveAI — клиент
const $ = s => document.querySelector(s);
const state = { project: null, busy: false, controller: null, tab: 'site', fileContents: {}, attachments: [], device: 'desktop', noAnim: false, codeRaw: '' };

const api = {
  async get(url) { const r = await fetch(url); return r.json(); },
  async post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    return r.json();
  },
};

// ---------- icons ----------
const ICONS = {
  plus: '<path d="M10 4.5v11M4.5 10h11"/>',
  search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2 17 17"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3.2l1.6 1.8h6.2A1.5 1.5 0 0 1 17 8.3v6.2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>',
  'folder-open': '<path d="M3 14.5V6.5A1.5 1.5 0 0 1 4.5 5h3.2l1.6 1.8h5.2A1.5 1.5 0 0 1 16 8.3V9"/><path d="M3 14.5 5 9.8A1.3 1.3 0 0 1 6.2 9h10.1a.9.9 0 0 1 .8 1.3l-2 4.8a1.3 1.3 0 0 1-1.2.9H4.5A1.5 1.5 0 0 1 3 14.5z"/>',
  settings: '<path d="M4 6h7M15 6h1M4 14h2M10 14h6"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="14" r="2"/>',
  menu: '<path d="M3.5 6h13M3.5 10h13M3.5 14h13"/>',
  trash: '<path d="M4.5 6h11M8 6V4.6c0-.3.3-.6.6-.6h2.8c.3 0 .6.3.6.6V6M6 6l.7 9.4a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 6"/>',
  panel: '<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M12 4v12"/>',
  refresh: '<path d="M16 10a6 6 0 1 1-1.8-4.3"/><path d="M16 4v3.5h-3.5"/>',
  external: '<path d="M11 4h5v5M16 4l-7 7M14 12v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3"/>',
  close: '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>',
  monitor: '<rect x="2.5" y="3.5" width="15" height="10" rx="1.6"/><path d="M7 17h6M10 13.5V17"/>',
  tablet: '<rect x="4.5" y="2.5" width="11" height="15" rx="2"/><path d="M9 15h2"/>',
  phone: '<rect x="6" y="2.5" width="8" height="15" rx="2"/><path d="M9.2 15h1.6"/>',
  lock: '<rect x="5" y="9" width="10" height="7.5" rx="1.6"/><path d="M7 9V7a3 3 0 0 1 6 0v2"/>',
  copy: '<rect x="7" y="7" width="9" height="9" rx="1.6"/><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7"/>',
  check: '<path d="M4.5 10.5 8 14l7.5-8"/>',
  'chevron-down': '<path d="M6 8l4 4 4-4"/>',
  'chevron-right': '<path d="M8 5l5 5-5 5"/>',
  'chevron-left': '<path d="M12 5l-5 5 5 5"/>',
  'arrow-down': '<path d="M10 4v12M5 11l5 5 5-5"/>',
  globe: '<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c1.9 2 2.8 4.4 2.8 7s-.9 5-2.8 7c-1.9-2-2.8-4.4-2.8-7S8.1 5 10 3z"/>',
  gamepad: '<rect x="2.5" y="6" width="15" height="9" rx="4.5"/><path d="M6.5 9v3M5 10.5h3M12.8 9.8h.01M14.6 11.6h.01" stroke-width="2"/>',
  briefcase: '<rect x="3" y="6.5" width="14" height="9.5" rx="1.8"/><path d="M7.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M3 10.5h14"/>',
  calc: '<rect x="4.5" y="2.5" width="11" height="15" rx="2"/><rect x="7" y="5" width="6" height="3" rx=".6"/><path d="M7.5 11h.01M10 11h.01M12.5 11h.01M7.5 14h.01M10 14h.01M12.5 14h.01" stroke-width="2"/>',
  eye: '<path d="M2.5 10S5.3 5 10 5s7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.3"/>',
  'eye-off': '<path d="M2.5 10S5.3 5 10 5s7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.3"/><path d="M4 4l12 12"/>',
  info: '<circle cx="10" cy="10" r="7"/><path d="M10 9.2v4.3M10 6.6h.01"/>',
  alert: '<circle cx="10" cy="10" r="7"/><path d="M10 6.5v4M10 13.4h.01"/>',
  'check-circle': '<circle cx="10" cy="10" r="7"/><path d="M7 10.2l2 2 4-4.4"/>',
  mic: '<rect x="7.5" y="2.5" width="5" height="9.5" rx="2.5"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5"/>',
  sparkle: '<path d="M10 2c.6 4.6 2.4 7.4 8 8-5.6.6-7.4 3.4-8 8-.6-4.6-2.4-7.4-8-8 5.6-.6 7.4-3.4 8-8z" fill="currentColor" stroke="none"/>',
};
function icon(name) {
  return `<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach(i => { i.outerHTML = icon(i.dataset.icon); });
}
// Keeps an infinite CSS animation running smoothly although its element is re-created on every streamed chunk.
const phase = ms => `animation-delay:-${Date.now() % ms}ms`;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- rendering ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function codeBlock(lang, code) {
  return `<div class="codeblock"><div class="cb-head"><span class="cb-lang">${esc(lang || 'код')}</span>` +
    `<button type="button" class="cb-copy" title="Копировать код">${icon('copy')}<span>Копировать</span></button></div>` +
    `<pre><code>${esc(code)}</code></pre></div>`;
}
function markdown(src) {
  const blocks = [];
  let s = String(src).replace(/```([\w+#.-]*)\n?([\s\S]*?)(```|$)/g, (_, lang, code) => {
    blocks.push(codeBlock(lang, code.replace(/\n$/, '')));
    return `\u0000${blocks.length - 1}\u0000`;
  });
  s = esc(s)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^(#{1,6})\s+(.+)$/gm, (_, h, t) => h.length <= 2 ? `<h3>${t}</h3>` : `<h4>${t}</h4>`)
    .replace(/(?:^[-*]\s+.+(?:\n|$))+/gm, m => '<ul>' + m.trim().split('\n').map(l => `<li>${l.replace(/^[-*]\s+/, '')}</li>`).join('') + '</ul>')
    .replace(/(?:^\d+[.)]\s+.+(?:\n|$))+/gm, m => {
      const start = parseInt(m, 10);
      return `<ol${start > 1 ? ` start="${start}"` : ''}>` + m.trim().split('\n').map(l => `<li>${l.replace(/^\d+[.)]\s+/, '')}</li>`).join('') + '</ol>';
    })
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g, '$1<i>$2</i>')
    .replace(/\n*(<\/?(?:ul|ol|h3|h4)(?: [^>]*)?>|\u0000\d+\u0000)\n*/g, '$1')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
}

const ACTION_LABEL = { created: 'создан', updated: 'обновлён', deleted: 'удалён', rejected: 'отклонён', writing: 'пишу…', ready: 'готов' };
const FILE_TYPES = {
  html: ['HTML', 't-html'], htm: ['HTML', 't-html'], css: ['CSS', 't-css'], scss: ['SCSS', 't-css'],
  js: ['JS', 't-js'], mjs: ['JS', 't-js'], jsx: ['JSX', 't-js'], ts: ['TS', 't-ts'], tsx: ['TSX', 't-ts'], py: ['PY', 't-ts'],
  json: ['JSON', 't-json'], md: ['MD', 't-md'], txt: ['TXT', 't-md'], xml: ['XML', 't-md'],
  svg: ['SVG', 't-img'], png: ['PNG', 't-img'], jpg: ['JPG', 't-img'], jpeg: ['JPG', 't-img'], webp: ['WEBP', 't-img'], gif: ['GIF', 't-img'], ico: ['ICO', 't-img'],
};
function fileBadge(path) {
  const name = String(path).split('/').pop();
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const [label, cls] = FILE_TYPES[ext] || [(ext.slice(0, 4) || 'FILE').toUpperCase(), 't-other'];
  return `<span class="fbadge ${cls}" aria-hidden="true">${esc(label)}</span>`;
}
function splitPath(path) {
  const parts = String(path).split('/');
  const name = parts.pop();
  return { dir: parts.join('/'), name };
}

// Splits model text into plain text and file blocks (including an unfinished trailing block while streaming).
function renderAssistant(text, opts = {}) {
  // While streaming, a tag can be cut mid-way (`<file path="css/sty`): hide it until it is complete.
  text = text.replace(/<(?:f(?:i(?:l(?:e[^>]*)?)?)?|d(?:e(?:l(?:e(?:t(?:e[^>]*)?)?)?)?)?)?$/, '');
  const re = /<file\s+path="([^"]+)"\s*>([\s\S]*?)(<\/file>|$)|<delete\s+path="([^"]+)"\s*\/?>/g;
  let html = '', last = 0, m;
  const actions = Object.fromEntries((opts.files || []).map(f => [f.path, f.action]));
  const md = seg => { const t = seg.trim(); return t ? `<div class="md">${markdown(t)}</div>` : ''; };
  while ((m = re.exec(text))) {
    html += md(text.slice(last, m.index));
    if (m[4]) {
      html += chip(m[4], 'deleted');
    } else {
      const done = m[3] === '</file>';
      const action = done ? (actions[m[1]] || 'ready') : 'writing';
      state.fileContents[m[1]] = m[2].replace(/^\r?\n/, '');
      html += chip(m[1], action, done ? '' : ` · ${m[2].length} симв.`);
    }
    last = re.lastIndex;
    if (m[0] === '') re.lastIndex++;
  }
  html += md(text.slice(last));
  return html;
}
function chip(path, action, extra = '') {
  const { dir, name } = splitPath(path);
  const cls = ['file-chip', `st-${ACTION_LABEL[action] ? action : 'other'}`];
  if (action === 'writing') cls.push('writing');
  if (action === 'deleted') cls.push('deleted');
  const status = action === 'writing' ? `<span class="spin" style="${phase(800)}"></span>` : '<span class="st-dot"></span>';
  return `<button type="button" class="${cls.join(' ')}" data-path="${esc(path)}" title="${esc(path)}">${fileBadge(path)}` +
    `<span class="fc-body"><span class="fc-name">${dir ? `<span class="fc-dir">${esc(dir)}/</span>` : ''}${esc(name)}</span>` +
    `<span class="fc-tag">${status}${esc(ACTION_LABEL[action] || action)}${esc(extra)}</span></span>` +
    `${action === 'deleted' ? '' : icon('chevron-right')}</button>`;
}
function thinking(label) {
  return `<span class="thinking"><span class="think-spark" style="${phase(2400)}">${icon('sparkle')}</span>` +
    `<span class="shimmer" style="${phase(2000)}">${esc(label)}</span></span>`;
}
function metaHtml(model) {
  return model ? `<div class="meta">${icon('sparkle')}<span>${esc(model)}</span></div>` : '';
}

// images: list of URLs to show above a user message; voice: the message was dictated.
function addMessage(role, html, meta, images, voice) {
  const welcome = $('.welcome');
  if (welcome) welcome.remove();
  const el = document.createElement('div');
  el.className = `msg ${role}${state.noAnim ? ' no-anim' : ''}`;
  el.innerHTML = `<div class="avatar">${role === 'user' ? 'Ты' : 'AI'}</div><div class="bubble">` +
    `${voice ? `<div class="voice-tag">${icon('mic')}Голосовое</div>` : ''}<div class="content"></div><div class="extra"></div>${meta ? metaHtml(meta) : ''}</div>`;
  const content = el.querySelector('.content');
  if (role === 'user') content.textContent = html; else content.innerHTML = html;
  if (images?.length) {
    el.classList.add('has-images');
    el.insertAdjacentHTML('afterbegin', `<div class="thumbs">${images.map(src => `<img src="${esc(src)}" alt="фото">`).join('')}</div>`);
  }
  $('#messages').appendChild(el);
  scrollDown(true);
  return el;
}
function scrollDown(force) {
  const box = $('#messages');
  if (force || box.scrollHeight - box.scrollTop - box.clientHeight < 160) box.scrollTop = box.scrollHeight;
  onMessagesScroll();
}
function onMessagesScroll() {
  const box = $('#messages');
  $('#chatHead').classList.toggle('scrolled', box.scrollTop > 4);
  $('#jumpBtn').classList.toggle('show', box.scrollHeight - box.scrollTop - box.clientHeight > 400);
}

function showWelcome() {
  const examples = [
    ['Лендинг', 'globe', 'Сделай лендинг для кофейни с меню, отзывами и формой бронирования'],
    ['Игра', 'gamepad', 'Сделай игру «Змейка» в браузере с рекордами'],
    ['Портфолио', 'briefcase', 'Создай сайт-портфолио веб-разработчика в тёмном стиле'],
    ['Инструмент', 'calc', 'Сделай калькулятор ИМТ с красивым дизайном'],
  ];
  const h = new Date().getHours();
  const greeting = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  $('#messages').innerHTML = `<div class="welcome">
    <h1><img class="spark" src="logo.png" alt="">${greeting}</h1>
    <div class="sub">Дай задачу — ИИ создаст файлы прямо в папке проекта, а сайт появится в превью.</div>
    <div class="examples">${examples.map(([kind, ic, text]) =>
      `<button type="button" class="example" data-text="${esc(text)}"><span class="ex-ico">${icon(ic)}</span><span><span class="ex-kind">${esc(kind)}</span>${esc(text)}</span></button>`).join('')}</div>
  </div>`;
  document.querySelectorAll('.example').forEach(el => el.onclick = () => { $('#input').value = el.dataset.text; send(); });
  onMessagesScroll();
}

// ---------- toasts & dialogs ----------
const TOAST_ICON = { info: 'info', error: 'alert', success: 'check-circle' };
function toast(text, type = 'info', ms) {
  const box = $('#toasts');
  while (box.children.length >= 4) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(TOAST_ICON[type] || 'info')}<span>${esc(text)}</span>`;
  const close = () => {
    if (el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  };
  el.onclick = close;
  box.appendChild(el);
  setTimeout(close, ms || (type === 'error' ? 6000 : 3500));
}

// Resolves to true when the user pressed the confirm button.
function confirmDialog({ title, text = '', ok = 'OK', danger = false }) {
  const dlg = $('#confirmDlg');
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  const btn = $('#confirmOk');
  btn.textContent = ok;
  btn.classList.toggle('danger', danger);
  btn.classList.toggle('primary', !danger);
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise(resolve => dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true }));
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    if (!ok) return toast('Не удалось скопировать', 'error');
  }
  if (!btn) return;
  const label = btn.querySelector('span');
  if (label && !btn.dataset.label) btn.dataset.label = label.textContent;
  if (label) label.textContent = 'Скопировано';
  btn.classList.add('copied');
  clearTimeout(btn._t);
  btn._t = setTimeout(() => {
    btn.classList.remove('copied');
    if (label) label.textContent = btn.dataset.label;
  }, 1600);
}

// ---------- projects ----------
function relTime(t) {
  const s = (Date.now() - t) / 1000;
  if (!(s >= 0)) return '';
  if (s < 60) return 'сейчас';
  if (s < 3600) return Math.floor(s / 60) + ' мин';
  if (s < 86400) return Math.floor(s / 3600) + ' ч';
  if (s < 604800) return Math.floor(s / 86400) + ' дн';
  return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
}

async function loadProjects(select) {
  let list = await api.get('/api/projects');
  if (!list.length) { await api.post('/api/projects', { name: 'Мой-первый-проект' }); list = await api.get('/api/projects'); }
  const ul = $('#projectList');
  ul.innerHTML = '';
  for (const p of list) {
    const li = document.createElement('li');
    li.dataset.name = p.name;
    li.title = p.name;
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.innerHTML = `${icon('folder')}<span class="p-name">${esc(p.name)}</span>${p.mtime ? `<span class="p-time">${esc(relTime(p.mtime))}</span>` : ''}`;
    if (p.name === state.project) li.classList.add('active');
    li.onclick = () => {
      if (state.busy && p.name !== state.project) return toast('Дождись, пока ИИ закончит ответ, или нажми «Стоп».');
      openProject(p.name);
      closeSidebar();
    };
    li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); } };
    ul.appendChild(li);
  }
  $('#projectCount').textContent = list.length;
  $('.search').classList.toggle('hidden', list.length < 5);
  filterProjects();
  const saved = localStorageGet('project');
  const target = select || state.project || (list.find(p => p.name === saved) || list[0]).name;
  if (target !== state.project) openProject(target);
}
function filterProjects() {
  const ul = $('#projectList');
  const q = $('#projectSearch').value.trim().toLowerCase();
  let shown = 0;
  ul.querySelectorAll('li[data-name]').forEach(li => {
    const ok = !q || li.dataset.name.toLowerCase().includes(q);
    li.classList.toggle('hidden', !ok);
    shown += ok;
  });
  const empty = ul.querySelector('.empty');
  if (!shown && !empty) ul.insertAdjacentHTML('beforeend', '<li class="empty">Ничего не найдено</li>');
  else if (shown && empty) empty.remove();
}

async function openProject(name) {
  if (state.busy) return;
  state.project = name;
  state.fileContents = {};
  localStorageSet('project', name);
  $('#chatTitle').textContent = name;
  document.title = `${name} — LoveAI`;
  document.querySelectorAll('#projectList li[data-name]').forEach(li => li.classList.toggle('active', li.dataset.name === name));
  const chat = await api.get(`/api/projects/${encodeURIComponent(name)}/chat`);
  $('#messages').innerHTML = '';
  if (!chat.length) showWelcome();
  state.noAnim = true;
  try {
    for (const m of chat) {
      if (m.role === 'user') addMessage('user', m.content, null, (m.images || []).map(previewUrl), m.voice);
      else if (m.error) addMessage('assistant', `<span class="error-text">${esc(m.content)}</span>`);
      else addMessage('assistant', renderAssistant(m.content, { files: m.files }), m.model);
    }
  } finally { state.noAnim = false; }
  // Photos load after the history is drawn and push the last message down — keep the view at the bottom.
  $('#messages').querySelectorAll('.thumbs img').forEach(img => {
    if (!img.complete) img.addEventListener('load', () => scrollDown(true), { once: true });
  });
  refreshPreview();
  // The page may have been reloaded while the AI was still working on this project.
  const status = await api.get(`/api/projects/${encodeURIComponent(name)}/status`).catch(() => ({}));
  if (status.busy && !state.busy) {
    setBusy(true);
    addMessage('assistant', thinking('ИИ ещё работает над прошлым запросом'));
    await waitForJob();
    setBusy(false);
    if (state.project === name) openProject(name);
  }
}

async function refreshPreview() {
  if (!state.project) return;
  const files = await api.get(`/api/projects/${encodeURIComponent(state.project)}/files`);
  const hasIndex = files.some(f => f.path.toLowerCase() === 'index.html');
  const url = `/preview/${encodeURIComponent(state.project)}/`;
  const onSite = state.tab === 'site';
  $('#emptyPreview').classList.toggle('hidden', hasIndex || !onSite);
  $('#stage').classList.toggle('hidden', !hasIndex || !onSite);
  $('#addrUrl').innerHTML = `${esc(location.host)}/preview/<b>${esc(state.project)}</b>/`;
  const addr = $('#addrBar');
  if (hasIndex) {
    addr.classList.remove('loaded');
    addr.classList.add('loading');
    $('#frame').src = url + '?t=' + Date.now();
  } else {
    addr.classList.remove('loading', 'loaded');
    $('#frame').removeAttribute('src');
  }
  $('#fileCount').textContent = files.length || '';
  const total = files.reduce((s, f) => s + (f.size || 0), 0);
  $('#fileSummary').textContent = files.length ? `${files.length} ${plural(files.length, 'файл', 'файла', 'файлов')} · ${formatSize(total)}` : '';
  $('#fileList').innerHTML = files.length
    ? files.map(f => {
      const { dir, name } = splitPath(f.path);
      return `<li data-path="${esc(f.path)}" tabindex="0" role="button">${fileBadge(f.path)}<span class="f-name">${dir ? `<span class="f-dir">${esc(dir)}/</span>` : ''}${esc(name)}</span><span class="size">${formatSize(f.size)}</span>${icon('chevron-right')}</li>`;
    }).join('')
    : '<li class="muted">Файлов пока нет — они появятся, когда ИИ их создаст.</li>';
  $('#fileList').querySelectorAll('li[data-path]').forEach(li => {
    li.onclick = () => showFile(li.dataset.path);
    li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showFile(li.dataset.path); } };
  });
  layoutStage();
}
function formatSize(n) {
  n = n || 0;
  return n < 1024 ? n + ' Б' : n < 1048576 ? (n / 1024).toFixed(1) + ' КБ' : (n / 1048576).toFixed(1) + ' МБ';
}

async function showFile(path) {
  let content = state.fileContents[path];
  try {
    const r = await fetch(`/preview/${encodeURIComponent(state.project)}/${path.split('/').map(encodeURIComponent).join('/')}`);
    if (r.ok) content = await r.text();
  } catch {}
  const text = content ?? '(содержимое недоступно)';
  state.codeRaw = text;
  const lines = text.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  $('#codeTitle').textContent = path;
  $('#codeBadge').innerHTML = fileBadge(path);
  $('#codeInfo').textContent = content == null ? '' : `${lines.length} ${plural(lines.length, 'строка', 'строки', 'строк')} · ${formatSize(new Blob([text]).size)}`;
  $('#codeBody').innerHTML = lines.map(l => `<span class="ln">${esc(l)}</span>`).join('');
  $('#codeDlg').showModal();
  $('#codeDlg pre').scrollTop = 0;
}

function previewUrl(rel) {
  return `/preview/${encodeURIComponent(state.project)}/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

// ---------- photos ----------
const MAX_ATTACH = 6;
const MAX_SIDE = 1600;

// Big photos are scaled down before sending so requests stay small and fast.
function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const original = reader.result;
      if (file.type === 'image/gif') return resolve({ name: file.name, data: original });
      const img = new Image();
      img.onerror = () => reject(new Error('Это не картинка'));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 1.5e6) return resolve({ name: file.name, data: original });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
        resolve({ name: file.name, data: canvas.toDataURL(type, 0.88) });
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

async function addFiles(files) {
  for (const file of [...files].filter(f => f.type.startsWith('image/'))) {
    if (state.attachments.length >= MAX_ATTACH) { toast(`Можно прикрепить не больше ${MAX_ATTACH} фото за раз.`, 'error'); break; }
    try { state.attachments.push(await prepareImage(file)); }
    catch (e) { toast(`${file.name}: ${e.message}`, 'error'); }
  }
  renderAttachments();
  $('#input').focus();
}

function renderAttachments() {
  const box = $('#attachments');
  box.classList.toggle('hidden', !state.attachments.length);
  box.innerHTML = state.attachments.map((a, i) =>
    `<div class="attachment"><img src="${a.data}" alt="${esc(a.name)}"><button type="button" data-i="${i}" title="Убрать" aria-label="Убрать фото">${icon('close')}</button></div>`).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    state.attachments.splice(Number(b.dataset.i), 1);
    renderAttachments();
  });
  updateSendState();
}

// ---------- chat ----------
async function send() {
  const text = $('#input').value.trim();
  const images = state.attachments;
  if ((!text && !images.length) || state.busy || !state.project) return;
  $('#input').value = '';
  autosize();
  state.attachments = [];
  renderAttachments();
  addMessage('user', text, null, images.map(i => i.data));
  return deliver(text, images);
}

// Sends an already shown user message to the AI and streams the answer.
async function deliver(text, images, voice = false) {
  setBusy(true);
  const el = addMessage('assistant', thinking('Думаю'));
  const content = el.querySelector('.content');
  const extra = el.querySelector('.extra');
  let full = '', reasoning = '', model = '', files = [], frame = 0;

  const paint = () => {
    frame = 0;
    let html;
    if (full) html = renderAssistant(full, { streaming: true });
    else if (reasoning) {
      const open = content.querySelector('details.reasoning')?.open;
      html = `<details class="reasoning"${open ? ' open' : ''}><summary>${thinking('Размышляет')}</summary><pre>${esc(reasoning.slice(-4000))}</pre></details>`;
    } else html = thinking('Думаю');
    content.innerHTML = html;
    const pre = content.querySelector('details.reasoning pre');
    if (pre) pre.scrollTop = pre.scrollHeight;
    scrollDown();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };

  state.controller = new AbortController();
  state.stopped = false;
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: state.project, message: text, images, voice }),
      signal: state.controller.signal,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Ошибка сервера ${r.status}`);
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        const ev = JSON.parse(line);
        if (ev.type === 'delta') { full += ev.text; schedule(); }
        else if (ev.type === 'reasoning') { reasoning += ev.text; schedule(); }
        else if (ev.type === 'model') { model = ev.id; }
        else if (ev.type === 'reset') { full = ''; reasoning = ''; schedule(); }
        else if (ev.type === 'file') files.push(ev);
        else if (ev.type === 'notice') extra.insertAdjacentHTML('beforeend', `<div class="notice">${esc(ev.text)}</div>`);
        else if (ev.type === 'error') throw new Error(ev.message);
        else if (ev.type === 'done') model = ev.model || model;
      }
    }
    if (frame) cancelAnimationFrame(frame);
    content.innerHTML = renderAssistant(full, { files });
    el.querySelector('.bubble').insertAdjacentHTML('beforeend', metaHtml(model));
    if (files.length) {
      refreshPreview();
      if (files.some(f => /\.html?$/i.test(f.path))) showPreview(true);
    }
  } catch (e) {
    if (frame) cancelAnimationFrame(frame);
    // A TypeError from fetch means the connection broke; the server keeps working, so wait for its answer.
    if (e instanceof TypeError && !state.stopped) {
      content.innerHTML = (full ? renderAssistant(full) : '') +
        '<div class="notice">Связь с сервером прервалась. Жду, пока ИИ закончит<span class="dots"></span></div>';
      const ok = await waitForJob();
      if (ok) { setBusy(false); return openProject(state.project); }
      content.innerHTML = '<div class="error-text">⚠ Сервер не отвечает. Проверь, что окно start.bat открыто (или запусти его заново), и отправь сообщение ещё раз.</div>';
      return;
    }
    const msg = e.name === 'AbortError' ? 'Остановлено.' : e.message;
    content.innerHTML = (full ? renderAssistant(full) : '') + `<div class="error-text">⚠ ${esc(msg)}</div>`;
    if (/ключ/i.test(msg)) openSettings(true);
  } finally {
    setBusy(false);
    scrollDown();
  }
}

const ICON_SEND = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5"/></svg>';
const ICON_STOP = '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg>';
// Polls the server until the project's job is finished. Returns false if the server is gone for ~30 s.
async function waitForJob() {
  const project = state.project;
  let failures = 0;
  while (failures < 10) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const s = await api.get(`/api/projects/${encodeURIComponent(project)}/status`);
      failures = 0;
      if (!s.busy) return true;
    } catch { failures++; }
  }
  return false;
}

function stop() {
  state.stopped = true;
  if (state.project) api.post(`/api/projects/${encodeURIComponent(state.project)}/stop`).catch(() => {});
  state.controller?.abort();
}

function setBusy(b) {
  state.busy = b;
  $('#sendBtn').innerHTML = b ? ICON_STOP : ICON_SEND;
  $('#sendBtn').title = b ? 'Остановить' : 'Отправить';
  $('#sendBtn').setAttribute('aria-label', b ? 'Остановить' : 'Отправить');
  $('#sendBtn').classList.toggle('stop', b);
  updateSendState();
}
function updateSendState() {
  $('#sendBtn').classList.toggle('idle', !state.busy && !state.rec && !$('#input').value.trim() && !state.attachments.length);
}

// ---------- voice messages ----------
// Speech becomes text, which is then sent like a typed message. Three ways, best first:
//  android — the phone's own speech recognition (APK, Capacitor plugin);
//  live    — the browser's speech recognition (Chrome, Edge, Safari);
//  record  — record the audio and recognise it on this device with Whisper (PC app, other browsers),
//            and if that fails, with an AI model that understands audio.
const MAX_REC_SEC = 180;
const WAVE_BARS = 40;
let liveBroken = false;

function voiceEngine() {
  if (window.Capacitor?.isNativePlatform?.()) return 'android';
  if (!liveBroken && (window.SpeechRecognition || window.webkitSpeechRecognition) && !/Electron/.test(navigator.userAgent)) return 'live';
  return 'record';
}
const speechLang = () => navigator.language || 'ru-RU';
const micDenied = 'Нет доступа к микрофону. Разреши его в настройках и попробуй ещё раз.';

async function startRecording() {
  if (state.busy || state.rec || !state.project) return;
  const rec = { kind: voiceEngine(), text: '', started: Date.now() };
  try {
    if (rec.kind === 'android') await startAndroid(rec);
    else if (rec.kind === 'live') startLive(rec);
    else await startRecorder(rec);
  } catch (e) {
    return toast(e.message || 'Не удалось включить микрофон.', 'error', 6000);
  }
  if (rec.ended) return; // the recogniser failed right away
  state.rec = rec;
  $('#recWave').classList.toggle('hidden', rec.kind !== 'record');
  $('#recText').classList.toggle('hidden', rec.kind === 'record');
  $('#recText').textContent = 'Говори…';
  const tick = () => {
    const sec = Math.floor((Date.now() - rec.started) / 1000);
    $('#recTime').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (sec >= MAX_REC_SEC) stopRecording(true);
  };
  tick();
  rec.timer = setInterval(tick, 250);
  $('#composer').classList.add('recording');
  $('#sendBtn').title = 'Отправить голосовое';
  updateSendState();
}

function showLiveText(rec) {
  if (state.rec !== rec) return;
  // The end of the phrase is what's being said right now, so that part stays visible.
  const box = $('#recText');
  box.textContent = rec.text || 'Говори…';
  if (box.scrollWidth > box.clientWidth) box.textContent = '…' + rec.text.slice(-Math.floor(rec.text.length * box.clientWidth / box.scrollWidth) + 2);
}

// The phone's recogniser stops by itself after a pause; then the message is sent.
// The APK has only Capacitor's native bridge (no @capacitor/core with registerPlugin),
// so plugin methods and events go through the bridge directly.
function nativePlugin(name) {
  const cap = window.Capacitor;
  if (cap.registerPlugin) return cap.registerPlugin(name);
  return new Proxy({}, {
    get: (_, method) => method === 'addListener'
      ? async (event, callback) => cap.addListener(name, event, callback)
      : (options = {}) => cap.nativePromise(name, method, options),
  });
}

async function startAndroid(rec) {
  const SR = nativePlugin('SpeechRecognition');
  const perm = await SR.requestPermissions().catch(() => ({}));
  if (perm.speechRecognition && perm.speechRecognition !== 'granted') throw new Error(micDenied);
  if (!(await SR.available().catch(() => ({}))).available) throw new Error('На этом телефоне нет распознавания речи. Установи приложение «Google», чтобы надиктовывать сообщения.');
  // "stopped" comes right before the final text, so wait a moment for it. When nothing is said, Android
  // gives up silently (no event at all) — the watchdog ends the recording then.
  let watchdog;
  function finish() {
    if (rec.ended) return;
    rec.ended = true;
    clearTimeout(watchdog);
    subs.forEach(s => s.remove());
    if (rec.error && !rec.text) toast(`Не удалось распознать речь: ${rec.error}`, 'error');
    if (state.rec === rec) stopRecording(!!rec.text);
    if (rec.send) sendVoice(rec);
  }
  const quiet = () => { clearTimeout(watchdog); watchdog = setTimeout(finish, 9000); };
  const subs = [
    await SR.addListener('partialResults', d => { quiet(); if (d.matches?.[0]) { rec.text = d.matches[0]; showLiveText(rec); } }),
    await SR.addListener('listeningState', d => { if (d.status === 'stopped') setTimeout(finish, 900); }),
  ];
  quiet();
  rec.stop = () => { SR.stop().catch(() => {}); setTimeout(finish, 1200); };
  SR.start({ language: speechLang(), maxResults: 1, partialResults: true, popup: false })
    .then(r => { if (r?.matches?.[0]) rec.text = r.matches[0]; })
    .catch(e => { if (!rec.text) rec.error = e.message; finish(); });
}

function startLive(rec) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR();
  r.lang = speechLang();
  r.continuous = true;
  r.interimResults = true;
  r.onresult = e => { rec.text = [...e.results].map(x => x[0].transcript).join(' ').replace(/\s+/g, ' ').trim(); showLiveText(rec); };
  r.onerror = e => { rec.error = e.error; };
  r.onend = () => {
    // No speech service in this browser (or it's offline): record audio from now on instead.
    if (!rec.text && ['network', 'service-not-allowed', 'language-not-supported'].includes(rec.error)) {
      liveBroken = true;
      if (state.rec === rec) { stopRecording(false); startRecording(); }
      else if (rec.send) toast('Браузер не смог распознать речь. Запиши голосовое ещё раз — теперь распознаю по-другому.');
      return;
    }
    if (rec.error === 'not-allowed' && !rec.text) { if (state.rec === rec) stopRecording(false); return toast(micDenied, 'error', 6000); }
    if (state.rec === rec) stopRecording(true);
    if (rec.send) sendVoice(rec);
  };
  r.start();
  rec.stop = () => { try { r.stop(); } catch {} };
}

async function startRecorder(rec) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Это устройство не умеет записывать голос.');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { throw new Error(e.name === 'NotAllowedError' ? micDenied : 'Не удалось включить микрофон.'); }
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    rec.audioCtx?.close().catch(() => {});
    rec.blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type });
    if (rec.send) sendVoice(rec);
  };
  recorder.start();
  rec.stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };

  // Live level bars, so it's clear the microphone hears you.
  const wave = $('#recWave');
  wave.innerHTML = '<span></span>'.repeat(WAVE_BARS);
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    rec.audioCtx = new Ctx();
    const analyser = rec.audioCtx.createAnalyser();
    analyser.fftSize = 512;
    rec.audioCtx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize), levels = Array(WAVE_BARS).fill(0);
    let last = 0;
    const draw = t => {
      if (state.rec !== rec) return;
      requestAnimationFrame(draw);
      if (t - last < 70) return;
      last = t;
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      levels.shift(); levels.push(Math.min(1, peak / 64));
      wave.querySelectorAll('span').forEach((s, i) => { s.style.height = `${4 + levels[i] * 24}px`; });
    };
    requestAnimationFrame(draw);
  } catch {}
}

function stopRecording(send) {
  const rec = state.rec;
  if (!rec) return;
  state.rec = null;
  rec.send = send;
  rec.seconds = (Date.now() - rec.started) / 1000;
  clearInterval(rec.timer);
  $('#composer').classList.remove('recording');
  $('#sendBtn').title = 'Отправить';
  rec.stop();
  updateSendState();
}

// Any recorded format (webm, mp4, ogg) → 16 kHz mono samples, what Whisper and audio models expect.
async function toPcm16k(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  let audio;
  try {
    const buf = await blob.arrayBuffer();
    audio = await new Promise((resolve, reject) => ctx.decodeAudioData(buf, resolve, reject));
  } finally { ctx.close?.().catch(() => {}); }
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new Offline(1, Math.max(1, Math.ceil(audio.duration * 16000)), 16000);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0);
}
function wavBase64(pcm) {
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  const bytes = new Uint8Array(view.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function transcribeAudio(blob, onStatus, signal) {
  const pcm = await toPcm16k(blob);
  // Whisper "hears" words in silence, so a recording without any voice is not sent at all.
  let peak = 0;
  for (let i = 0; i < pcm.length; i += 16) peak = Math.max(peak, Math.abs(pcm[i]));
  if (peak < 0.02) return '';
  let local = null;
  try {
    const whisper = await import('./whisper.js');
    local = await whisper.transcribe(pcm, pct => onStatus(`Загружаю распознавание речи — один раз, ${pct}%`));
  } catch (e) { console.warn('local speech recognition failed', e); }
  if (local != null) return local;
  if (signal.aborted) throw new DOMException('Остановлено', 'AbortError');
  onStatus('Распознаю голос');
  const r = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: wavBase64(pcm), format: 'wav' }),
    signal,
  });
  const res = await r.json().catch(() => ({ error: `Ошибка сервера ${r.status}` }));
  if (res.error) throw new Error(res.error);
  return String(res.text || '');
}

async function sendVoice(rec) {
  if (state.busy || !state.project) return;
  if (rec.error && !rec.text && rec.kind === 'android') return; // already reported
  if (rec.kind === 'record' && (rec.seconds < 0.7 || !rec.blob?.size)) return toast('Слишком короткое голосовое — скажи чуть подольше.');
  const el = addMessage('user', '', null, null, true);
  const content = el.querySelector('.content');
  let text = rec.text.trim();
  if (rec.kind === 'record') {
    content.innerHTML = thinking('Распознаю голос');
    setBusy(true);
    state.controller = new AbortController();
    state.stopped = false;
    try {
      text = (await transcribeAudio(rec.blob, label => { content.innerHTML = thinking(label); scrollDown(); }, state.controller.signal)).trim();
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'Остановлено.'
        : e instanceof TypeError ? 'Сервер не отвечает. Проверь, что LoveAI запущен, и попробуй ещё раз.'
        : e.name === 'EncodingError' ? 'Не удалось прочитать запись. Попробуй ещё раз.'
        : e.message;
      content.innerHTML = `<span class="error-text">⚠ ${esc(msg)}</span>`;
      if (/ключ/i.test(msg)) openSettings(true);
      setBusy(false);
      return;
    }
    setBusy(false);
  }
  if (!text) {
    content.innerHTML = '<span class="error-text">⚠ Не расслышал, что ты сказал. Попробуй ещё раз, поближе к микрофону.</span>';
    return;
  }
  content.textContent = text;
  return deliver(text, [], true);
}

// ---------- settings ----------
async function loadConfig() {
  const cfg = await api.get('/api/config');
  const label = cfg.model === 'auto' ? 'Авто' : cfg.model.split('/').pop().replace(/:free$/, '');
  $('#modelLabel').textContent = 'Модель: ' + label;
  $('#composerModel').innerHTML = `<span>${esc(label)}</span>${icon('chevron-down')}`;
  // The app ships with a built-in key; an own key is only needed after «Обновить план».
  const own = cfg.hasKey && !cfg.builtinKey;
  $('#planName').textContent = own ? 'Свой план' : 'Бесплатный план';
  $('#planText').textContent = own ? 'Подключён твой API ключ.' : cfg.hasKey ? 'Всё уже настроено — можно сразу пользоваться.' : 'Нажми «Обновить план» и вставь API ключ.';
  $('#keyHint').textContent = own ? `Сейчас сохранён ключ: ${cfg.keyHint}` : '';
  return cfg;
}
function showPlanKey(show) {
  $('#planKey').classList.toggle('hidden', !show);
  $('#upgradeBtn').classList.toggle('hidden', show);
  if (show) $('#apiKey').focus();
}
async function openSettings(upgrade = false) {
  const cfg = await loadConfig();
  $('#apiKey').value = '';
  setKeyVisible(false);
  showPlanKey(upgrade === true || (cfg.hasKey && !cfg.builtinKey));
  const sel = $('#modelSelect');
  $('#settingsDlg').showModal();
  try {
    const models = await api.get('/api/models');
    if (models.error) throw new Error(models.error);
    sel.innerHTML = '<option value="auto">Авто — лучшая доступная бесплатная</option>' + models.map(m => `<option value="${esc(m.id)}">${esc(m.id)}${m.context ? ` · ${Math.round(m.context / 1000)}k` : ''}${m.vision ? ' · видит фото' : ''}</option>`).join('');
    if (cfg.model !== 'auto' && !models.some(m => m.id === cfg.model)) sel.insertAdjacentHTML('afterbegin', `<option value="${esc(cfg.model)}">${esc(cfg.model)}</option>`);
    sel.value = cfg.model;
  } catch (e) {
    sel.innerHTML = `<option value="${esc(cfg.model)}">${esc(cfg.model)}</option>`;
  }
}
function setKeyVisible(show) {
  $('#apiKey').type = show ? 'text' : 'password';
  const b = $('#toggleKey');
  b.innerHTML = icon(show ? 'eye-off' : 'eye');
  b.title = show ? 'Скрыть ключ' : 'Показать ключ';
  b.setAttribute('aria-label', b.title);
}

// ---------- preview panel ----------
function showPreview(show) {
  $('#preview').classList.toggle('hidden-panel', !show);
  $('#previewToggle').setAttribute('aria-pressed', String(show));
  $('#previewToggle').title = show ? 'Скрыть превью' : 'Показать превью';
  localStorageSet('preview', show ? '1' : '0');
  if (show) layoutStage();
}

const DEVICES = { desktop: null, tablet: [768, 1024], phone: [390, 844] };
function setDevice(d) {
  if (!(d in DEVICES)) d = 'desktop';
  state.device = d;
  localStorageSet('device', d);
  document.querySelectorAll('.dev').forEach(b => {
    const on = b.dataset.device === d;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  layoutStage();
}
// Gives the iframe the real device width (so the site's media queries react) and scales it down to fit.
function layoutStage() {
  const stage = $('#stage'), frame = $('#frame');
  const dev = innerWidth > 900 ? DEVICES[state.device] : null;
  stage.classList.toggle('device', !!dev);
  stage.classList.toggle('phone', !!dev && state.device === 'phone');
  if (!dev) { frame.removeAttribute('style'); $('#devSize').textContent = ''; return; }
  const pad = 16, sw = stage.clientWidth, sh = stage.clientHeight;
  if (!sw || !sh) return;
  const [w, h] = dev;
  const scale = Math.min(1, (sw - pad * 2) / w);
  const height = Math.max(200, Math.min(h, (sh - pad * 2) / scale));
  Object.assign(frame.style, {
    width: w + 'px', height: height + 'px',
    left: Math.max(pad, (sw - w * scale) / 2) + 'px',
    top: Math.max(pad, (sh - height * scale) / 2) + 'px',
    transform: scale < 1 ? `scale(${scale})` : '',
  });
  $('#devSize').textContent = `${w} × ${Math.round(height)}${scale < 1 ? ` · ${Math.round(scale * 100)}%` : ''}`;
}

function localStorageGet(k) { try { return localStorage.getItem('3v_' + k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem('3v_' + k, v); } catch {} }

function autosize() {
  const t = $('#input');
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 220) + 'px';
  updateSendState();
}
function closeSidebar() { $('#sidebar').classList.remove('open'); }

// ---------- new project ----------
function openNewProject() {
  $('#projectName').value = '';
  $('#projectError').textContent = '';
  $('#projectDlg').showModal();
  $('#projectName').focus();
}
$('#projectForm').onsubmit = async e => {
  e.preventDefault();
  const name = $('#projectName').value.trim();
  if (!name) { $('#projectError').textContent = 'Введи название проекта.'; $('#projectName').focus(); return; }
  const btn = $('#createProject');
  btn.disabled = true;
  try {
    const r = await api.post('/api/projects', { name });
    if (r.error) { $('#projectError').textContent = r.error; $('#projectName').focus(); return; }
    $('#projectDlg').close();
    closeSidebar();
    if (state.busy) toast('Проект создан. Открой его, когда ИИ закончит текущий ответ.');
    await loadProjects(r.name);
    if (state.project !== r.name) openProject(r.name);
  } catch {
    $('#projectError').textContent = 'Не удалось создать проект: сервер не отвечает.';
  } finally {
    btn.disabled = false;
  }
};
$('#projectName').addEventListener('input', () => { $('#projectError').textContent = ''; });
document.querySelectorAll('#projectDlg [data-close]').forEach(b => b.onclick = () => $('#projectDlg').close());

// ---------- wiring ----------
hydrateIcons();
$('#composer').onsubmit = e => {
  e.preventDefault();
  if (state.rec) stopRecording(true);
  else if (state.busy) stop(); else send();
};
$('#micBtn').onclick = () => {
  if (state.busy) return toast('Подожди, пока ИИ закончит ответ.');
  startRecording();
};
$('#recCancel').onclick = () => stopRecording(false);
$('#input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!state.busy) send(); }
});
$('#input').addEventListener('input', autosize);
$('#newProjectBtn').onclick = openNewProject;
$('#clearBtn').onclick = async () => {
  if (!state.project) return;
  if (state.busy) return toast('Сейчас ИИ отвечает — очистить чат можно после ответа.');
  const ok = await confirmDialog({ title: 'Очистить переписку?', text: 'Сообщения этого проекта будут удалены. Файлы проекта останутся.', ok: 'Очистить', danger: true });
  if (!ok || state.busy) return;
  await fetch(`/api/projects/${encodeURIComponent(state.project)}/chat`, { method: 'DELETE' });
  openProject(state.project);
};
$('#settingsBtn').onclick = openSettings;
$('#composerModel').onclick = openSettings;
$('#toggleKey').onclick = () => setKeyVisible($('#apiKey').type === 'password');
$('#upgradeBtn').onclick = () => showPlanKey(true);
$('#sideUpgradeBtn').onclick = () => { closeSidebar(); openSettings(true); };
$('#attachBtn').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
$('#input').addEventListener('paste', e => {
  const files = [...(e.clipboardData?.files || [])];
  if (files.some(f => f.type.startsWith('image/'))) { e.preventDefault(); addFiles(files); }
});
// Photos can be dropped anywhere in the chat column.
const chatEl = $('.chat');
chatEl.addEventListener('dragover', e => { e.preventDefault(); $('#composer').classList.add('dragover'); });
chatEl.addEventListener('dragleave', e => { if (!chatEl.contains(e.relatedTarget)) $('#composer').classList.remove('dragover'); });
chatEl.addEventListener('drop', e => {
  e.preventDefault();
  $('#composer').classList.remove('dragover');
  addFiles(e.dataTransfer.files);
});
$('#messages').addEventListener('click', e => {
  // Browsers block opening data: URLs, so only saved photos open in a new tab.
  if (e.target.matches('.thumbs img') && !e.target.src.startsWith('data:')) window.open(e.target.src, '_blank');
  const copy = e.target.closest('.cb-copy');
  if (copy) return copyText(copy.closest('.codeblock').querySelector('code').textContent, copy);
  const c = e.target.closest('.file-chip');
  if (c && !c.classList.contains('deleted')) showFile(c.dataset.path);
});
$('#messages').addEventListener('scroll', onMessagesScroll, { passive: true });
$('#jumpBtn').onclick = () => {
  const box = $('#messages');
  box.scrollTo({ top: box.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });
};
$('#saveSettings').onclick = async e => {
  e.preventDefault();
  try {
    await api.post('/api/config', { apiKey: $('#apiKey').value, model: $('#modelSelect').value });
    $('#settingsDlg').close();
    await loadConfig();
    toast('Настройки сохранены', 'success');
  } catch {
    toast('Не удалось сохранить настройки: сервер не отвечает.', 'error');
  }
};
$('#previewToggle').onclick = () => showPreview($('#preview').classList.contains('hidden-panel'));
$('#closePreview').onclick = () => showPreview(false);
$('#closePreviewMobile').onclick = () => showPreview(false);
$('#reloadPreview').onclick = refreshPreview;
$('#frame').addEventListener('load', () => {
  const addr = $('#addrBar');
  if (!addr.classList.contains('loading')) return;
  addr.classList.remove('loading');
  addr.classList.add('loaded');
  setTimeout(() => addr.classList.remove('loaded'), 500);
});
$('#openTab').onclick = () => state.project && window.open(`/preview/${encodeURIComponent(state.project)}/`, '_blank');
$('#openFolder').onclick = () => {
  if (!state.project) return;
  api.post(`/api/projects/${encodeURIComponent(state.project)}/open`)
    .then(r => r?.error ? toast(r.error, 'error') : toast('Открываю папку проекта…'))
    .catch(() => toast('Не удалось открыть папку: сервер не отвечает.', 'error'));
};
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#scrim').onclick = closeSidebar;
$('#projectSearch').addEventListener('input', filterProjects);
$('#projectSearch').addEventListener('keydown', e => {
  if (e.key === 'Escape' && e.target.value) { e.stopPropagation(); e.target.value = ''; filterProjects(); }
});
document.addEventListener('keydown', e => {
  if (state.rec && (e.key === 'Escape' || e.key === 'Enter') && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    return stopRecording(e.key === 'Enter');
  }
  if (e.key === 'Escape' && $('#sidebar').classList.contains('open') && !document.querySelector('dialog[open]')) closeSidebar();
});
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  state.tab = t.dataset.tab;
  document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', String(x === t)); });
  $('#filePane').classList.toggle('hidden', state.tab !== 'files');
  $('#preview').classList.toggle('on-files', state.tab === 'files');
  refreshPreview();
});
document.querySelectorAll('.dev').forEach(b => b.onclick = () => setDevice(b.dataset.device));
if (window.ResizeObserver) new ResizeObserver(() => layoutStage()).observe($('#stage'));
else addEventListener('resize', layoutStage);
$('#closeCode').onclick = () => $('#codeDlg').close();
$('#copyCode').onclick = () => copyText(state.codeRaw, $('#copyCode'));

(async () => {
  if (window.LOVEAI_INFO?.version) $('#appVersion').textContent = `LoveAI ${window.LOVEAI_INFO.version}`;
  setBusy(false);
  setDevice(localStorageGet('device') || 'desktop');
  showPreview(localStorageGet('preview') !== '0' && innerWidth > 900);
  try {
    const cfg = await loadConfig();
    await loadProjects();
    if (!cfg.hasKey) openSettings(true);
  } catch {
    toast('Сервер не отвечает. Проверь, что окно start.bat открыто, и обнови страницу.', 'error', 10000);
  }
})();
