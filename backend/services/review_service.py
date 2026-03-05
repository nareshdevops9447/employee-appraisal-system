"""Review Service — core logic for calculating weighted appraisal scores."""
from decimal import Decimal
from extensions import db
from models.appraisal import Appraisal
from models.goal import Goal
from models.employee_attribute import EmployeeAttribute
from models.peer_feedback import PeerFeedback

class ReviewService:
    @staticmethod
    def calculate_scores(appraisal_id):
        """
        Calculate weighted goal, attribute, and peer feedback averages for an appraisal.

        Weights are read from the appraisal's cycle (goals_weight / attributes_weight /
        peer_feedback_weight).  Defaults to 70/30/0 if the cycle is not loaded or
        values are missing.

        If peer_feedback_weight > 0 but no submitted peer feedbacks exist, the peer
        weight is redistributed proportionally to goals and attributes.

        Formula:
        - Goal Score (weighted): Sum(rating * weight) / Sum(weight)
        - Attribute Score: Avg(rating)
        - Peer Feedback Score: Avg(peer rating)
        - Combined Score: (Goal * G%) + (Attribute * A%) + (Peer * P%)
        """
        appraisal = Appraisal.query.get(appraisal_id)
        if not appraisal:
            return None

        # Read configurable weights from cycle; fall back to 70/30/0
        goals_w = 70
        attrs_w = 30
        peer_w = 0
        if appraisal.cycle:
            goals_w = appraisal.cycle.goals_weight or 70
            attrs_w = appraisal.cycle.attributes_weight or 30
            peer_w = getattr(appraisal.cycle, 'peer_feedback_weight', 0) or 0

        # 1. Calculate Performance Goals Average (Weighted)
        perf_goals = Goal.query.filter_by(
            employee_id=appraisal.employee_id,
            appraisal_cycle_id=appraisal.cycle_id,
            goal_type='performance'
        ).all()

        from models.manager_review import ManagerReview
        manager_reviews = ManagerReview.query.filter_by(appraisal_id=appraisal_id).all()
        manager_review_map = {r.goal_id: r for r in manager_reviews}

        total_rating = Decimal('0.00')
        perf_count = 0

        for goal in perf_goals:
            review = manager_review_map.get(goal.id)
            if review and review.manager_rating is not None:
                total_rating += Decimal(str(review.manager_rating))
                perf_count += 1

        goal_score = Decimal('0.00')
        if perf_count > 0:
            goal_score = total_rating / Decimal(str(perf_count))

        # 2. Calculate Attribute Average
        attributes = EmployeeAttribute.query.filter_by(
            employee_id=appraisal.employee_id,
            cycle_id=appraisal.cycle_id
        ).all()

        total_attr_rating = Decimal('0.00')
        attr_count = 0

        for attr in attributes:
            if attr.manager_rating is not None:
                total_attr_rating += Decimal(str(attr.manager_rating))
                attr_count += 1

        attr_score = Decimal('0.00')
        if attr_count > 0:
            attr_score = total_attr_rating / Decimal(str(attr_count))

        # 3. Calculate Peer Feedback Average
        peer_feedbacks = PeerFeedback.query.filter_by(
            appraisal_id=appraisal_id,
        ).filter(PeerFeedback.status == 'submitted').all()

        total_peer_rating = Decimal('0.00')
        peer_count = 0

        for pf in peer_feedbacks:
            if pf.feedback and isinstance(pf.feedback, dict):
                rating = pf.feedback.get('rating')
                if rating is not None:
                    total_peer_rating += Decimal(str(rating))
                    peer_count += 1

        peer_score = Decimal('0.00')
        if peer_count > 0:
            peer_score = total_peer_rating / Decimal(str(peer_count))

        # 4. Calculate effective weights with fallback
        effective_goals_w = goals_w
        effective_attrs_w = attrs_w
        effective_peer_w = peer_w

        if peer_w > 0 and peer_count == 0:
            # No peer feedback submitted — redistribute peer weight proportionally
            base = goals_w + attrs_w
            if base > 0:
                ratio = Decimal('100') / Decimal(str(base))
                effective_goals_w = round(float(Decimal(str(goals_w)) * ratio))
                effective_attrs_w = 100 - effective_goals_w
            else:
                effective_goals_w = 70
                effective_attrs_w = 30
            effective_peer_w = 0

        # Normalise in case of misconfiguration
        total_w = effective_goals_w + effective_attrs_w + effective_peer_w
        if total_w != 100:
            effective_goals_w = round(effective_goals_w / total_w * 100)
            effective_attrs_w = round(effective_attrs_w / total_w * 100)
            effective_peer_w = 100 - effective_goals_w - effective_attrs_w

        goals_pct = Decimal(str(effective_goals_w)) / Decimal('100')
        attrs_pct = Decimal(str(effective_attrs_w)) / Decimal('100')
        peer_pct = Decimal(str(effective_peer_w)) / Decimal('100')

        # 5. Calculate Combined Score
        combined_score = (goal_score * goals_pct) + (attr_score * attrs_pct) + (peer_score * peer_pct)

        # 6. Save to AppraisalReview
        from models.appraisal_review import AppraisalReview
        overall_review = AppraisalReview.query.filter_by(appraisal_id=appraisal_id).first()

        if not overall_review:
             overall_review = AppraisalReview(appraisal_id=appraisal_id)
             db.session.add(overall_review)

        overall_review.goals_avg_rating = float(goal_score)
        overall_review.attributes_avg_rating = float(attr_score)
        overall_review.peer_feedback_avg_rating = float(peer_score) if peer_count > 0 else None
        overall_review.calculated_rating = float(combined_score)

        # Round to nearest integer for overall_rating only if not already set by manager
        if overall_review.overall_rating is None:
            overall_review.overall_rating = int(combined_score.quantize(Decimal('1'), rounding='ROUND_HALF_UP'))

        db.session.commit()

        return {
            'goals_avg': float(goal_score),
            'attributes_avg': float(attr_score),
            'peer_feedback_avg': float(peer_score) if peer_count > 0 else None,
            'peer_feedback_count': peer_count,
            'calculated': float(combined_score),
            'overall': overall_review.overall_rating,
            'weights': {
                'goals': effective_goals_w,
                'attributes': effective_attrs_w,
                'peer_feedback': effective_peer_w,
            },
        }
