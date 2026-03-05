"""
Department routes — CRUD for departments.
Migrated from user-service/routes/departments.py.
"""
from flask import Blueprint, request, jsonify

from extensions import db
from models.department import Department
from utils.decorators import require_auth, require_role

departments_bp = Blueprint('departments', __name__)


@departments_bp.route('/', methods=['GET'])
@require_auth
def list_departments():
    """List all departments."""
    departments = Department.query.order_by(Department.name).all()
    return jsonify([d.to_dict() for d in departments])


@departments_bp.route('/', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def create_department():
    """Create a new department. HR admin only."""
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Department name is required'}), 400

    if Department.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Department already exists'}), 409

    dept = Department(
        name=data['name'],
        description=data.get('description'),
        head_id=data.get('head_id'),
    )
    db.session.add(dept)
    db.session.commit()
    return jsonify(dept.to_dict()), 201


@departments_bp.route('/<id>', methods=['PUT'])
@require_role('hr_admin', 'super_admin')
def update_department(id):
    """Update a department. HR admin only."""
    dept = Department.query.get_or_404(id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'name' in data:
        dept.name = data['name']
    if 'description' in data:
        dept.description = data['description']
    if 'head_id' in data:
        dept.head_id = data['head_id']

    db.session.commit()
    return jsonify(dept.to_dict())


@departments_bp.route('/<id>', methods=['DELETE'])
@require_role('hr_admin', 'super_admin')
def delete_department(id):
    """Delete a department. HR admin only."""
    dept = Department.query.get_or_404(id)
    db.session.delete(dept)
    db.session.commit()
    return jsonify({'message': 'Department deleted'}), 200
