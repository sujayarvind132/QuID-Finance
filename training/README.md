1) Install:
   pip install -r requirements.txt

2) Download data (daily and intraday as needed):
   python fetch_data_nse.py INFY  # daily default (modify to save intraday by interval in script if needed)

3) Build dataset:
   python build_dataset.py INFY 1d

4) Train:
   python train_xgb.py

5) Export model:
   python export_xgb_to_json.py

The exported model is placed at ../model/model.json.

Note:
- For intraday (5m/15m), use yfinance interval='5m' or '15m' with period='60d' (Yahoo caps apply).
- For production-grade intraday, prefer broker historical APIs (Zerodha / Upstox) with proper authentication and a backend proxy since browser calls are restricted per documentation.
