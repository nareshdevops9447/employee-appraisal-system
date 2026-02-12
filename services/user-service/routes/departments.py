from flask import Blueprint, jsonify, request
import uuid
from extensions import db
from models.department import Department

departments_bp = Blueprint('departments', __name__, url_prefix='/api/departments')

@departments_bp.route('', methods=['GET'])
def list_departments():
    """List all departments."""
    departments = Department.query.order_by(Department.name).all()
    return jsonify([d.to_dict() for d in departments])

@departments_bp.route('', methods=['POST'])
def create_department():
    """Create a new department."""
    # TODO: RBAC check
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': 'Name is required'}), 400

    if Department.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Department already exists'}), 409

    dept = Department(
        id=str(uuid.uuid4()),
        name=data['name'],
        description=data.get('description'),
        head_id=data.get('head_id')
    )

    db.session.add(dept)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify(dept.to_dict()), 201

@departments_bp.route('/<string:dept_id>', methods=['GET'])
def get_department(dept_id):
    dept = Department.query.get(dept_id)
    if not dept:
        return jsonify({'error': 'Department not found'}), 404
    return jsonify(dept.to_dict())
