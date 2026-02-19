import os
import requests

class HierarchyService:
    USER_SERVICE_URL = os.environ.get('USER_SERVICE_URL', 'http://user-service:5002')

    @staticmethod
    def get_user(user_id):
        try:
            response = requests.get(f"{HierarchyService.USER_SERVICE_URL}/users/{user_id}")
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error fetching user {user_id}: {e}")
        return None

    @staticmethod
    def is_manager_of(manager_id, employee_id):
        # This might require a specific endpoint in user-service
        # Or we fetch employee and check manager_id
        employee = HierarchyService.get_user(employee_id)
        if employee and employee.get('manager_id') == manager_id:
            return True
        return False
