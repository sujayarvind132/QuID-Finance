import { setSettings, getSettings } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const s = await getSettings();
  document.getElementById('exchange').value = s.exchange || 'NSE';
  document.getElementById('interval').value = s.interval || '15m';
  document.getElementById('autoDisable').checked = s.autoDisableWhenClosed ?? true;

  document.getElementById('save').onclick = async () => {
    const settings = {
      exchange: document.getElementById('exchange').value,
      interval: document.getElementById('interval').value,
      autoDisableWhenClosed: document.getElementById('autoDisable').checked
    };
    await setSettings(settings);
    window.close();
  };

  document.getElementById('search').onclick = async () => {
    const sym = document.getElementById('symbol').value.trim().toUpperCase();
    if (!sym) return;
    await setSettings({ symbolOverride: sym });
    window.close();
  };
});
