from app import create_app
from extensions import db
from models.goal import Goal
from models.appraisal_cycle import AppraisalCycle
from models.goal_template import GoalTemplate

app = create_app()

with app.app_context():
    print("Fixing existing performance goals...")
    cycles = AppraisalCycle.query.all()
    
    updated = 0
    for cycle in cycles:
        templates_count = GoalTemplate.query.filter_by(cycle_id=cycle.id, is_active=True).count()
        default_weight = round(100.0 / templates_count) if templates_count > 0 else 0
        
        goals = Goal.query.filter_by(appraisal_cycle_id=cycle.id, goal_type='performance', approval_status='draft').all()
        for goal in goals:
            target_weight = default_weight if goal.weight == 0 else goal.weight
            
            # Update dates and weight
            goal.weight = target_weight
            if not goal.start_date:
                goal.start_date = cycle.start_date
            if not goal.target_date:
                goal.target_date = cycle.end_date
                
            updated += 1
            
    db.session.commit()
    print(f"Successfully updated {updated} existing goals with correct dates and weights.")
