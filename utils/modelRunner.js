// Lightweight XGBoost inference via WASM bundle
let xgbModule = null;
let model = null;

async function loadXgb() {
  if (xgbModule) return xgbModule;
  const jsUrl = chrome.runtime.getURL('lib/xgboost.wasm.js');
  await import(jsUrl);
  // Global XGBoost module is registered by the script above
  xgbModule = window.XGBoostWASM || null;
  return xgbModule;
}

async function loadModel() {
  if (model) return model;
  const url = chrome.runtime.getURL('model/model.json');
  const json = await fetch(url).then(r => r.json());
  model = await xgbModule.loadModelFromJson(json);
  return model;
}

export async function runModel(featureRow) {
  await loadXgb();
  const mdl = await loadModel();

  const columns = ["close","sma10","sma50","ema12","ema26","rsi14","macd","macds","macdh","atr14","bbU","bbM","bbL","obv"];
  const values = columns.map(k => featureRow[k] ?? 0);

  const { probs, shap } = mdl.predictProbaWithContrib([values]); // returns [[p_hold, p_buy, p_sell]] for example schema
  const probVec = probs[0];
  const labels = ['HOLD','BUY','SELL']; // ensure this matches training
  const maxIdx = probVec.indexOf(Math.max(...probVec));
  const signal = labels[maxIdx];
  const probability = probVec[maxIdx];

  // Top contributing features from absolute SHAP values
  const shapRow = shap[0];
  const featContrib = columns.map((c, i) => [c, Math.abs(shapRow[i])]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);

  return { signal, probability, top_features: featContrib };
}
