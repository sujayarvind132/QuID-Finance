import pandas as pd, yfinance as yf, time
# Fetch NSE via Yahoo (.NS suffix)
def fetch_symbol(symbol, interval='1d', period='2y'):
    yf_sym = f"{symbol}.NS"
    df = yf.download(yf_sym, interval=interval, period=period, auto_adjust=True, progress=False)
    df = df.rename(columns={'Open':'o','High':'h','Low':'l','Close':'c','Volume':'v'})
    df.index = pd.to_datetime(df.index)
    df['t'] = df.index.tz_localize(None)
    return df[['t','o','h','l','c','v']]

if __name__ == "__main__":
    import sys
    sym = sys.argv[1] if len(sys.argv)>1 else 'INFY'
    df = fetch_symbol(sym, '1d', '5y')
    df.to_csv(f"data_{sym}_1d.csv", index=False)
