import requests

def test(port):
    base_url = f"http://127.0.0.1:{port}"
    print(f"  [TEST] Testing typeorm-and-postgresql on port {port}")
    
    # Create a cat with passport, toys, and owners
    cat_payload = {
        "name": "Kitty",
        "passport": {
            "passportNumber": "PASS-123"
        },
        "toys": [
            { "name": "Ball" }
        ],
        "owners": [
            { "name": "Alice" }
        ]
    }
    
    # Flow 1: Create Cat
    res = requests.post(f"{base_url}/cats", json=cat_payload, timeout=10)
    if res.status_code not in (200, 201):
        return False, f"Flow 1 (Create Cat) failed: status={res.status_code}, content={res.text}"
    cat_id = res.json().get("id")
    if not cat_id:
        return False, f"Flow 1 failed to return an ID: content={res.text}"
        
    # Flow 2: Add Toy to Cat
    res = requests.post(f"{base_url}/cats/{cat_id}/toys", json={"name": "Mouse"}, timeout=10)
    if res.status_code not in (200, 201):
        return False, f"Flow 2 (Add Toy) failed: status={res.status_code}, content={res.text}"
        
    # Flow 3: Get Cat details with relations
    res = requests.get(f"{base_url}/cats/{cat_id}/with-relations", timeout=10)
    if res.status_code != 200:
        return False, f"Flow 3 (Get Cat with Relations) failed: status={res.status_code}, content={res.text}"
        
    return True, "All flows passed."
