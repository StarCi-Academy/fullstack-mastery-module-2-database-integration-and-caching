import requests

def test(port):
    base_url = f"http://127.0.0.1:{port}"
    print(f"  [TEST] Testing mongoose-and-mongodb on port {port}")
    
    # Flow 1: Create Cat (needs age)
    res = requests.post(f"{base_url}/cats", json={"name": "Mimi", "age": 2, "breed": "Tabby", "hobbies": ["fishing"]}, timeout=10)
    if res.status_code not in (200, 201):
        return False, f"Flow 1 failed: status={res.status_code}, content={res.text}"
        
    return True, "All flows passed."
