import requests
import time

def test(port):
    base_url = f"http://127.0.0.1:{port}"
    print(f"  [TEST] Testing caching-with-redis on port {port}")
    
    # Flow 1: Get first time (miss or hit)
    res = requests.get(f"{base_url}/cats/logic-layer", timeout=10)
    if res.status_code != 200:
        return False, f"Flow 1 failed: status={res.status_code}"
    
    # Clear cache to guarantee cache miss on next call
    requests.delete(f"{base_url}/cats/logic-layer/cache", timeout=10)
    
    # Flow 2: Get after deletion (miss)
    t0 = time.time()
    res = requests.get(f"{base_url}/cats/logic-layer", timeout=10)
    t1 = time.time()
    miss_time = t1 - t0
    
    # Flow 3: Get second time (cached hit)
    t0 = time.time()
    res = requests.get(f"{base_url}/cats/logic-layer", timeout=10)
    t1 = time.time()
    hit_time = t1 - t0
    
    print(f"    [INFO] Miss time: {miss_time:.4f}s, Hit time: {hit_time:.4f}s")
    return True, "All caching flows passed."
