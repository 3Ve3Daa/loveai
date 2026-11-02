// LoveAI — страница скачивания: определяет устройство, подставляет версию и размеры, анимирует демо.
(() => {
  const $ = s => document.querySelector(s);
  const ua = navigator.userAgent;
  const os = /android/i.test(ua) ? 'android'
    : /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios'
    : /windows/i.test(ua) ? 'windows' : 'web';

  // Main button and highlighted card follow the visitor's device.
  const ICON = Object.fromEntries([...document.querySelectorAll('.card')].map(c => [c.dataset.os, c.querySelector('.card-ico').innerHTML]));
  const CTA = {
    android: ['Скачать для Android', 'https://github.com/3Ve3Daa/loveai/releases/latest/download/LoveAI.apk', 'APK · ставится поверх старой версии'],
    windows: ['Скачать для Windows', 'https://github.com/3Ve3Daa/loveai/releases/latest/download/LoveAI-Setup.exe', 'Windows 10 и 11 · обновляется сама'],
    ios: ['Открыть на iPhone', 'app/', 'Потом «Поделиться» → «На экран «Домой»»'],
    web: ['Скачать LoveAI', '#download', 'Android · Windows · iPhone · браузер'],
  }[os];
  $('#primaryLabel').textContent = CTA[0];
  $('#primaryCta').href = CTA[1];
  if (CTA[1].startsWith('download/')) $('#primaryCta').setAttribute('download', '');
  $('#primaryNote').textContent = CTA[2];
  if (os !== 'web') $('#primaryIcon').innerHTML = ICON[os] || '';
  const mine = document.querySelector(`.card[data-os="${os}"]`);
  if (mine && os !== 'web') {
    mine.classList.add('mine');
    mine.parentElement.prepend(mine);
  }
  // On iPhone the home-screen app can be added only from Safari.
  if (os === 'ios' && /CriOS|FxiOS|EdgiOS|YaBrowser/i.test(ua)) {
    const note = document.createElement('p');
    note.className = 'meta';
    note.textContent = 'Открой эту страницу в Safari — только там есть «На экран «Домой»».';
    mine.querySelector('.btn').before(note);
  }

  // Version, release notes and file sizes come from the update files themselves.
  const mb = n => `${(n / 1048576).toFixed(n > 1e8 ? 0 : 1).replace('.', ',')} МБ`;
  fetch('version.json', { cache: 'no-store' }).then(r => r.json()).then(v => {
    const ver = `v${v.version}`;
    document.querySelectorAll('[data-v]').forEach(el => { el.textContent = ver; });
    $('#heroVersion').textContent = `Версия ${v.version}`;
    $('#footVersion').textContent = `Версия ${v.version}${v.date ? ` · ${new Date(v.date).toLocaleDateString('ru-RU')}` : ''}`;
    if (v.notes) {
      const p = $('#whatsNew');
      p.innerHTML = '<b>Что нового:</b> ';
      p.append(v.notes);
      p.hidden = false;
    }
    for (const [key, size] of [['apk', v.apkSize], ['exe', v.exeSize]]) {
      if (size) document.querySelectorAll(`[data-size="${key}"]`).forEach(el => { el.textContent = mb(size); });
    }
  }).catch(() => {});
  $('#year').textContent = new Date().getFullYear();

  // Reveal sections as they scroll into view. Plain scroll checks next to IntersectionObserver, because some
  // in-app browsers (Telegram, Instagram) don't report intersections reliably — nothing may stay hidden.
  const hidden = [...document.querySelectorAll('.reveal')];
  hidden.forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; });
  const show = el => { el.classList.add('in'); io?.unobserve(el); };
  const io = 'IntersectionObserver' in window && new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) show(e.target);
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  hidden.forEach(el => io ? io.observe(el) : show(el));
  let queued = false;
  const check = () => {
    queued = false;
    for (const el of hidden) if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight * .95) show(el);
  };
  const onScroll = () => { if (!queued) { queued = true; setTimeout(check, 60); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  check();

  // Demo in the app window: a request is typed, the AI thinks, files appear, the site shows up.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const user = $('#mUser'), typed = $('#mTyped'), ai = $('#mAi'), pv = $('#mPreview');
  const text = 'Сделай сайт кофейни с меню и кнопкой заказа';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function play() {
    for (;;) {
      user.classList.remove('sent'); ai.className = 'bubble ai'; pv.classList.remove('ready'); typed.textContent = '';
      if (reduced) { typed.textContent = text; user.classList.add('sent'); ai.classList.add('show', 'done'); pv.classList.add('ready'); return; }
      await wait(700);
      for (const ch of text) { typed.textContent += ch; await wait(38 + Math.random() * 40); }
      await wait(350);
      user.classList.add('sent');
      await wait(300);
      ai.classList.add('show');
      await wait(1900);
      ai.classList.add('done');
      await wait(500);
      pv.classList.add('ready');
      await wait(5200);
    }
  }
  play();
})();
