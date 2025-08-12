import pandas as pd
import numpy as np

def indicators(df):
    close = df['c']
    df['sma10'] = close.rolling(10).mean()
    df['sma50'] = close.rolling(50).mean()
    df['ema12'] = close.ewm(span=12, adjust=False).mean()
    df['ema26'] = close.ewm(span=26, adjust=False).mean()

    delta = close.diff()
    up = delta.clip(lower=0)
    down = -delta.clip(upper=0)
    roll = 14
    rs = up.rolling(roll).mean() / (down.rolling(roll).mean() + 1e-9)
    df['rsi14'] = 100 - (100/(1+rs))

    ema12 = df['ema12']
    ema26 = df['ema26']
    df['macd'] = ema12 - ema26
    df['macds'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macdh'] = df['macd'] - df['macds']

    tr = pd.DataFrame({
        'h-l': df['h'] - df['l'],
        'h-pc': (df['h'] - df['c'].shift(1)).abs(),
        'l-pc': (df['l'] - df['c'].shift(1)).abs()
    }).max(axis=1)
    df['atr14'] = tr.rolling(14).mean()

    mid = close.rolling(20).mean()
    sd = close.rolling(20).std()
    df['bbM'] = mid
    df['bbU'] = mid + 2*sd
    df['bbL'] = mid - 2*sd

    obv = (np.sign(close.diff().fillna(0)) * df['v']).fillna(0).cumsum()
    df['obv'] = obv

    return df

def build_labels(df, horizon=1):
    # Next candle direction 3-class: HOLD (|ret|<thr), BUY (ret>thr), SELL (ret<-thr)
    ret = df['c'].shift(-horizon)/df['c'] - 1.0
    thr = 0.0015 if 'm' in df.attrs.get('interval','1d') else 0.004
    y = ret.apply(lambda r: 1 if r>thr else (2 if r<-thr else 0))
    df['y'] = y
    return df

def assemble_features(df):
    cols = ["c","sma10","sma50","ema12","ema26","rsi14","macd","macds","macdh","atr14","bbU","bbM","bbL","obv"]
    df = df.dropna().copy()
    X = df[cols].values.astype(np.float32)
    y = df['y'].values.astype(np.int64)
    return X, y, cols

if __name__ == "__main__":
    import sys
    sym = sys.argv[1] if len(sys.argv)>1 else 'INFY'
    interval = sys.argv[2] if len(sys.argv)>2 else '1d'
    df = pd.read_csv(f"data_{sym}_{interval}.csv", parse_dates=['t'])
    df.attrs['interval'] = interval
    df = indicators(df)
    df = build_labels(df, horizon=1)
    X, y, cols = assemble_features(df)
    np.savez_compressed(f"dataset_{sym}_{interval}.npz", X=X, y=y, cols=cols)
