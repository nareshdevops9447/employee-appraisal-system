"""Quick test of activate_cycle endpoint."""
import sys
sys.path.insert(0, '/app')

from app import app

with app.app_context():
    from models.appraisal_cycle import AppraisalCycle
    from extensions import db

    cycles = AppraisalCycle.query.all()
    for c in cycles:
        print(f'Cycle: id={c.id}, name={c.name}, type={c.cycle_type}, status={c.status}')

    if not cycles:
        print('No cycles found!')
        sys.exit(0)

    cycle = cycles[0]
    print(f'\nTesting activation of cycle: {cycle.name} ({cycle.id})')

    # Simulate what activate_cycle does
    try:
        existing_active = AppraisalCycle.query.filter(
            AppraisalCycle.status == 'active',
            AppraisalCycle.cycle_type == cycle.cycle_type,
            AppraisalCycle.id != cycle.id,
        ).first()

        if existing_active:
            print(f'CONFLICT: {existing_active.name} is already active')
        else:
            print('No conflict, activation would proceed')

            # Try to actually activate
            cycle.status = 'active'
            db.session.commit()
            print(f'SUCCESS: Cycle {cycle.name} is now active')

            # Try create appraisals
            from routes.cycles import _create_appraisals_for_active_users
            _create_appraisals_for_active_users(cycle.id)
            print('Appraisals created successfully')

    except Exception as e:
        import traceback
        print(f'ERROR: {e}')
        traceback.print_exc()
