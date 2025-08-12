import json
# Convert XGBoost JSON model to a schema loadable by the WASM runner you include.
# If using a ready WASM that reads xgboost json directly, you can just copy xgb_model.json to /model/model.json

with open('xgb_model.json','r') as f:
    model_json = json.load(f)

# In many wasm ports, this is already fine. If your wasm loader expects the raw JSON string, just copy:
with open('../model/model.json','w') as f:
    json.dump(model_json, f)
