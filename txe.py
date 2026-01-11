from fastapi import FastAPI
from fastapi.responses import JSONResponse
import time

app = FastAPI()

@app.get("/hydration")
def get_hydration():
    # 这里填你真实要给 Pie 的数据
    data = {
        "status": "RISK",
        "time": time.strftime("%H:%M:%S"),
        "text": "来自 Python 的水分监测数据"
    }
    return JSONResponse(content=data)

# 需要 POST 的话也可以写成：
# @app.post("/hydration")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
