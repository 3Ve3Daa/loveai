// LoveAI — доработки интерфейса для Android-приложения (подключается после app.js).
// В телефоне нет сервера, который раздаёт /preview/..., поэтому превью собирается в один HTML
// (CSS, JS и картинки встраиваются внутрь), а картинки в чате подставляются из памяти приложения.
(() => {
  const { getFile, safePath, isImage } = window.mobileBackend;
  document.documentElement.classList.add('mobile-app');

  const style = document.createElement('style');
  style.textContent = '.mobile-app #openFolder, .mobile-app #openTab { display: none !important; }';
  document.head.appendChild(style);

  const isLocal = u => u && !/^([a-z][\w+.-]*:|\/\/|#)/i.test(u);
  // Resolves `rel` against the directory of `page` inside the project.
  function resolve(page, rel) {
    const clean = rel.split(/[?#]/)[0];
    const parts = clean.startsWith('/') ? [] : page.split('/').slice(0, -1);
    for (const seg of clean.replace(/^\/+/, '').split('/')) {
      if (seg === '..') parts.pop(); else if (seg && seg !== '.') parts.push(seg);
    }
    return safePath(parts.join('/'));
  }
  async function asDataUrl(project, page, rel) {
    const path = isLocal(rel) && resolve(page, rel);
    if (!path || !isImage(path)) return null;
    return (await getFile(project, path))?.dataUrl || null;
  }
  async function replaceAsync(str, re, fn) {
    const jobs = [];
    str.replace(re, (...args) => { jobs.push(fn(...args)); return ''; });
    const results = await Promise.all(jobs);
    let i = 0;
    return str.replace(re, () => results[i++]);
  }
  const inlineCssUrls = (project, page, css) => replaceAsync(css, /url\(\s*(['"]?)([^'")]+)\1\s*\)/g,
    async (all, q, rel) => { const d = await asDataUrl(project, page, rel); return d ? `url("${d}")` : all; });

  // Builds a self-contained copy of a project page for <iframe srcdoc>.
  async function buildPage(project, page) {
    const f = await getFile(project, page);
    if (!f || f.text == null) return null;
    let html = f.text;
    html = await replaceAsync(html, /<link\b[^>]*>/gi, async tag => {
      const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!/\brel\s*=\s*["']?stylesheet/i.test(tag) || !isLocal(href)) return tag;
      const path = resolve(page, href);
      const css = path && (await getFile(project, path))?.text;
      return css == null ? tag : `<style>${await inlineCssUrls(project, path, css)}</style>`;
    });
    html = await replaceAsync(html, /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi, async (tag, a, src, b) => {
      if (!isLocal(src)) return tag;
      const path = resolve(page, src);
      const js = path && (await getFile(project, path))?.text;
      return js == null ? tag : `<script${a}${b}>${js.replace(/<\/script/gi, '<\\/script')}</script>`;
    });
    html = await replaceAsync(html, /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
      async (tag, css) => { const fixed = await inlineCssUrls(project, page, css); return tag.replace(css, () => fixed); });
    html = await replaceAsync(html, /\b(src|href|poster|data-src)\s*=\s*(["'])([^"']+)\2/gi,
      async (all, attr, q, rel) => { const d = await asDataUrl(project, page, rel); return d ? `${attr}=${q}${d}${q}` : all; });
    html = await replaceAsync(html, /style\s*=\s*(["'])([^"']*url\([^"']*)\1/gi,
      async (all, q, css) => `style=${q}${await inlineCssUrls(project, page, css)}${q}`);
    // Links to other project pages are opened through the app, since srcdoc has no folder to resolve them in.
    const nav = `<script>document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const h=a.getAttribute('href');` +
      `if(!h||/^([a-z][\\w+.-]*:|\\/\\/|#)/i.test(h))return;e.preventDefault();parent.postMessage({type:'3v-nav',page:${JSON.stringify(page)},href:h},'*');});<\/script>`;
    return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => nav + '</body>') : html + nav;
  }

  // ---------- preview iframe ----------
  const frame = document.getElementById('frame');
  let current = { project: null, page: 'index.html' };
  async function show(project, page) {
    current = { project, page };
    const html = await buildPage(project, page);
    if (current.project !== project || current.page !== page) return;
    frame.srcdoc = html ?? `<p style="font:16px sans-serif;padding:24px">Файл ${page} не найден</p>`;
  }
  Object.defineProperty(frame, 'src', {
    configurable: true,
    get() { return frame.getAttribute('data-src') || ''; },
    set(v) {
      frame.setAttribute('data-src', v);
      const m = new URL(v, location.href).pathname.match(/^\/preview\/([^/]+)\/(.*)$/);
      if (!m) { HTMLIFrameElement.prototype.setAttribute.call(frame, 'src', v); return; }
      const project = decodeURIComponent(m[1]);
      const page = safePath(decodeURIComponent(m[2])) || 'index.html';
      show(project, project === current.project && page === 'index.html' ? current.page : page);
    },
  });
  const removeAttr = frame.removeAttribute.bind(frame);
  frame.removeAttribute = name => {
    if (name === 'src') { removeAttr('srcdoc'); removeAttr('data-src'); current = { project: null, page: 'index.html' }; }
    removeAttr(name);
  };
  addEventListener('message', e => {
    if (e.source !== frame.contentWindow || e.data?.type !== '3v-nav' || !current.project) return;
    const page = resolve(e.data.page, e.data.href);
    if (page && /\.html?$/i.test(page)) show(current.project, page);
  });

  // ---------- images in the chat ----------
  async function fixImage(img) {
    const raw = img.getAttribute('src') || '';
    const m = raw.match(/^(?:https?:\/\/[^/]+)?\/preview\/([^/]+)\/(.+)$/);
    if (!m) return;
    img.removeAttribute('src');
    const f = await getFile(decodeURIComponent(m[1]), decodeURIComponent(m[2]));
    if (f?.dataUrl) img.src = f.dataUrl;
  }
  document.querySelectorAll('img[src*="/preview/"]').forEach(fixImage);
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'attributes') { if (r.target.tagName === 'IMG') fixImage(r.target); continue; }
      r.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') fixImage(n);
        n.querySelectorAll?.('img[src*="/preview/"]').forEach(fixImage);
      });
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

  // ---------- full-screen photo viewer instead of new tabs ----------
  const viewer = document.createElement('div');
  viewer.className = 'm-viewer';
  viewer.innerHTML = '<img alt="фото">';
  viewer.onclick = () => viewer.classList.remove('open');
  document.body.appendChild(viewer);
  style.textContent += '.m-viewer{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.9);display:none;place-items:center;padding:16px}' +
    '.m-viewer.open{display:grid}.m-viewer img{max-width:100%;max-height:100%;border-radius:12px}';
  window.open = url => {
    const u = String(url || '');
    if (u.startsWith('data:image/')) { viewer.querySelector('img').src = u; viewer.classList.add('open'); }
    return null;
  };
  document.getElementById('messages').addEventListener('click', e => {
    if (e.target.matches('.thumbs img') && e.target.src) window.open(e.target.src);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') viewer.classList.remove('open'); });

  // ---------- updates ----------
  // Android compares itself with <site>/version.json and offers the new APK. The PC app updates itself
  // (electron-updater in desktop/main.js), the iPhone web app through its service worker.
  const info = window.LOVEAI_INFO || {};
  const site = (info.site || '').replace(/\/+$/, '');
  const isAndroid = !!window.Capacitor?.isNativePlatform?.();
  const isDesktop = /Electron/.test(navigator.userAgent);
  const newer = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  };
  let offered = null;
  async function checkAndroidUpdate() {
    if (!site || !info.version) return;
    if (document.querySelector('dialog[open]')) return setTimeout(checkAndroidUpdate, 10000); // don't cover another window
    try {
      const v = await (await fetch(`${site}/version.json?t=${Date.now()}`, { cache: 'no-store' })).json();
      if (!newer(v.version, info.version) || offered === v.version) return;
      offered = v.version;
      const ok = await confirmDialog({
        title: `Вышла новая версия LoveAI ${v.version}`,
        text: `${v.notes ? v.notes + '. ' : ''}Скачай её и установи поверх этой — проекты и чаты сохранятся.`,
        ok: 'Обновить',
      });
      // Opens in the phone's browser, which downloads the APK; tapping it installs the update.
      const apk = v.apk || 'download/LoveAI.apk';
      if (ok) location.href = /^https?:/.test(apk) ? apk : `${site}/${apk}`;
    } catch {}
  }
  if (isAndroid) {
    setTimeout(checkAndroidUpdate, 2500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkAndroidUpdate(); });
  }

  // The web version links to the apps for Android and Windows.
  if (site && !isAndroid && !isDesktop) {
    document.getElementById('appVersion')?.insertAdjacentHTML('afterend',
      `<div class="muted small-text app-version">Приложения: <a href="${info.downloads || `${site}/download`}/LoveAI.apk">Android</a> · <a href="${info.downloads || `${site}/download`}/LoveAI-Setup.exe">Windows</a></div>`);
  }
  try {
    if (sessionStorage.getItem('3v_updated')) {
      sessionStorage.removeItem('3v_updated');
      setTimeout(() => toast(`LoveAI обновлён${info.version ? ` до версии ${info.version}` : ''}`, 'success'), 800);
    }
  } catch {}
})();
