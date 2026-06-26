import os
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel

RAPIDAPI_KEY=os.environ.get("RAPIDAPI_KEY","")
JUDGE0_URL="https://judge0-ce.p.rapidapi.com"

LANGUAGE_MAP={
    "c":50,
    "cpp":54,
    "java":62,
    "python":71,
    "sql":82
}

limiter=Limiter(key_func=get_remote_address)
app=FastAPI()
app.state.limiter=limiter
app.add_exception_handler(RateLimitExceeded,_rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://happinama-ide.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_methods=["POST","GET"],
    allow_headers=["Content-Type"],
)

class CodeRequest(BaseModel):
    language:str
    source_code:str
    stdin:str=""

@app.get("/")
def root():
    return{"status":"happinama backend running"}

@app.post("/execute")
@limiter.limit("20/minute")
async def execute(request:Request,body:CodeRequest):

    language_id=LANGUAGE_MAP.get(body.language.lower())

    if language_id is None:
        raise HTTPException(status_code=400,detail=f"Unsupported language: {body.language}")

    if not RAPIDAPI_KEY:
        raise HTTPException(status_code=500,detail="RAPIDAPI_KEY not configured")

    payload={
        "source_code":body.source_code,
        "language_id":language_id,
        "stdin":body.stdin,
        "cpu_time_limit":5,
        "memory_limit":262144,
        "wall_time_limit":10
    }

    headers={
        "Content-Type":"application/json",
        "X-RapidAPI-Key":RAPIDAPI_KEY,
        "X-RapidAPI-Host":"judge0-ce.p.rapidapi.com"
    }

    async with httpx.AsyncClient(timeout=15) as client:

        try:
            submit=await client.post(
                f"{JUDGE0_URL}/submissions?wait=true&base64_encoded=false",
                json=payload,
                headers=headers
            )
            submit.raise_for_status()

        except httpx.RequestError:
            raise HTTPException(status_code=502,detail="Judge0 unreachable")

        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502,detail=f"Judge0 error: {e.response.status_code}")

    result=submit.json()

    stdout=result.get("stdout") or ""
    stderr=result.get("stderr") or ""
    compile_output=result.get("compile_output") or ""
    status=result.get("status",{}).get("description","Unknown")
    time_taken=result.get("time") or "—"
    memory=result.get("memory") or "—"

    output_parts=[]

    if stdout:
        output_parts.append(stdout)

    if compile_output:
        output_parts.append(f"[compiler]\n{compile_output}")

    if stderr:
        output_parts.append(f"[stderr]\n{stderr}")

    if not output_parts:
        output_parts.append("[no output]")

    output_parts.append(f"\n[{status}]  time: {time_taken}s  memory: {memory}KB")

    return{
        "output":"\n".join(output_parts),
        "status":status,
        "time":time_taken,
        "memory":memory
    }
