import requests

def test(port):
    base_url = f"http://127.0.0.1:{port}"
    print(f"  [TEST] Testing sql-vs-nosql-in-nestjs on port {port}")
    
    # Flow 1: Write
    res = requests.post(f"{base_url}/compare/write", json={"title": "Order #1", "amount": 100}, timeout=10)
    if res.status_code not in (200, 201):
        return False, f"Flow 1 failed: status={res.status_code}"
    
    # Flow 2: Read
    res = requests.get(f"{base_url}/compare/read", timeout=10)
    if res.status_code != 200:
        return False, f"Flow 2 failed: status={res.status_code}"
    data = res.json()
    if data.get("sqlCount") != 1 or data.get("noSqlCount") != 1:
        return False, f"Flow 2 validation failed: counts sql={data.get('sqlCount')} nosql={data.get('noSqlCount')}"
        
    # Flow 4: Timings
    res = requests.get(f"{base_url}/compare/timings", timeout=10)
    if res.status_code != 200:
        return False, f"Flow 4 failed: status={res.status_code}"
        
    # Flow 5: Delete
    res = requests.delete(f"{base_url}/compare/all", timeout=10)
    if res.status_code != 200:
        return False, f"Flow 5 failed: status={res.status_code}"
        
    return True, "All flows passed."
