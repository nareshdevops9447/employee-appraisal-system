import requests
import logging
import base64

logger = logging.getLogger(__name__)

GRAPH_API_URL = 'https://graph.microsoft.com/v1.0'

class GraphClient:
    """Client for Microsoft Graph API."""

    @staticmethod
    def get_me(token):
        """
        Fetch the current user's profile, including department.
        """
        if not token:
            return None

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        try:
            # Fetch department and other basic info
            response = requests.get(f'{GRAPH_API_URL}/me?$select=id,displayName,mail,userPrincipalName,department,jobTitle', headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'azure_oid': data.get('id'),
                    'email': data.get('mail') or data.get('userPrincipalName'),
                    'display_name': data.get('displayName'),
                    'department': data.get('department'),
                    'job_title': data.get('jobTitle')
                }
            else:
                logger.warning(f"Graph API Error fetching profile: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception calling Graph API for profile: {e}")
            return None
    
    @staticmethod
    def get_user_manager(token):
        """
        Fetch the manager of the user identified by the token.
        
        Args:
           token (str): The access token (from frontend/Azure) to use for the request.
                        Must have User.Read.All or similar permissions if calling /users/{id}/manager,
                        OR just User.Read if calling /me/manager.
        
        Returns:
            dict: Manager's details (id, displayName, mail) or None if not found/error.
        """
        if not token:
            return None
            
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        try:
            # We use /me/manager which typically requires User.Read (and maybe User.ReadBasic.All for full details)
            # If the token is on behalf of the user, /me refers to that user.
            response = requests.get(f'{GRAPH_API_URL}/me/manager', headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'azure_oid': data.get('id'),
                    'email': data.get('mail') or data.get('userPrincipalName'),
                    'display_name': data.get('displayName')
                }
            elif response.status_code == 404:
                logger.info("User does not have a manager assigned in Azure AD.")
                return None
            else:
                logger.warning(f"Graph API Error fetching manager: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Exception calling Graph API: {e}")
            return None

    @staticmethod
    def get_direct_reports(token):
        """
        Fetch direct reports for the current user.
        
        Args:
            token (str): Access token for Graph API.
            
        Returns:
            list: List of dicts containing report details (oid, email, name, job, dept).
        """
        if not token:
            return []
            
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        try:
            # Select specific fields to keep payload light
            # Note: jobTitle and department might need User.Read.All or similar if not standard profile
            url = f'{GRAPH_API_URL}/me/directReports?$select=id,displayName,mail,userPrincipalName,jobTitle,department'
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                reports = []
                for item in data.get('value', []):
                    logger.info(f"Report Raw Item: {item.get('displayName')} - Dept: {item.get('department')}")
                    reports.append({
                        'azure_oid': item.get('id'),
                        'department': item.get('department'),
                        'display_name': item.get('displayName'),
                        'email': item.get('mail') or item.get('userPrincipalName'),
                        'job_title': item.get('jobTitle'),
                    })
                return reports
            elif response.status_code == 404:
                # No direct reports found or endpoint not available
                return []
            else:
                logger.warning(f"Graph API Error fetching direct reports: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Exception calling Graph API for reports: {e}")
            return []

    @staticmethod
    def get_user_photo(token):
        """
        Fetch the user's profile photo from Graph API.
        
        Args:
            token (str): Access token.
            
        Returns:
            str: Base64 encoded image string (e.g. "data:image/jpeg;base64,...") or None.
        """
        if not token:
            return None
            
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        try:
            # Get the binary photo content
            # /me/photo/$value returns the binary data directly
            response = requests.get(f'{GRAPH_API_URL}/me/photo/$value', headers=headers, timeout=5)
            
            if response.status_code == 200:
                # Convert to base64
                image_data = base64.b64encode(response.content).decode('utf-8')
                content_type = response.headers.get('Content-Type', 'image/jpeg')
                return f"data:{content_type};base64,{image_data}"
            elif response.status_code == 404:
                # User has no photo set
                return None
            else:
                logger.warning(f"Graph API Error fetching photo: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Exception calling Graph API for photo: {e}")
            return None
