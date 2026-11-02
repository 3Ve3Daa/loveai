// LoveAI — встроенный «сервер» для Android-приложения.
// Делает то же, что server.js на компьютере, но прямо в телефоне: подменяет fetch для /api/* и /preview/*,
// ходит в OpenRouter напрямую и хранит проекты, чаты и настройки в IndexedDB.
(() => {
  // A test address can be set in localStorage (3v_openrouter_base) to try the app against a fake OpenRouter.
  let testBase = null;
  try { testBase = localStorage.getItem('3v_openrouter_base'); } catch {}
  const OPENROUTER = testBase || 'https://openrouter.ai/api/v1';
  const AUTO = 'auto';
  const MAX_IMAGES = 6;
  const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
  const MIME = {
    html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
    json: 'application/json', svg: 'image/svg+xml', txt: 'text/plain', md: 'text/plain',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon',
  };
  const ext = p => (p.match(/\.([^./]+)$/)?.[1] || '').toLowerCase();
  const isImage = p => /^(png|jpe?g|gif|webp|ico)$/.test(ext(p));

  // ---------- storage (IndexedDB key-value) ----------
  let dbPromise;
  function db() {
    dbPromise ||= new Promise((resolve, reject) => {
      const req = indexedDB.open('3ve3da', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction('kv', mode);
      const result = fn(t.objectStore('kv'));
      t.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Не хватает памяти на телефоне'));
    });
  }
  const kvGet = key => tx('readonly', s => s.get(key));
  const kvSet = (key, value) => tx('readwrite', s => { s.put(value, key); });
  const kvDel = key => tx('readwrite', s => { s.delete(key); });
  const kvPrefix = prefix => tx('readonly', s => s.getAll(IDBKeyRange.bound(prefix, prefix + '￿')));

  // ---------- config ----------
  async function loadConfig() {
    const cfg = (await kvGet('config')) || {};
    if (!cfg.model || cfg.model === 'openrouter/free') cfg.model = AUTO;
    return cfg;
  }

  // The app ships with a built-in key (written into default-key.js at build time);
  // a key saved in settings after «Обновить план» replaces it.
  const effectiveKey = cfg => cfg.apiKey || window.LOVEAI_DEFAULT_KEY || '';

  // ---------- projects ----------
  function safeProjectName(name) {
    const clean = String(name || '').trim().replace(/[^\p{L}\p{N}_\- ]/gu, '').replace(/\s+/g, '-').slice(0, 60);
    return clean || null;
  }
  function safePath(rel) {
    const cleaned = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
    if (!cleaned || cleaned.split('/').some(p => p === '..' || p === '.')) return null;
    return cleaned;
  }
  async function listProjects() {
    return ((await kvGet('projects')) || []).sort((a, b) => b.mtime - a.mtime);
  }
  async function touchProject(name) {
    const list = (await kvGet('projects')) || [];
    const p = list.find(x => x.name === name);
    if (p) p.mtime = Date.now(); else list.push({ name, mtime: Date.now() });
    await kvSet('projects', list);
  }
  const fileKey = (project, rel) => `file/${project}/${rel}`;
  async function listFiles(project) {
    return (await kvPrefix(`file/${project}/`)).map(f => ({ path: f.path, size: f.size })).sort((a, b) => a.path.localeCompare(b.path));
  }
  const getFile = (project, rel) => kvGet(fileKey(project, rel));
  async function writeFile(project, rel, { text, dataUrl }) {
    const size = text != null ? new Blob([text]).size : Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
    await kvSet(fileKey(project, rel), { path: rel, text, dataUrl, size, mtime: Date.now() });
  }
  const loadChat = async project => (await kvGet(`chat/${project}`)) || [];
  async function saveChat(project, messages) {
    await kvSet(`chat/${project}`, messages);
    await touchProject(project);
  }

  // ---------- prompt ----------
  const SYSTEM_PROMPT = `Ты — LoveAI, опытный ИИ-разработчик. Пользователь даёт тебе задачи, а ты их выполняешь: создаёшь сайты, игры, скрипты, документы и любые другие файлы.

У тебя есть прямой доступ к папке текущего проекта. Чтобы создать или изменить файл, выведи его ПОЛНОСТЬЮ в таком формате:

<file path="index.html">
...полное содержимое файла...
</file>

Чтобы удалить файл: <delete path="old.js"/>

Правила:
- Пути только относительные (например "index.html", "css/style.css"), без "..".
- Всегда пиши файл целиком, от первой до последней строки. Никаких "...остальное без изменений".
- Не оборачивай содержимое внутри <file> в markdown-блоки \`\`\`.
- Для сайтов главная страница — index.html. Делай красивый современный дизайн, адаптивный под телефон.
- Подключай внешние ресурсы только по полным https-ссылкам (CDN), либо пиши всё сам.
- Если задача простая и не требует файлов (вопрос, объяснение) — просто ответь текстом.
- После файлов кратко (2–4 предложения) напиши, что сделал и как этим пользоваться.
- Выполняй задачу сразу, в этом же ответе: не задавай уточняющих вопросов и не пиши план вместо кода — если чего-то не хватает, выбери разумный вариант сам.
- Ты помнишь всю переписку ниже и видишь текущие файлы проекта. Если спрашивают, что ты делал раньше, отвечай по ним.
- Отвечай на языке пользователя.`;

  const FILE_REMINDER = 'Напоминание: файлы меняются ТОЛЬКО если ты выведешь их полный код внутри <file path="...">...</file>. ' +
    'Если просто написать «сделал», «изменил» или «файл записан» без тега <file> — ничего не сохранится.';
  const FILE_CORRECTION = 'Ты написал, что изменил файлы, но не вывел их код — поэтому НИЧЕГО не сохранилось. ' +
    'Выведи сейчас полный код каждого изменённого файла в формате <file path="index.html">...весь код...</file>, от первой до последней строки.';

  let skillsText = null;
  async function loadSkills() {
    if (skillsText != null) return skillsText;
    try {
      const names = await (await nativeFetch('skills/index.json')).json();
      const texts = await Promise.all(names.map(n => nativeFetch('skills/' + n).then(r => r.text())));
      skillsText = texts.map(t => t.trim()).join('\n\n');
    } catch { skillsText = ''; }
    return skillsText;
  }

  async function buildProjectContext(project) {
    const files = await kvPrefix(`file/${project}/`);
    if (!files.length) return `Проект "${project}" сейчас пустой.`;
    let budget = 120000;
    const parts = [`Текущие файлы проекта "${project}":`];
    for (const f of files) {
      if (f.text != null && f.text.length <= budget) {
        budget -= f.text.length;
        parts.push(`<file path="${f.path}">\n${f.text}\n</file>`);
      } else {
        parts.push(`- ${f.path} (${f.size} байт, содержимое не показано)`);
      }
    }
    return parts.join('\n\n');
  }

  function compactForHistory(text) {
    return String(text)
      .replace(/\[файл [^\]]*записан\]/g, '')
      .replace(/<file\s+path="([^"]+)"\s*>[\s\S]*?(<\/file>|$)/g, '(здесь был полный код $1 — актуальная версия в системном сообщении)')
      .trim()
      .slice(0, 6000);
  }
  // A statement of changed files without file tags; questions and offers don't count.
  function claimsChangeWithoutFiles(text) {
    if (/<file\s+path=|<delete\s+path=/.test(text)) return false;
    if (/\[файл[^\]]*\]/i.test(text)) return true;
    return String(text).split(/(?<=[.!?\n])/).some(s => !/\?\s*$/.test(s.trim()) &&
      !/чтобы|могу|можно|хочешь|хотите|если|давай|предлагаю|нужно ли/i.test(s) &&
      /(?<!\p{L})(создал|сделал|изменил|обновил|перезаписал|переписал|добавил|исправил|заменил|переделал|сохранил)(?!\p{L})/iu.test(s));
  }
  function isQuestion(text) {
    const t = String(text).trim().toLowerCase();
    if (/(сделай|создай|измени|добавь|исправь|переделай|обнови|поменяй|убери|удали|напиши|перепиши|продолжи|замени|верни|почини|поправь|улучши)/.test(t)) return false;
    return /\?$/.test(t) || /^(что|как|почему|зачем|где|когда|сколько|кто|чем|помнишь|ты помнишь|расскажи|объясни|привет|спасибо)/.test(t);
  }
  const CONTINUE_PROMPT = 'Твой ответ оборвался на середине. Продолжи РОВНО с того символа, на котором остановился: без повторов, без пояснений и без markdown, просто следующий текст.';
  const openFileTag = text => (text.match(/<file\s+path=/g) || []).length > (text.match(/<\/file>/g) || []).length;
  async function finishTruncated(ask, model, messages, result) {
    for (let i = 0; i < 3 && (result.finish === 'length' || openFileTag(result.text)); i++) {
      let more;
      try {
        more = await ask(model, [...messages, { role: 'assistant', content: result.text }, { role: 'user', content: CONTINUE_PROMPT }]);
      } catch { break; }
      if (!more.text.trim()) break;
      result = { ...more, text: result.text + more.text };
    }
    if (result.finish !== 'length' && openFileTag(result.text)) result = { ...result, text: result.text + '\n</file>' };
    return result;
  }
  function isJunkReply(text) {
    const t = text.trim();
    return t.length < 2 || /^(user|response)\s+safety\s*:/i.test(t) || /^(safe|unsafe)\s*$/i.test(t);
  }
  function imagesNote(images) {
    if (!images?.length) return '';
    return `\n\n(Пользователь приложил фото, они уже сохранены в проекте: ${images.join(', ')}. ` +
      `Если фото нужно на сайте — вставляй их как <img src="${images[0]}">, не выводи их через <file>.)`;
  }

  // ---------- photos ----------
  async function saveImages(project, images) {
    const saved = [];
    const existing = new Set((await listFiles(project)).map(f => f.path));
    for (const img of images) {
      const m = String(img?.data || '').match(/^data:(image\/[\w+.-]+);base64,/);
      if (!m || !IMAGE_TYPES[m[1]]) throw new Error('Можно прикреплять только картинки PNG, JPG, WEBP или GIF.');
      const e = IMAGE_TYPES[m[1]];
      const base = (String(img.name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'photo').slice(0, 40);
      let name = base + e;
      for (let i = 2; existing.has(`images/${name}`); i++) name = `${base}-${i}${e}`;
      existing.add(`images/${name}`);
      await writeFile(project, `images/${name}`, { dataUrl: img.data });
      saved.push(`images/${name}`);
    }
    return saved;
  }

  // ---------- model output ----------
  function stripFence(content) {
    let c = content.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    const m = c.match(/^\s*```[\w+-]*\r?\n([\s\S]*?)\r?\n```\s*$/);
    if (m) c = m[1];
    return c;
  }
  async function applyFileOps(project, text) {
    const results = [];
    const fileRe = /<file\s+path="([^"]+)"\s*>([\s\S]*?)<\/file>/g;
    let m;
    while ((m = fileRe.exec(text))) {
      const rel = safePath(m[1]);
      if (!rel) { results.push({ path: m[1], action: 'rejected' }); continue; }
      const existed = !!(await getFile(project, rel));
      await writeFile(project, rel, { text: stripFence(m[2]) });
      results.push({ path: rel, action: existed ? 'updated' : 'created' });
    }
    const delRe = /<delete\s+path="([^"]+)"\s*\/?>/g;
    while ((m = delRe.exec(text))) {
      const rel = safePath(m[1]);
      if (rel && await getFile(project, rel)) {
        await kvDel(fileKey(project, rel));
        results.push({ path: rel, action: 'deleted' });
      }
    }
    if (results.length) await touchProject(project);
    return results;
  }

  // ---------- OpenRouter models ----------
  let modelsCache = { at: 0, list: [] };
  async function getFreeModels() {
    if (Date.now() - modelsCache.at < 10 * 60 * 1000 && modelsCache.list.length) return modelsCache.list;
    const r = await nativeFetch(`${OPENROUTER}/models`);
    if (!r.ok) throw new Error(`ИИ-сервис вернул ${r.status}`);
    const { data } = await r.json();
    const list = data
      .filter(m => m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0)
      .filter(m => !m.architecture?.output_modalities || m.architecture.output_modalities.includes('text'))
      .filter(m => m.id.endsWith(':free'))
      .filter(m => !/safety|guard|moderat|embed|rerank/i.test(m.id))
      .map(m => ({
        id: m.id, name: m.name, context: m.context_length,
        vision: !!m.architecture?.input_modalities?.includes('image'),
        audio: !!m.architecture?.input_modalities?.includes('audio'),
      }))
      .sort((a, b) => modelRank(a.id) - modelRank(b.id) || a.id.localeCompare(b.id));
    modelsCache = { at: Date.now(), list };
    return list;
  }
  const PREFERRED = [/nemotron-3-ultra/, /inkling:free/, /gemma-4-31b/, /laguna-s-/, /code/, /nemotron-3\.5-super/,
    /deepseek/, /qwen/, /llama-3\.3-70b/, /xing/, /dots/, /gemma-4-26b/, /flint/];
  function modelRank(id) {
    const i = PREFERRED.findIndex(re => re.test(id));
    const penalty = /\d(\.\d)?b[:-]|nano|xs-|small|lightning|tiny/.test(id) && !/\d{2,}b/.test(id) ? 100 : 0;
    return (i === -1 ? PREFERRED.length : i) + penalty;
  }

  // Failed models are skipped for a while; day-long bans are kept in storage.
  const BAN = { rateLimit: 2 * 60 * 1000, failure: 5 * 60 * 1000, unavailable: 24 * 60 * 60 * 1000 };
  let badModels = null;
  async function bans() {
    badModels ||= new Map(Object.entries((await kvGet('blocked-models')) || {}));
    return badModels;
  }
  async function markBad(id, ms = BAN.failure) {
    const b = await bans();
    b.set(id, Date.now() + ms);
    if (ms >= BAN.unavailable) {
      await kvSet('blocked-models', Object.fromEntries([...b].filter(([, until]) => until - Date.now() > BAN.failure)));
    }
  }
  function banFor(err) {
    const msg = err.raw || err.message;
    if (err.status === 429) return BAN.rateLimit;
    // Request too long for this model: the model itself is fine, just try the next one (no ban).
    if ([400, 413].includes(err.status) && /context|token|too long|too large|maximum|exceed/i.test(msg)) return 0;
    if ([402, 403, 404].includes(err.status) || /only available|no endpoints|not a valid model|not found/i.test(msg)) return BAN.unavailable;
    return BAN.failure;
  }
  const isDailyLimit = err => err.status === 429 && /per[- ]day|daily/i.test(err.raw || err.message);

  async function candidateModels(selected, needVision) {
    let all = [];
    try { all = await getFreeModels(); } catch {}
    const b = await bans();
    const free = all.filter(m => !needVision || m.vision).map(m => m.id);
    const keepSelected = selected && selected !== AUTO &&
      (!needVision || all.some(m => m.id === selected && m.vision) || !all.length);
    const uniq = [...new Set(keepSelected ? [selected, ...free] : free)];
    const fresh = uniq.filter(id => (b.get(id) || 0) <= Date.now());
    return (fresh.length ? fresh : uniq).slice(0, 10);
  }

  function explainError(status, body) {
    let msg = body;
    try { msg = JSON.parse(body).error?.message || body; } catch {}
    if (status === 401) return 'Неверный API ключ. Нажми «Обновить план» и вставь ключ заново.';
    if (status === 402) return 'Эта модель доступна только на платном плане. Выбери другую модель в настройках.';
    if (status === 429 && /per[- ]day|daily/i.test(body)) {
      return 'Дневной лимит бесплатных запросов закончился. Он обновится завтра — или нажми «Обновить план» и вставь свой API ключ.';
    }
    if (status === 429) return 'Все бесплатные модели сейчас перегружены. Подожди минуту и отправь ещё раз.';
    return `Ошибка ИИ-сервиса (${status}): ${String(msg).slice(0, 400)}`;
  }
  function apiError(status, raw) {
    const err = new Error(explainError(status, raw));
    err.status = status;
    err.raw = raw;
    return err;
  }

  async function streamCompletion(apiKey, model, messages, onDelta, onReasoning, signal) {
    let r;
    try {
      r = await nativeFetch(`${OPENROUTER}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'LoveAI',
        },
        body: JSON.stringify({ model, messages, stream: true }),
      });
    } catch (e) {
      if (signal.aborted) throw e;
      throw new Error('Нет интернета или ИИ-сервис недоступен.');
    }
    if (!r.ok) throw apiError(r.status, await r.text());
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', text = '', finish = null, usedModel = model;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let json;
        try { json = JSON.parse(data); } catch { continue; }
        if (json.error) throw apiError(Number(json.error.code) || 500, data);
        if (json.model) usedModel = json.model;
        const choice = json.choices?.[0];
        if (!choice) continue;
        const d = choice.delta || {};
        if (d.reasoning) onReasoning(d.reasoning);
        if (d.content) { text += d.content; onDelta(d.content); }
        if (choice.finish_reason) finish = choice.finish_reason;
      }
    }
    return { text, finish, usedModel };
  }

  // ---------- voice messages ----------
  // Speech is turned into text by a free model that understands audio; the text then goes through the normal chat.
  const TRANSCRIBE_PROMPT = 'Перепиши дословно речь из этой аудиозаписи на том языке, на котором говорят. ' +
    'Выведи только сам текст речи — без кавычек, пояснений и перевода. Если речи не слышно, выведи ровно: [тишина]';
  const MAX_AUDIO = 12e6; // base64 characters, about 4.5 minutes of 16 kHz WAV

  async function transcribe(apiKey, audio, format) {
    let all = [];
    try { all = await getFreeModels(); } catch {}
    const b = await bans();
    const ids = all.filter(m => m.audio).map(m => m.id);
    const fresh = ids.filter(id => (b.get(id) || 0) <= Date.now());
    const models = (fresh.length ? fresh : ids).slice(0, 5);
    if (!models.length) throw new Error('Сейчас нет бесплатных моделей, которые понимают голос. Напиши сообщение текстом.');
    let lastErr = null;
    for (const model of models) {
      try {
        let r;
        try {
          r = await nativeFetch(`${OPENROUTER}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'LoveAI' },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: [
                { type: 'text', text: TRANSCRIBE_PROMPT },
                { type: 'input_audio', input_audio: { data: audio, format } },
              ] }],
            }),
          });
        } catch { throw new Error('Нет интернета или ИИ-сервис недоступен.'); }
        const raw = await r.text();
        let data = {};
        try { data = JSON.parse(raw); } catch {}
        if (!r.ok) throw apiError(r.status, raw);
        if (data.error) throw apiError(Number(data.error.code) || 500, raw);
        const text = String(data.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (!text) throw new Error(`Модель ${model} вернула пустой текст.`);
        return /^\[?тишина\]?\.?$/i.test(text) ? '' : text.replace(/^["«]|["»]$/g, '').trim();
      } catch (e) {
        lastErr = e;
        console.warn('transcribe fail', model, e.status, e.raw || e.message);
        if (e.status === 401 || isDailyLimit(e) || !e.status && /интернет/.test(e.message)) throw e;
        await markBad(model, banFor(e));
      }
    }
    throw new Error(lastErr?.status === 429 ? lastErr.message : 'Не получилось распознать голосовое. Попробуй ещё раз или напиши текстом.');
  }

  async function handleTranscribe(body) {
    const cfg = await loadConfig();
    const audio = String(body.audio || '');
    const format = ['wav', 'mp3'].includes(body.format) ? body.format : 'wav';
    if (!audio) return json({ error: 'Пустая запись' }, 400);
    if (audio.length > MAX_AUDIO) return json({ error: 'Голосовое слишком длинное — запиши покороче.' }, 400);
    if (!effectiveKey(cfg)) return json({ error: 'Нет API ключа. Нажми «Обновить план» и вставь ключ.' }, 400);
    try { return json({ text: await transcribe(effectiveKey(cfg), audio, format) }); }
    catch (e) { return json({ error: e.message }, 502); }
  }

  // ---------- chat job ----------
  const activeJobs = new Map(); // project -> AbortController

  async function runChatJob(project, cfg, history, emit, signal) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + await loadSkills() + '\n\n' + await buildProjectContext(project) },
      ...history.slice(-20)
        .filter(m => !m.error && !(m.role === 'assistant' && isJunkReply(m.content)))
        .map(m => ({
          role: m.role,
          content: m.role !== 'assistant' ? m.content + imagesNote(m.images)
            : m.lazy ? compactForHistory(m.content) + '\n(Код в этом ответе я не вывел, поэтому файлы тогда НЕ изменились.)'
            : compactForHistory(m.content),
        }))
        .filter(m => m.content),
    ];
    const lastMsg = messages[messages.length - 1];
    const wantsChange = !isQuestion(history[history.length - 1].content);
    if (wantsChange) lastMsg.content += `\n\n(${FILE_REMINDER})`;

    const newImages = history[history.length - 1].images || [];
    if (newImages.length) {
      const urls = await Promise.all(newImages.map(async rel => (await getFile(project, rel))?.dataUrl));
      lastMsg.content = [
        { type: 'text', text: lastMsg.content },
        ...urls.filter(Boolean).map(url => ({ type: 'image_url', image_url: { url } })),
      ];
    }

    const models = await candidateModels(cfg.model, newImages.length > 0);
    if (!models.length) {
      if (newImages.length) emit({ type: 'notice', text: 'Сейчас нет бесплатных моделей, которые видят фото. Фото сохранено в проект, но ИИ его не увидит.' });
      models.push(cfg.model === AUTO ? 'openrouter/free' : cfg.model);
    }

    const ask = (model, msgs) => streamCompletion(effectiveKey(cfg), model, msgs,
      t => emit({ type: 'delta', text: t }),
      t => emit({ type: 'reasoning', text: t }),
      signal);

    let result = null, lastErr = null, lazy = false;
    for (const model of models) {
      try {
        emit({ type: 'model', id: model });
        result = await finishTruncated(ask, model, messages, await ask(model, messages));
        if (isJunkReply(result.text)) throw new Error(`Модель ${model} ответила не по делу.`);
        // Claimed changes without code: ask once for the code; if it still sends none, keep the reply with a note.
        if (wantsChange && claimsChangeWithoutFiles(result.text)) {
          emit({ type: 'reset' });
          const followUp = [...messages, { role: 'assistant', content: result.text }, { role: 'user', content: FILE_CORRECTION }];
          const retry = await finishTruncated(ask, model, followUp, await ask(model, followUp)).catch(() => null);
          if (retry && /<file\s+path=/.test(retry.text)) result = retry;
          else {
            lazy = true;
            emit({ type: 'reset' });
            emit({ type: 'delta', text: result.text });
          }
        }
        break;
      } catch (e) {
        result = null;
        if (signal.aborted) break;
        lastErr = e;
        console.warn('model fail', model, e.status, e.raw || e.message);
        if (e.status === 401 || isDailyLimit(e)) break;
        const ban = banFor(e);
        if (ban) await markBad(model, ban);
        emit({ type: 'reset' });
        if (e.status === 429) await new Promise(r => setTimeout(r, 700));
      }
    }
    if (lastErr && !result && !signal.aborted && lastErr.status !== 401 && !isDailyLimit(lastErr)) {
      lastErr = new Error(lastErr.status === 429
        ? lastErr.message
        : 'Не получилось получить ответ ни от одной бесплатной модели. Проверь интернет и попробуй ещё раз через минуту.');
    }

    if (!result) {
      const msg = signal.aborted ? 'Остановлено.' : (lastErr?.message || 'Неизвестная ошибка');
      history.push({ role: 'assistant', content: `⚠ ${msg}`, error: true, at: Date.now() });
      await saveChat(project, history);
      emit({ type: 'error', message: msg });
      return;
    }

    const files = await applyFileOps(project, result.text);
    for (const f of files) emit({ type: 'file', ...f });
    if (openFileTag(result.text)) {
      emit({ type: 'notice', text: 'Ответ получился слишком длинным и оборвался — последний файл не сохранён. Напиши «продолжи», чтобы ИИ дописал.' });
    } else if (lazy) {
      emit({ type: 'notice', text: 'ИИ написал, что всё сделал, но не прислал код — файлы не изменились. Отправь задачу ещё раз.' });
    }
    history.push({ role: 'assistant', content: result.text, model: result.usedModel, files, ...(lazy && { lazy: true }), at: Date.now() });
    await saveChat(project, history);
    emit({ type: 'done', model: result.usedModel });
  }

  async function handleChat(body) {
    const cfg = await loadConfig();
    const project = safeProjectName(body.project);
    const rawImages = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
    const userText = String(body.message || '').trim() || (rawImages.length ? 'Вот фото.' : '');
    if (!project) return json({ error: 'Не выбран проект' }, 400);
    if (!userText) return json({ error: 'Пустое сообщение' }, 400);
    if (!effectiveKey(cfg)) return json({ error: 'Нет API ключа. Нажми «Обновить план» и вставь ключ.' }, 400);
    if (activeJobs.has(project)) return json({ error: 'ИИ ещё работает над прошлым запросом в этом проекте. Подожди или нажми «Стоп».' }, 409);

    let images;
    try { images = await saveImages(project, rawImages); }
    catch (e) { return json({ error: e.message }, 400); }
    const history = await loadChat(project);
    history.push({ role: 'user', content: userText, ...(images.length && { images }), ...(body.voice && { voice: true }), at: Date.now() });
    await saveChat(project, history);

    const abort = new AbortController();
    activeJobs.set(project, abort);
    const encoder = new TextEncoder();
    let controller, closed = false;
    const stream = new ReadableStream({
      start(c) { controller = c; },
      cancel() { closed = true; }, // the job keeps running; only «Стоп» aborts it
    });
    const emit = obj => { if (!closed) { try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')); } catch { closed = true; } } };
    (async () => {
      try {
        await runChatJob(project, cfg, history, emit, abort.signal);
      } catch (e) {
        console.error(e);
        history.push({ role: 'assistant', content: `⚠ Внутренняя ошибка: ${e.message}`, error: true, at: Date.now() });
        await saveChat(project, history).catch(() => {});
        emit({ type: 'error', message: `Внутренняя ошибка: ${e.message}` });
      } finally {
        activeJobs.delete(project);
        if (!closed) try { controller.close(); } catch {}
      }
    })();
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
  }

  // ---------- router ----------
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

  async function route(method, p, body) {
    let m;
    if (p === '/api/config' && method === 'GET') {
      const cfg = await loadConfig();
      return json({
        hasKey: !!effectiveKey(cfg),
        builtinKey: !cfg.apiKey,
        keyHint: cfg.apiKey ? cfg.apiKey.slice(0, 8) + '…' + cfg.apiKey.slice(-4) : '',
        model: cfg.model,
      });
    }
    if (p === '/api/config' && method === 'POST') {
      const cfg = await loadConfig();
      if (typeof body.apiKey === 'string' && body.apiKey.trim()) cfg.apiKey = body.apiKey.trim();
      if (typeof body.model === 'string' && body.model.trim()) cfg.model = body.model.trim();
      await kvSet('config', cfg);
      return json({ ok: true });
    }
    if (p === '/api/models') {
      try {
        const b = await bans();
        return json((await getFreeModels()).filter(x => (b.get(x.id) || 0) - Date.now() < BAN.failure));
      } catch (e) { return json({ error: e.message }, 502); }
    }
    if (p === '/api/projects' && method === 'GET') return json(await listProjects());
    if (p === '/api/projects' && method === 'POST') {
      const name = safeProjectName(body.name);
      if (!name) return json({ error: 'Некорректное имя' }, 400);
      await touchProject(name);
      return json({ name });
    }
    if ((m = p.match(/^\/api\/projects\/([^/]+)\/(files|chat|status|stop|open)$/))) {
      const project = safeProjectName(m[1]);
      if (!project) return json({ error: 'Некорректное имя проекта' }, 400);
      switch (m[2]) {
        case 'files': return json(await listFiles(project));
        case 'chat':
          if (method === 'DELETE') { await saveChat(project, []); return json({ ok: true }); }
          return json(await loadChat(project));
        case 'status': return json({ busy: activeJobs.has(project) });
        case 'stop': activeJobs.get(project)?.abort(); return json({ ok: true });
        case 'open': return json({ error: 'На телефоне файлы проекта хранятся внутри приложения.' }, 400);
      }
    }
    if (p === '/api/chat' && method === 'POST') return handleChat(body);
    if (p === '/api/transcribe' && method === 'POST') return handleTranscribe(body);
    if ((m = p.match(/^\/preview\/([^/]+)\/(.*)$/))) {
      const f = await getFile(safeProjectName(m[1]), safePath(m[2] || 'index.html') || 'index.html');
      if (!f) return new Response('Не найдено', { status: 404 });
      if (f.dataUrl) return nativeFetch(f.dataUrl);
      return new Response(f.text, { headers: { 'Content-Type': (MIME[ext(f.path)] || 'text/plain') + '; charset=utf-8' } });
    }
    return json({ error: 'Неизвестный адрес' }, 404);
  }

  // ---------- fetch patch ----------
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !/^\/(api|preview)\//.test(url.pathname)) return nativeFetch(input, init);
    const method = (init.method || 'GET').toUpperCase();
    let body = {};
    if (init.body) { try { body = JSON.parse(init.body); } catch {} }
    try {
      return await route(method, decodeURIComponent(url.pathname), body);
    } catch (e) {
      console.error(e);
      return json({ error: e.message }, 500);
    }
  };

  // Used by mobile-ui.js to assemble previews.
  window.mobileBackend = { getFile, listFiles, safePath, isImage, MIME, ext };
})();
