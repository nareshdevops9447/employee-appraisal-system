import requests
from flask import current_app

def get_appraisal_url():
    """Get the appraisal service URL from config."""
    return current_app.config.get('APPRAISAL_SERVICE_URL', 'http://appraisal-service:5003')

def sync_appraisal_status(employee_id, cycle_id):
    """
    Trigger appraisal status sync for a given employee and cycle.
    
    1. Lookup the appraisal ID from appraisal-service using employee_id and cycle_id.
    2. Call the sync-goals webhook on that appraisal.
    """
    if not employee_id or not cycle_id:
        return
        
    base_url = get_appraisal_url()
    
    # 1. Look up appraisal ID
    # We use the list endpoint with filters
    try:
        # Internal request context (service-to-service)
        headers = {
            'X-User-Id': 'system',
            'X-User-Role': 'super_admin'  # Use admin role to ensure visibility
        }
        
        lookup_url = f"{base_url}/api/appraisals"
        params = {
            'employee_id': employee_id,
            'cycle_id': cycle_id,
        }
        
        resp = requests.get(lookup_url, params=params, headers=headers, timeout=5)
        if resp.status_code != 200:
            current_app.logger.warning(f"Failed to lookup appraisal: {resp.status_code} {resp.text}")
            return
            
        appraisals = resp.json()
        if not appraisals or not isinstance(appraisals, list):
            # No appraisal found, nothing to sync yet
            return
            
        appraisal_id = appraisals[0].get('id')
        if not appraisal_id:
            return
            
        # 2. Trigger sync
        sync_url = f"{base_url}/api/appraisals/{appraisal_id}/sync-goals"
        # We don't verify goals here, just trigger the recalc
        sync_resp = requests.post(sync_url, json={'goals': None}, headers=headers, timeout=5)
        
        if sync_resp.status_code == 200:
            current_app.logger.info(f"Successfully synced appraisal {appraisal_id} for employee {employee_id}")
        else:
            current_app.logger.warning(f"Failed to sync appraisal {appraisal_id}: {sync_resp.status_code}")
            
    except Exception as e:
        current_app.logger.error(f"Error calling appraisal-service: {str(e)}")
