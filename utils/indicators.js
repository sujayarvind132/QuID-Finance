import ss from '../lib/simple-statistics.min.js';

export function computeIndicators(candles) {
  // candles: [{t, o,h,l,c,v}]
  const close = candles.map(x => x.c);
  const high = candles.map(x => x.h);
  const low = candles.map(x => x.l);
  const vol = candles.map(x => x.v);

  const SMA10 = sma(close,10);
  const SMA50 = sma(close,50);
  const EMA12 = ema(close,12);
  const EMA26 = ema(close,26);
  const RSI14 = rsi(close,14);
  const { macd, signal, hist } = macdCalc(close,12,26,9);
  const ATR14 = atr(high,low,close,14);
  const { upper, middle, lower } = bollinger(close,20,2);
  const OBV = obv(close, vol);

  return candles.map((c, i) => ({
    ...c,
    sma10: SMA10[i], sma50: SMA50[i],
    ema12: EMA12[i], ema26: EMA26[i],
    rsi14: RSI14[i],
    macd: macd[i], macds: signal[i], macdh: hist[i],
    atr14: ATR14[i],
    bbU: upper[i], bbM: middle[i], bbL: lower[i],
    obv: OBV[i]
  }));
}

function sma(arr, n){ const out=Array(arr.length).fill(null); for(let i=n-1;i<arr.length;i++){ out[i]=arr.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n;} return out; }
function ema(arr, n){ const out=Array(arr.length).fill(null); const k=2/(n+1); let prev=null; for(let i=0;i<arr.length;i++){ const v=arr[i]; if (v==null) { out[i]=prev; continue; } if(prev==null){ const s=arr.slice(0,i+1).filter(x=>x!=null); if (s.length<n) { out[i]=null; } else { const base=s.slice(s.length-n).reduce((a,b)=>a+b,0)/n; prev=base; out[i]=prev; } } else { prev = v*k + prev*(1-k); out[i]=prev; } } return out; }
function rsi(arr, n){ const out=Array(arr.length).fill(null); let gains=0, losses=0; for(let i=1;i<arr.length;i++){ const ch=arr[i]-arr[i-1]; if(i<=n){ if(ch>0) gains+=ch; else losses-=ch; if(i===n){ const avgG=gains/n, avgL=losses/n; out[i]=100 - (100/(1+(avgG/(avgL||1e-9)))); } } else { const prev=out[i-1]; const gain=ch>0?ch:0, loss=ch<0?-ch:0; gains=(gains*(n-1)+gain)/n; losses=(losses*(n-1)+loss)/n; out[i]=100 - (100/(1+(gains/(losses||1e-9)))); } } return out; }
function macdCalc(arr, fast=12, slow=26, sig=9){ const f=ema(arr,fast), s=ema(arr,slow); const macd=arr.map((_,i)=> (f[i]!=null && s[i]!=null) ? f[i]-s[i] : null); const signal=ema(macd.filter(x=>x!=null),sig); const outSig=Array(arr.length).fill(null); let j=0; for(let i=0;i<arr.length;i++){ if(macd[i]==null) continue; outSig[i]=signal[j++]; } const hist=arr.map((_,i)=> macd[i]!=null && outSig[i]!=null ? macd[i]-outSig[i] : null); return { macd, signal: outSig, hist }; }
function tr(h,l,cPrev){ return Math.max(h-l, Math.abs(h-cPrev), Math.abs(l-cPrev)); }
function atr(H,L,C,n){ const out=Array(C.length).fill(null); let prevC = C[0]; const TR = C.map((_,i)=> i===0 ? (H[0]-L[0]) : tr(H[i],L[i],prevC = C[i-1])); let sum=0; for(let i=0;i<TR.length;i++){ sum+=TR[i]; if(i===n-1){ out[i]=sum/n; } else if (i>=n){ out[i]= (out[i-1]*(n-1)+TR[i])/n; } } return out; }
function bollinger(arr,n,k){ const outU=[], outM=[], outL=[]; for(let i=0;i<arr.length;i++){ if(i<n-1){ outU.push(null); outM.push(null); outL.push(null); continue; } const w=arr.slice(i-n+1,i+1); const m=w.reduce((a,b)=>a+b,0)/n; const sd=Math.sqrt(w.reduce((a,b)=>a+(b-m)*(b-m),0)/n); outM.push(m); outU.push(m + k*sd); outL.push(m - k*sd); } return { upper: outU, middle: outM, lower: outL }; }
function obv(close, vol){ const out=[]; let last=0; out.push(0); for(let i=1;i<close.length;i++){ if(close[i]>close[i-1]) last+=vol[i]; else if (close[i]<close[i-1]) last-=vol[i]; out.push(last); } return out; }
