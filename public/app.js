const form = document.querySelector("#download-form");
const input = document.querySelector("#video-url");
const result = document.querySelector("#result");
const label = document.querySelector("#status-label");
const dot = document.querySelector("#status-dot");
const title = document.querySelector("#result-title");
const copy = document.querySelector("#result-copy");
const link = document.querySelector("#file-link");
const retry = document.querySelector("#retry");
const timer = document.querySelector("#timer");
const submit = form.querySelector("button");
let controller;
let pollTimer;
let started;

function setState(state, status, heading, message) {
  result.hidden = false;
  result.dataset.state = state;
  dot.className = `status-dot ${state}`;
  label.textContent = status;
  title.textContent = heading;
  copy.textContent = message;
  link.hidden = state !== "ready";
  retry.hidden = state !== "failed";
  timer.textContent = ["ready", "failed"].includes(state)
    ? ""
    : `${Math.floor((Date.now() - started) / 1000)} сек`;
}

function showError(message) {
  clearTimeout(pollTimer);
  setState("failed", "Не удалось скачать", "Попробуем ещё раз?", message);
}

async function request(url, signal, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.error || "Сервис временно недоступен. Попробуй чуть позже.",
    );
  return data;
}

function render(job) {
  switch (job.status) {
    case "queued":
      setState(
        "queued",
        "В очереди",
        "Ссылка уже у нас",
        "Скоро начнём подготовку. Эту вкладку можно оставить открытой.",
      );
      break;
    case "downloading":
      setState(
        "downloading",
        "Скачиваем",
        "Готовим твой файл",
        "Это может занять немного времени — зависит от длины видео и скорости платформы.",
      );
      break;
    case "ready": {
      const size = (job.size / 1024 / 1024).toFixed(1);
      const expires = new Date(job.expires_at).toLocaleString("ru-RU", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      link.href = `/api/downloads/${encodeURIComponent(job.id)}/file`;
      setState(
        "ready",
        "Готово к скачиванию",
        `Видео готово · ${size} МБ`,
        `Сохрани файл до ${expires}. После этого ссылка перестанет работать.`,
      );
      break;
    }
    case "failed":
      showError(job.error || "Платформа не разрешила скачать это видео.");
      break;
    default:
      throw new Error("Не удалось получить состояние видео. Попробуй ещё раз.");
  }
}

async function poll(id, signal) {
  try {
    const job = await request(
      `/api/downloads/${encodeURIComponent(id)}`,
      signal,
    );
    if (signal.aborted) return;
    render(job);
    if (!["ready", "failed"].includes(job.status)) {
      pollTimer = setTimeout(() => poll(id, signal), 1800);
    }
  } catch (error) {
    if (!signal.aborted) showError(error.message);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearTimeout(pollTimer);
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  started = Date.now();
  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  setState(
    "queued",
    "Проверяем ссылку",
    "Секунду, начинаем",
    "Подготавливаем видео к скачиванию.",
  );
  try {
    const job = await request("/api/downloads", signal, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: input.value.trim() }),
    });
    if (signal.aborted) return;
    render(job);
    if (!["ready", "failed"].includes(job.status)) poll(job.id, signal);
  } catch (error) {
    if (!signal.aborted) showError(error.message);
  } finally {
    if (!signal.aborted) {
      submit.disabled = false;
      form.setAttribute("aria-busy", "false");
    }
  }
});

retry.addEventListener("click", () => form.requestSubmit());
window.addEventListener("pagehide", () => {
  controller?.abort();
  clearTimeout(pollTimer);
});
