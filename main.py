from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pytrends.request import TrendReq
from datetime import datetime, timedelta

app = FastAPI()


@app.get("/related_queries")
async def get_related_queries(q: str):
    try:
        related_queries_data = await fetch_google_related_queries(q)
        return JSONResponse(content=related_queries_data)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

async def fetch_google_related_queries(query):
    try:
        pytrend = TrendReq(hl='en-US', tz=120)
        pytrend.build_payload(kw_list=[query], timeframe='today 5-y')

        related_queries = pytrend.related_queries()[query]['top']

        related_queries_list = []
        for _, row in related_queries.iterrows():
            related_queries_list.append({
                "query": row["query"],
                "value": row["value"]
            })

        sorted_related_queries = sorted(related_queries_list, key=lambda x: x["value"], reverse=True)

        return {
            "main_query": query,
            "related_queries_count": len(sorted_related_queries),
            "related_queries": sorted_related_queries
        }
    except Exception as e:
        raise Exception("Error fetching Google Trends related queries: " + str(e))


@app.get("/get_history")
async def get_history(q: str):
    try:
        history_data = await fetch_google_history(q)
        return JSONResponse(content=history_data)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

async def fetch_google_history(query):
    try:
        pytrend = TrendReq(hl='en-US', tz=120)
        
        # Calculate the date range for the past year
        end_date = datetime.now().replace(day=1) - timedelta(days=1)
        start_date = end_date.replace(year=end_date.year - 1, month=end_date.month)
        
        pytrend.build_payload(kw_list=[query], timeframe=f'{start_date.strftime("%Y-%m-%d")} {end_date.strftime("%Y-%m-%d")}')
        trend_data = pytrend.interest_over_time()

        history_data = {}
        for date, value in trend_data.iterrows():
            formatted_date = date.strftime('%m.%Y')
            history_data[formatted_date] = int(value[query])

        return history_data
    except Exception as e:
        raise Exception("Error fetching Google Trends history: " + str(e))
