import { setSettings, getSettings } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const s = await getSettings();
  document.getElementById('backendUrl').value = s.backendUrl || '';
  document.getElementById('alphaKey').value = s.alphaKey || '';
  document.getElementById('save').onclick = async () => {
    await setSettings({
      backendUrl: document.getElementById('backendUrl').value.trim(),
      alphaKey: document.getElementById('alphaKey').value.trim()
    });
    alert('Saved');
  };
});
