import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000"

async def run_tests():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("--- Starting Plan Navigator API Tests ---")

        # 1. Health Check
        try:
            health = await client.get("/health")
            print(f"[OK] Health Check: {health.json()}")
        except Exception as e:
            print(f"[FAIL] Health Check failed: {e}. Is the server running?")
            return

        # 2. Auth Flow
        test_user = {"email": "test_suite@example.com", "password": "Password123!"}
        
        # Attempt registration (ignore failure if user exists)
        await client.post("/api/auth/register", json=test_user)
        
        # Login
        login_resp = await client.post("/api/auth/login", json=test_user)
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token")
            print("[OK] Auth: Login successful.")
            
            # Test 'Me' endpoint (Verifies JWT and the dependency fix)
            me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            if me_resp.status_code == 200:
                print(f"[OK] Auth Me: Verified for {me_resp.json().get('email')}")
            else:
                print(f"[FAIL] Auth Me: {me_resp.status_code} - {me_resp.text}")
        else:
            print(f"[FAIL] Auth Login: {login_resp.status_code}")

        # 3. Plan Data (using sample ID)
        # Using a sample ID to verify the placeholder/db route is active
        plan_id = "PLAN_2026_0001"
        plan_resp = await client.get(f"/api/plans/{plan_id}/health-tests")
        if plan_resp.status_code == 200:
            print(f"[OK] Plan {plan_id} Health Tests: Data retrieved successfully.")
        else:
            print(f"[INFO] Plan {plan_id} Health Tests: {plan_resp.status_code} (Database setup pending)")

        print("--- Tests Completed ---")

if __name__ == "__main__":
    asyncio.run(run_tests())