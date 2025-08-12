import numpy as np, xgboost as xgb, json, os
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import log_loss, accuracy_score

def fit_model(X, y):
    params = {
        'objective': 'multi:softprob',
        'num_class': 3,
        'eval_metric': 'mlogloss',
        'max_depth': 5,
        'eta': 0.05,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'seed': 42
    }
    tscv = TimeSeriesSplit(n_splits=5)
    best_boost = 400
    accs=[]
    for tr, va in tscv.split(X):
        dtr = xgb.DMatrix(X[tr], label=y[tr])
        dva = xgb.DMatrix(X[va], label=y[va])
        bst = xgb.train(params, dtr, num_boost_round=best_boost, evals=[(dva,'val')], verbose_eval=False)
        p = bst.predict(dva).argmax(axis=1)
        accs.append(accuracy_score(y[va], p))
    print('CV accuracy:', np.mean(accs))
    dtrain = xgb.DMatrix(X, label=y)
    final = xgb.train(params, dtrain, num_boost_round=best_boost)
    return final

if __name__ == "__main__":
    data = np.load("dataset_INFy_1d.npz") if os.path.exists("dataset_INFy_1d.npz") else np.load("dataset_INFY_1d.npz")
    X, y, cols = data['X'], data['y'], data['cols'].tolist()
    model = fit_model(X, y)
    model.save_model("xgb_model.json")
    with open("feature_names.json","w") as f:
        json.dump(cols, f)
