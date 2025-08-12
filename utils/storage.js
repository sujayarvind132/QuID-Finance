export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'exchange','interval','autoDisableWhenClosed','symbolOverride','backendUrl','alphaKey'
    ], res => resolve({
      exchange: res.exchange || 'NSE',
      interval: res.interval || '15m',
      autoDisableWhenClosed: res.autoDisableWhenClosed ?? true,
      symbolOverride: res.symbolOverride || null,
      backendUrl: res.backendUrl || '',
      alphaKey: res.alphaKey || ''
    }));
  });
}
export async function setSettings(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}
