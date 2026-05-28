import os
import json
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

def get_embedding(text: str) -> list:
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

# Pre-defined high-quality e-commerce seed manual test cases with Playwright tag & path mappings
SEED_TEST_CASES = [
    {
        "id": "TEST-212841",
        "module": "Email Validation",
        "title": "Verify email treatment HTML body with special character overlays",
        "description": "Validates that HTML email templates render special characters, symbols, and overlays perfectly in client browsers.",
        "steps": "1. Set email channel wrapper to Email.\n2. Add special character treatment overlays (e.g. '@#$*&').\n3. Trigger campaign run and verify email body structure.",
        "expectedResults": "HTML symbols render successfully without breaking layout bindings.",
        "playwrightTag": "@TC-301",
        "scriptPath": "tests/email-validation.spec.ts"
    },
    {
        "id": "TEST-212842",
        "module": "Campaign Eligibility",
        "title": "Verify credit score threshold cashback eligibility limits",
        "description": "Validates that cardholders receive appropriate cashback treatments only when credit scores exceed required strategy rules.",
        "steps": "1. Inject customer profile with Credit Score = 710.\n2. Submit strategy request to CashbackEligibility.\n3. Verify returned card treatments are empty.\n4. Repeat with score = 760 and verify Cashback is active.",
        "expectedResults": "Strategy rules accurately block or award cashback based on credit limits.",
        "playwrightTag": "@TC-402",
        "scriptPath": "tests/eligibility-validation.spec.ts"
    },
    {
        "id": "TEST-212843",
        "module": "Checkout Payments",
        "title": "Verify checkout transactions with expired coupon code parameters",
        "description": "Validates that payment checkouts gracefully reject expired coupon codes and recalculate standard shopping cart invoices.",
        "steps": "1. Load shopping cart with items.\n2. Apply coupon code 'EXPIRED-50'.\n3. Submit invoice calculation request.\n4. Verify discount is 0 and validation error displays.",
        "expectedResults": "System identifies expired coupons and outputs standard billing pricing.",
        "playwrightTag": "@checkout-validation",
        "scriptPath": "tests/checkout.spec.ts"
    },
    {
        "id": "TEST-212844",
        "module": "Auth Security",
        "title": "Verify user session lockouts after consecutive invalid password attempts",
        "description": "Validates that customer accounts lock securely after 5 failed authentication entries to prevent brute-force attacks.",
        "steps": "1. Submit login request with invalid credentials.\n2. Repeat until count equals 5.\n3. Attempt authentic login with correct password.\n4. Verify page shows Account Locked warning.",
        "expectedResults": "System restricts login attempts and tags account status as locked.",
        "playwrightTag": "@auth-lockout",
        "scriptPath": "tests/auth.spec.ts"
    }
]

def run_ingestion():
    if not MONGO_URI:
        print("[RAG Ingestion] Error: MONGO_URI is missing in .env.")
        return
        
    print(f"[RAG Ingestion] Connecting to MongoDB Atlas online...")
    client = MongoClient(MONGO_URI)
    db = client["ApexDecisionDB"]
    collection = db["testcases"]
    
    # Clean previous seeds if any to ensure fresh seed
    collection.delete_many({})
    print("[RAG Ingestion] Cleared previous collection records.")
    
    print(f"[RAG Ingestion] Vectorizing & seeding {len(SEED_TEST_CASES)} e-commerce test cases...")
    
    for case in SEED_TEST_CASES:
        # Create consolidated representation of text for rich semantics
        text_representation = f"ID: {case['id']} | Module: {case['module']} | Title: {case['title']} | Description: {case['description']} | Steps: {case['steps']} | Expected: {case['expectedResults']}"
        
        try:
            print(f" --> Vectorizing: {case['id']} - {case['title']}...")
            embedding = get_embedding(text_representation)
            
            # Save complete document with 1024-dimension vector embedding
            document = {
                **case,
                "embedding": embedding
            }
            collection.insert_one(document)
            
        except Exception as e:
            print(f"Failed to ingest case {case['id']}: {e}")
            
    print("\n[RAG Ingestion] Ingestion pipeline successfully completed!")
    print(f"[RAG Ingestion] Seeded {collection.count_documents({})} documents into 'ApexDecisionDB.testcases' collection.")
    client.close()

if __name__ == "__main__":
    run_ingestion()
