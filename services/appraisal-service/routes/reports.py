from flask import Blueprint, jsonify
from extensions import db
from models.appraisal import Appraisal
from sqlalchemy import func

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/cycle/<cycle_id>/summary', methods=['GET'])
def cycle_summary(cycle_id):
    # Count appraisals by status
    # SELECT status, count(*) FROM appraisals WHERE cycle_id = ... GROUP BY status
    
    stats = db.session.query(Appraisal.status, func.count(Appraisal.id))\
        .filter(Appraisal.cycle_id == cycle_id)\
        .group_by(Appraisal.status).all()
        
    total = sum(count for _, count in stats)
    result = {status: count for status, count in stats}
    result['total'] = total
    
    return jsonify(result)
