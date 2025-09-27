# testing api key

import os, requests
from dotenv import load_dotenv
load_dotenv() 
key = os.getenv("OPENAI_API_KEY")
hdrs = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
url = "https://api.openai.com/v1/chat/completions"
data = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello!"}]}
r = requests.post(url, headers=hdrs, json=data)
print("Status:", r.status_code)
print(r.text[:300], "...")
for k,v in r.headers.items():
    if k.lower().startswith("x-ratelimit"):
        print(k, "=", v)
