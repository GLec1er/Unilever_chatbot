import pandas as pd
import numpy as np

from prophet import Prophet

from fastapi import FastAPI
import requests
from json import loads, dumps

from main import fetch_google_history


# key_word = 'самокат'
# url = 'http://158.160.98.128/get_history?q=' + key_word


# response = requests.get(url)
# dictresp = response.json()
_ = json.dumps(history_data)
_data = json.loads(_)

df = pd.json_normalize(_data)
df = df.T.reset_index()
df.columns = ['ds', 'y']


def model_forecast(data):
    m = Prophet()
    fit_model = m.fit(data)
    return (fit_model)


def forecasting(model, period):
    future = model.make_future_dataframe(periods=period)
    forecast = model.predict(future)
    result = forecast.to_json(orient="split")
    return (result)