from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from extensions import db
from models.goal import Goal
from models.key_result import KeyResult

key_results_bp = Blueprint('key_results', __name__)

def update_goal_progress(goal_id):
    goal = Goal.query.get(goal_id)
    if not goal or not goal.key_results:
        return
        
    # Simple average or weighted? User asked for weighted, but didn't specify weights.
    # We'll do equal weight for now.
    total = len(goal.key_results)
    if total == 0: return
    
    sum_progress = 0
    for kr in goal.key_results:
        # Calculate completion % for this KR
        if kr.target_value == 0: continue
        p = (kr.current_value / kr.target_value) * 100
        p = min(100, max(0, p)) # Clamp 0-100
        sum_progress += p
        
    avg = int(sum_progress / total)
    goal.progress_percentage = avg
    
    # Auto-complete goal?
    if avg == 100 and goal.status == 'active':
        goal.status = 'completed'
        goal.completed_date = datetime.now(timezone.utc).date()
        
    db.session.commit()

@key_results_bp.route('/<goal_id>/key-results', methods=['POST'])
def add_key_result(goal_id):
    goal = Goal.query.get_or_404(goal_id)
    data = request.get_json()
    
    kr = KeyResult(
        goal_id=goal.id,
        title=data['title'],
        target_value=data['target_value'],
        unit=data.get('unit', 'percentage'),
        due_date=datetime.fromisoformat(data['due_date']).date() if data.get('due_date') else goal.target_date
    )
    db.session.add(kr)
    db.session.commit()
    
    update_goal_progress(goal.id)
    
    return jsonify(kr.to_dict()), 201

@key_results_bp.route('/<goal_id>/key-results/<kr_id>', methods=['PUT'])
def update_key_result(goal_id, kr_id):
    kr = KeyResult.query.get_or_404(kr_id)
    data = request.get_json()
    
    if 'current_value' in data:
        kr.current_value = data['current_value']
    
    if 'status' in data:
        kr.status = data['status']
        
    db.session.commit()
    
    # Recalculate goal progress
    update_goal_progress(kr.goal_id)
    
    return jsonify(kr.to_dict())
