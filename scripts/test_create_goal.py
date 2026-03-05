import requests

# Alice (HR) token
res = requests.post('http://localhost:5000/api/auth/login', json={'email': 'alice.smith@example.com', 'password': 'password'})
token = res.json()['access_token']

print("Token generated")

# Test creating a goal
goal_data = {
    "employee_id": "bob-johnson-id-001",
    "title": "Test Goal for Bob",
    "category": "performance", 
    "priority": "medium",
    "start_date": "2026-03-01T00:00:00.000Z",
    "target_date": "2026-12-31T00:00:00.000Z",
    "key_results": [{"title": "test", "target_value": 100, "unit": "%"}]
}

r = requests.post(
    'http://localhost:5000/api/goals/', 
    json=goal_data, 
    headers={'Authorization': f'Bearer {token}'}
)
print(r.status_code)
print(r.text)
