// LoveAI — распознавание речи прямо на устройстве (модель Whisper, бесплатно и без ключа).
// Нужна там, где нет встроенного распознавания: программа для ПК и браузеры вроде Firefox.
// Библиотека грузится с CDN, а модель (~77 МБ) скачивается один раз и хранится в IndexedDB.
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const MODEL = 'onnx-community/whisper-base';

// Whisper needs the language name; the interface language of the device is the best guess.
const LANGS = { ru: 'russian', kk: 'kazakh', en: 'english', uk: 'ukrainian', uz: 'uzbek', ky: 'kyrgyz', be: 'belarusian',
  tr: 'turkish', de: 'german', fr: 'french', es: 'spanish', it: 'italian', pl: 'polish', ar: 'arabic', zh: 'chinese' };
const language = () => LANGS[(navigator.language || 'ru').slice(0, 2).toLowerCase()] || 'russian';

// Model files in IndexedDB (Cache Storage does not work everywhere, e.g. in the PC app on some Windows profiles).
let dbPromise;
function db() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open('loveai-models', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
const idbCache = {
  async match(key) {
    const d = await db();
    const hit = await new Promise((resolve, reject) => {
      const r = d.transaction('files').objectStore('files').get(String(key));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return hit ? new Response(hit.body, { headers: { 'Content-Type': hit.type || 'application/octet-stream' } }) : undefined;
  },
  async put(key, response) {
    const body = await response.arrayBuffer();
    const d = await db();
    await new Promise((resolve, reject) => {
      const t = d.transaction('files', 'readwrite');
      t.objectStore('files').put({ body, type: response.headers.get('Content-Type') }, String(key));
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
  },
};

let asrPromise = null;
function loadModel(onProgress) {
  asrPromise ||= (async () => {
    const { pipeline, env } = await import(LIB);
    env.allowLocalModels = false;
    env.useBrowserCache = false;
    env.useCustomCache = true;
    env.customCache = idbCache;
    const loaded = {};
    return pipeline('automatic-speech-recognition', MODEL, {
      dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
      device: 'wasm',
      progress_callback: p => {
        if (p.status !== 'progress' || !p.total) return;
        loaded[p.file] = [p.loaded, p.total];
        const [got, total] = Object.values(loaded).reduce((a, [l, t]) => [a[0] + l, a[1] + t], [0, 0]);
        // Only big files mean a real download; cache reads are instant.
        if (total > 5e6) onProgress?.(Math.round(got / total * 100));
      },
    });
  })();
  asrPromise.catch(() => { asrPromise = null; });
  return asrPromise;
}

// pcm: Float32Array, 16 kHz mono. Returns the recognised text.
export async function transcribe(pcm, onProgress) {
  const asr = await loadModel(onProgress);
  const out = await asr(pcm, { task: 'transcribe', language: language(), chunk_length_s: 30, stride_length_s: 5 });
  return String(out?.text || '').trim();
}
