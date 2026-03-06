"""
Microsoft Graph API client for Azure AD.
Migrated from auth-service/utils/graph_client.py.
"""
import requests
import logging
import base64

logger = logging.getLogger(__name__)

GRAPH_API_URL = 'https://graph.microsoft.com/v1.0'


class GraphClient:
    """Client for Microsoft Graph API."""

    @staticmethod
    def get_me(token):
        """Fetch the current user's profile, including department."""
        if not token:
            return None

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }

        try:
            response = requests.get(
                f'{GRAPH_API_URL}/me?$select=id,displayName,mail,userPrincipalName,department,jobTitle',
                headers=headers, timeout=5,
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    'azure_oid': data.get('id'),
                    'email': data.get('mail') or data.get('userPrincipalName'),
                    'display_name': data.get('displayName'),
                    'department': data.get('department'),
                    'job_title': data.get('jobTitle'),
                }
            else:
                logger.warning(f"Graph API Error fetching profile: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Exception calling Graph API for profile: {e}")
            return None

    @staticmethod
    def get_user_manager(token):
        """Fetch the manager of the user identified by the token."""
        if not token:
            return None

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }

        try:
            response = requests.get(f'{GRAPH_API_URL}/me/manager', headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    'azure_oid': data.get('id'),
                    'email': data.get('mail') or data.get('userPrincipalName'),
                    'display_name': data.get('displayName'),
                }
            elif response.status_code == 404:
                logger.info("User does not have a manager assigned in Azure AD.")
                return None
            else:
                logger.warning(f"Graph API Error fetching manager: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Exception calling Graph API: {e}")
            return None

    @staticmethod
    def get_direct_reports(token):
        """Fetch direct reports for the current user."""
        if not token:
            return []

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }

        try:
            url = f'{GRAPH_API_URL}/me/directReports?$select=id,displayName,mail,userPrincipalName,jobTitle,department'
            response = requests.get(url, headers=headers, timeout=5)

            if response.status_code == 200:
                data = response.json()
                reports = []
                for item in data.get('value', []):
                    reports.append({
                        'azure_oid': item.get('id'),
                        'department': item.get('department'),
                        'display_name': item.get('displayName'),
                        'email': item.get('mail') or item.get('userPrincipalName'),
                        'job_title': item.get('jobTitle'),
                    })
                return reports
            elif response.status_code == 404:
                return []
            else:
                logger.warning(f"Graph API Error fetching direct reports: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Exception calling Graph API for reports: {e}")
            return []

    @staticmethod
    def get_user_photo(token):
        """Fetch the user's profile photo from Graph API."""
        if not token:
            return None

        headers = {'Authorization': f'Bearer {token}'}

        try:
            response = requests.get(f'{GRAPH_API_URL}/me/photo/$value', headers=headers, timeout=5)
            if response.status_code == 200:
                image_data = base64.b64encode(response.content).decode('utf-8')
                content_type = response.headers.get('Content-Type', 'image/jpeg')
                return f"data:{content_type};base64,{image_data}"
            elif response.status_code == 404:
                return None
            else:
                logger.warning(f"Graph API Error fetching photo: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Exception calling Graph API for photo: {e}")
            return None
