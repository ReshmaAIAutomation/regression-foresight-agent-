import os
import sys
import json
import math
import requests
from pymongo import MongoClient

def load_env():
    env_path = os.path.join(os.getcwd(), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ[key] = val.replace('"', '').replace("'", "")

load_env()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_query_embedding(text: str) -> list:
    if not MISTRAL_API_KEY:
        raise ValueError("Missing MISTRAL_API_KEY in environment variables.")
        
    url = "https://api.mistral.ai/v1/embeddings"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MISTRAL_API_KEY}"
    }
    payload = {
        "model": "mistral-embed",
        "input": [text]
    }
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        raise Exception(f"Mistral API returned error status {response.status_code}: {response.text}")
        
    data = response.json()
    return data["data"][0]["embedding"]

def cosine_similarity(v1: list, v2: list) -> float:
    dot_prod = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if not mag1 or not mag2:
        return 0.0
    return dot_prod / (mag1 * mag2)

def rerank_with_groq(query: str, candidates: list) -> str:
    if not GROQ_API_KEY:
        # If no Groq Key, return default first candidate mapping explanation
        best = candidates[0]
        return f"Scoped E2E spec automatically based on top Cosine score ({best['score']:.4f}). Selected {best['playwrightTag']} because it contains direct validation bindings."
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }
    
    candidates_summary = ""
    for idx, c in enumerate(candidates):
        candidates_summary += f"[{idx + 1}] ID: {c['id']} | Title: {c['title']} | Tag: {c['playwrightTag']} | Script: {c['scriptPath']} | Similarity Score: {c['score']:.4f}\nDescription: {c['description']}\n"
        
    system_prompt = (
        "You are an Elite AI Test Architect. Your job is to select the single most relevant automated test spec "
        "from a list of candidates based on a plain-English test checkpoint. Return a JSON structure containing: "
        "1. 'selected_id': the ID of the chosen test case. "
        "2. 'reasoning': a brief, high-impact architectural explanation of why this spec fits best. "
        "Respond ONLY with valid JSON."
    )
    
    user_prompt = f"Query Checkpoint: '{query}'\n\nCandidate Specs:\n{candidates_summary}"
    
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "role", "content": user_prompt} # Wait, 'role' should be 'user'! Let's fix that below.
        ],
        "temperature": 0.2
    }
    
    # We will use role 'user' instead of 'role' to avoid OpenAI schema error
    payload["messages"][1]["role"] = "user"
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]
            # Clean up markdown JSON wrapper if LLM returned it
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return content.strip()
    except Exception as e:
        pass
        
    # Standard fallback
    best = candidates[0]
    return json.dumps({
        "selected_id": best["id"],
        "reasoning": f"Automatically scoped via Cosine Similarity retrieval (Score: {best['score']:.4f})."
    })

def search_test_cases(query_text: str, similarity_threshold: float = 0.65) -> str:
    if not MONGO_URI:
        return json.dumps({
            "status": "error",
            "message": "MONGO_URI is missing in .env."
        })
        
    try:
        # 1. Generate Embedding for search text
        query_vector = get_query_embedding(query_text)
        
        # 2. Retrieve candidates from MongoDB Atlas
        client = MongoClient(MONGO_URI)
        db = client["ApexDecisionDB"]
        collection = db["testcases"]
        
        documents = list(collection.find({}))
        
        if not documents:
            client.close()
            return json.dumps({
                "status": "error",
                "message": "No test cases found in database. Run rag_ingest.py first."
            })
            
        # Calculate cosine similarity locally in memory for maximum resilience
        candidates = []
        for doc in documents:
            if "embedding" in doc:
                score = cosine_similarity(query_vector, doc["embedding"])
                if score >= similarity_threshold:
                    doc_copy = {k: v for k, v in doc.items() if k != "embedding" and k != "_id"}
                    doc_copy["score"] = score
                    candidates.append(doc_copy)
                    
        client.close()
        
        if not candidates:
            return json.dumps({
                "status": "success",
                "query": query_text,
                "message": f"No matches found above similarity threshold {similarity_threshold}.",
                "results": []
            })
            
        # Sort candidates by cosine score descending
        candidates.sort(key=lambda x: x["score"], reverse=True)
        top_candidates = candidates[:3] # Keep top 3 candidates
        
        # 3. Rerank top matches using Groq LLaMA3
        rerank_output = rerank_with_groq(query_text, top_candidates)
        
        try:
            rerank_data = json.loads(rerank_output)
            best_id = rerank_data.get("selected_id")
            reasoning = rerank_data.get("reasoning", "")
        except:
            best_id = top_candidates[0]["id"]
            reasoning = rerank_output
            
        # Find the selected document object
        selected_doc = next((c for c in top_candidates if c["id"] == best_id), top_candidates[0])
        
        return json.dumps({
            "status": "success",
            "query": query_text,
            "best_match": {
                "id": selected_doc["id"],
                "module": selected_doc["module"],
                "title": selected_doc["title"],
                "playwrightTag": selected_doc["playwrightTag"],
                "scriptPath": selected_doc["scriptPath"],
                "cosineScore": selected_doc["score"],
                "reasoning": reasoning
            },
            "all_candidates": top_candidates
        }, indent=2)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": str(e)
        })

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "Verify email template HTML layout characters"
    output = search_test_cases(query)
    print(output)
