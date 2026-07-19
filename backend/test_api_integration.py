import requests
import json
import os

BASE_URL = "http://localhost:8000/v1"

def test_integration():
    print("=== Step 1: Performing Login ===")
    login_payload = {
        "email": "admin@discoveryos.io",
        "password": "admin"
    }
    r = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200, "Login failed!"
    login_data = r.json()
    token = login_data["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in successfully as {login_data['user']['name']}.")
    
    print("\n=== Step 2: Listing Workspaces ===")
    r = requests.get(f"{BASE_URL}/workspaces", headers=headers)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200, "Workspaces query failed!"
    workspaces = r.json()["data"]
    workspace_id = workspaces[0]["id"]
    print(f"Found workspace: {workspaces[0]['name']} (ID: {workspace_id})")
    
    print("\n=== Step 3: Ingesting Research Document ===")
    doc_path = "../test_document.txt"
    if not os.path.exists(doc_path):
        # Create a temp test file
        with open(doc_path, "w") as f:
            f.write("We believe product price is set correctly at $49/mo.\n")
            f.write("However, customer surveys indicate pricing is too high.\n")
            
    with open(doc_path, "rb") as f:
        files = {"file": (os.path.basename(doc_path), f, "text/plain")}
        r = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/documents/ingest", files=files, headers=headers)
        
    print(f"Status: {r.status_code}")
    assert r.status_code == 200, "Ingestion upload failed!"
    ingest_result = r.json()
    print("Ingestion Response:", json.dumps(ingest_result, indent=2))
    
    print("\n=== Step 4: Querying Claims ===")
    r = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/claims", headers=headers)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200
    claims = r.json()["data"]
    print(f"Extracted Claims Count: {len(claims)}")
    for c in claims[:3]:
        print(f"- Claim: '{c.get('content')}' type={c.get('type')} confidence={c.get('confidence')}")

    print("\n=== Step 5: Querying Discoveries ===")
    r = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/discoveries", headers=headers)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200
    discoveries = r.json()["data"]
    print(f"Active Discoveries Count: {len(discoveries)}")
    for d in discoveries[:3]:
        print(f"- Discovery: [{d.get('type')}] {d.get('description')} (Severity: {d.get('severity')})")
        
    print("\n=== Step 8: Querying Claim History ===")
    # Let's first create a claim so it has a known ID
    claim_payload = {
      "content": "Enterprise customers require single sign-on (SSO) auth",
      "type": "assumption"
    }
    r = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/claims", json=claim_payload, headers=headers)
    assert r.status_code == 201
    claim_id = r.json()["id"]
    
    # Get history for the newly created claim
    r = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/claims/{claim_id}/history", headers=headers)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200
    history = r.json()["data"]
    print(f"History Entries: {len(history)}")

    print("\n=== INTEGRATION TEST PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    test_integration()

