// content/content.js
import { detectNseContext } from './detectors/nseDetector.js';
import { detectZerodhaContext } from './detectors/zerodhaDetector.js';
import { detectUpstoxContext } from './detectors/upstoxDetector.js';
import { fetchCandles } from '../utils/fetchData.js';
import { computeIndicators } from '../utils/indicators.js';
import { istNow, isMarketOpenIST, nextOpenInfo } from '../utils/timezone.js';
import { isNseHoliday } from '../utils/holidays.js';
import { runModel } from '../utils/modelRunner.js';
import { buildFeatureFrame } from '../utils/featureEngineering.js';
import { getSettings } from '../utils/storage.js';

let currentCtx = null;
let overlayEl = null;
let lastRunTs = 0;

async function init() {
  currentCtx = detectNseContext() || detectZerodhaContext() || detectUpstoxContext();
  if (!currentCtx) return;

  overlayEl = await injectOverlay();
  updateOverlayStatus('Initializing...');

  const settings = await getSettings();

  const now = istNow();
  const holidays = await getHolidays();
  const closed = !isMarketOpenIST(now) || isNseHoliday(now, holidays);

  if (closed && settings.autoDisableWhenClosed) {
    updateOverlayClosed(now, holidays);
    return;
  }

  await runPipeline(currentCtx, settings);

  // Observe URL/DOM changes for symbol/timeframe changes
  const observer = new MutationObserver(async () => {
    const newCtx = detectNseContext() || detectZerodhaContext() || detectUpstoxContext();
    if (newCtx && (newCtx.symbol !== currentCtx.symbol || newCtx.interval !== currentCtx.interval)) {
      currentCtx = newCtx;
      updateOverlayStatus(`Detected ${newCtx.symbol} ${newCtx.interval}`);
      await runPipeline(currentCtx, settings);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Periodic refresh (e.g., every minute for intraday)
  setInterval(async () => {
    const settings = await getSettings();
    const now = istNow();
    const holidays = await getHolidays();
    if (!isMarketOpenIST(now) || isNseHoliday(now, holidays)) {
      updateOverlayClosed(now, holidays);
      return;
    }
    if (Date.now() - lastRunTs > (currentCtx.interval === '1d' ? 5 * 60 * 1000 : 60 * 1000)) {
      await runPipeline(currentCtx, settings);
    }
  }, 15 * 1000);
}

async function runPipeline(ctx, settings) {
  try {
    updateOverlayStatus('Fetching data...');
    const candles = await fetchCandles(ctx.symbol, ctx.interval, settings);
    if (!candles || candles.length < 50) throw new Error('Insufficient data');

    updateOverlayStatus('Computing indicators...');
    const withInd = computeIndicators(candles);

    updateOverlayStatus('Building features...');
    const features = buildFeatureFrame(withInd);

    updateOverlayStatus('Running model...');
    const result = await runModel(features);

    lastRunTs = Date.now();
    renderOverlayResult(ctx, result);
  } catch (e) {
    updateOverlayError(e.message);
  }
}

async function getHolidays() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getHolidays' }, res => resolve(res?.holidays || []));
  });
}

async function injectOverlay() {
  const tplUrl = chrome.runtime.getURL('content/overlay.html');
  const html = await fetch(tplUrl).then(r => r.text());
  const container = document.createElement('div');
  container.innerHTML = html;
  document.documentElement.appendChild(container);
  return container.querySelector('#quid-overlay');
}

function updateOverlayStatus(text) {
  if (!overlayEl) return;
  overlayEl.style.display = 'block';
  overlayEl.querySelector('.quid-status').textContent = text;
}

function updateOverlayError(text) {
  if (!overlayEl) return;
  overlayEl.querySelector('.quid-status').textContent = `Error: ${text}`;
}

function updateOverlayClosed(now, holidays) {
  const info = nextOpenInfo(now, holidays);
  updateOverlayStatus(`Market closed. Next session: ${info}`);
}

function renderOverlayResult(ctx, result) {
  const panel = overlayEl.querySelector('.quid-panel');
  const arrow = overlayEl.querySelector('.quid-arrow');
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  panel.querySelector('.quid-symbol').textContent = `${ctx.symbol} (${ctx.interval})`;
  panel.querySelector('.quid-signal').textContent = `${result.signal} (${Math.round(result.probability * 100)}%)`;
  panel.querySelector('.quid-timestamp').textContent = `Last signal: ${ts}`;
  panel.querySelector('.quid-topf').textContent = `Top drivers: ${result.top_features.join(', ')}`;

  arrow.className = `quid-arrow ${result.signal.toLowerCase()}`;
}

init();
