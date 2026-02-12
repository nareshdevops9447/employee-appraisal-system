import requests
import logging

logger = logging.getLogger(__name__)

GRAPH_API_URL = 'https://graph.microsoft.com/v1.0'

class GraphClient:
    """Client for Microsoft Graph API."""
    
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
