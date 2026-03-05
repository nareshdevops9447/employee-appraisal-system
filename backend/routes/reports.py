"""Reporting routes — analytics and statistics for HR dashboards."""
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file

from sqlalchemy import func, case, cast, Float

from extensions import db
from models.appraisal import Appraisal
from models.appraisal_cycle import AppraisalCycle
from models.goal import Goal
from models.user_profile import UserProfile
from models.department import Department
from utils.decorators import require_auth, require_role

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/cycle-completion', methods=['GET'])
@require_role('hr_admin', 'super_admin')
def cycle_completion():
    """Completion stats for a cycle (or latest active cycle)."""
    cycle_id = request.args.get('cycle_id')
    if not cycle_id:
        active = AppraisalCycle.query.filter_by(status='active') \
            .order_by(AppraisalCycle.created_at.desc()).first()
        if active:
            cycle_id = active.id

    if not cycle_id:
        return jsonify({'total': 0, 'completed': 0, 'in_progress': 0, 'not_started': 0, 'completion_rate': 0})

    # Get counts for cycle completion
    rows = db.session.query(Appraisal.status, func.count(Appraisal.id)) \
        .filter(Appraisal.cycle_id == cycle_id) \
        .group_by(Appraisal.status).all()

    counts = {s: c for s, c in rows}
    total = sum(counts.values())
    completed = counts.get('completed', 0)
    not_started = counts.get('not_started', 0)
    in_progress = total - completed - not_started

    # Get average rating for completed appraisals in this cycle
    avg_rating_query = db.session.query(func.avg(cast(Appraisal.overall_rating, Float))) \
        .filter(Appraisal.cycle_id == cycle_id, Appraisal.status == 'completed') \
        .scalar()

    avg_rating = round(float(avg_rating_query), 1) if avg_rating_query else 0.0

    return jsonify({
        'total': total,
        'completed': completed,
        'in_progress': in_progress,
        'not_started': not_started,
        'completion_rate': round(completed / total * 100) if total else 0,
        'average_rating': avg_rating
    })


@reports_bp.route('/rating-distribution', methods=['GET'])
@require_role('hr_admin', 'super_admin')
def rating_distribution():
    """Distribution of overall_rating values for a cycle."""
    cycle_id = request.args.get('cycle_id')
    query = db.session.query(
        Appraisal.overall_rating, func.count(Appraisal.id)
    ).filter(
        Appraisal.overall_rating.isnot(None),
        Appraisal.status == 'completed',
    )
    if cycle_id:
        query = query.filter(Appraisal.cycle_id == cycle_id)

    rows = query.group_by(Appraisal.overall_rating) \
        .order_by(Appraisal.overall_rating).all()

    # Ensure all ratings 1-5 are represented
    dist = {i: 0 for i in range(1, 6)}
    for rating, count in rows:
        if rating in dist:
            dist[rating] = count

    return jsonify([{'rating': r, 'count': c} for r, c in sorted(dist.items())])


@reports_bp.route('/goal-stats', methods=['GET'])
@require_role('hr_admin', 'super_admin')
def goal_stats():
    """Goal status breakdown (active, completed, overdue, etc.)."""
    rows = db.session.query(Goal.status, func.count(Goal.id)) \
        .group_by(Goal.status).all()

    return jsonify([{'status': s or 'active', 'count': c} for s, c in rows])


@reports_bp.route('/department-stats', methods=['GET'])
@require_role('hr_admin', 'super_admin')
def department_stats():
    """Average rating and completion rate per department."""
    cycle_id = request.args.get('cycle_id')

    query = db.session.query(
        Department.name,
        func.avg(cast(Appraisal.overall_rating, Float)),
        func.count(Appraisal.id),
        func.sum(case((Appraisal.status == 'completed', 1), else_=0)),
    ).join(
        UserProfile, UserProfile.id == Appraisal.employee_id
    ).join(
        Department, Department.id == UserProfile.department_id
    )

    if cycle_id:
        query = query.filter(Appraisal.cycle_id == cycle_id)

    rows = query.group_by(Department.name).all()

    result = []
    for dept_name, avg_rating, total, completed in rows:
        result.append({
            'department': dept_name,
            'avg_rating': round(float(avg_rating or 0), 1),
            'completion_rate': round(int(completed) / total * 100) if total else 0,
        })

    return jsonify(result)


@reports_bp.route('/appraisal-trends', methods=['GET'])
@require_role('hr_admin', 'super_admin')
def appraisal_trends():
    """Monthly breakdown of appraisal statuses for the current year."""
    rows = db.session.query(
        func.date_trunc('month', Appraisal.created_at).label('month'),
        func.sum(case((Appraisal.status == 'not_started', 1), else_=0)),
        func.sum(case((Appraisal.status.in_([
            'goals_pending_approval', 'goals_approved',
            'self_assessment_in_progress', 'manager_review',
            'calibration', 'acknowledgement_pending',
        ]), 1), else_=0)),
        func.sum(case((Appraisal.status == 'completed', 1), else_=0)),
    ).group_by('month').order_by('month').all()

    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    result = []
    for month_dt, not_started, in_progress, completed in rows:
        if month_dt:
            result.append({
                'date': month_names[month_dt.month - 1],
                'not_started': int(not_started or 0),
                'in_progress': int(in_progress or 0),
                'completed': int(completed or 0),
            })

    return jsonify(result)


@reports_bp.route('/distribution-compliance', methods=['GET'])
@require_role('hr_admin', 'super_admin')
def distribution_compliance():
    """Compare actual rating distribution against a target forced distribution.

    Target distribution defaults: 1→5%, 2→15%, 3→50%, 4→25%, 5→5%
    Can be overridden via query params: target_1, target_2, ..., target_5 (sum must equal 100).
    """
    cycle_id = request.args.get('cycle_id')

    targets = {
        1: float(request.args.get('target_1', 5)),
        2: float(request.args.get('target_2', 15)),
        3: float(request.args.get('target_3', 50)),
        4: float(request.args.get('target_4', 25)),
        5: float(request.args.get('target_5', 5)),
    }

    query = db.session.query(
        Appraisal.overall_rating, func.count(Appraisal.id)
    ).filter(
        Appraisal.overall_rating.isnot(None),
        Appraisal.status == 'completed',
    )
    if cycle_id:
        query = query.filter(Appraisal.cycle_id == cycle_id)

    rows = query.group_by(Appraisal.overall_rating).all()

    counts = {i: 0 for i in range(1, 6)}
    for rating, count in rows:
        rating_key = int(round(float(rating)))
        if rating_key in counts:
            counts[rating_key] += count

    total = sum(counts.values())

    result = []
    for rating in range(1, 6):
        count = counts[rating]
        actual_pct = round(count / total * 100, 1) if total else 0
        target_pct = targets[rating]
        result.append({
            'rating': rating,
            'count': count,
            'actual_pct': actual_pct,
            'target_pct': target_pct,
            'variance_pct': round(actual_pct - target_pct, 1),
        })

    return jsonify({'total': total, 'distribution': result})


@reports_bp.route('/export/appraisals', methods=['GET'])
@require_role('hr_admin', 'super_admin')
def export_appraisals():
    """Export all appraisals for a cycle as an Excel (.xlsx) file."""
    import openpyxl
    from openpyxl.styles import Font
    from models.appraisal_review import AppraisalReview

    cycle_id = request.args.get('cycle_id')

    query = db.session.query(
        Appraisal,
        UserProfile,
        AppraisalCycle,
    ).join(
        UserProfile, UserProfile.id == Appraisal.employee_id
    ).join(
        AppraisalCycle, AppraisalCycle.id == Appraisal.cycle_id
    )

    if cycle_id:
        query = query.filter(Appraisal.cycle_id == cycle_id)

    rows = query.order_by(Appraisal.created_at.desc()).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Appraisals"

    headers = [
        'Employee Name', 'Employee Email', 'Department',
        'Cycle Name', 'Cycle Type',
        'Status', 'Self Submitted', 'Manager Submitted',
        'Overall Rating', 'Calculated Rating',
        'Goals Avg', 'Attributes Avg',
        'Is Dispute', 'Employee Comments',
        'Acknowledged At', 'Manager Review Submitted At',
    ]
    ws.append(headers)

    for cell in ws[1]:
        cell.font = Font(bold=True)

    review_map = {}
    for r in AppraisalReview.query.all():
        review_map[r.appraisal_id] = r

    for appraisal, employee, cycle in rows:
        review = review_map.get(appraisal.id)
        emp_name = f'{employee.first_name} {employee.last_name}'.strip() or employee.email
        dept_name = ''
        if hasattr(employee, 'department') and employee.department:
            dept_name = employee.department.name
        ws.append([
            emp_name,
            employee.email,
            dept_name,
            cycle.name,
            cycle.cycle_type,
            appraisal.status,
            'Yes' if appraisal.self_submitted else 'No',
            'Yes' if appraisal.manager_submitted else 'No',
            review.overall_rating if review else '',
            review.calculated_rating if review else '',
            review.goals_avg_rating if review else '',
            review.attributes_avg_rating if review else '',
            'Yes' if appraisal.is_dispute else 'No',
            appraisal.employee_comments or '',
            appraisal.employee_acknowledgement_date.strftime('%Y-%m-%d') if appraisal.employee_acknowledgement_date else '',
            appraisal.manager_assessment_submitted_at.strftime('%Y-%m-%d') if appraisal.manager_assessment_submitted_at else '',
        ])

    for col in ws.columns:
        max_len = max((len(str(cell.value or '')) for cell in col), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 50)

    out = BytesIO()
    wb.save(out)
    out.seek(0)

    cycle_suffix = f'_cycle_{cycle_id}' if cycle_id else ''
    filename = f'appraisals_export{cycle_suffix}.xlsx'

    return send_file(
        out,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename,
    )
