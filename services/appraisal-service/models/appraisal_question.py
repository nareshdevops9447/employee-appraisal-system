import uuid
from extensions import db

class AppraisalQuestion(db.Model):
    __tablename__ = 'appraisal_questions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cycle_id = db.Column(db.String(36), db.ForeignKey('appraisal_cycles.id'), nullable=False)
    
    question_text = db.Column(db.Text, nullable=False)
    # enum: 'rating', 'text', 'competency'
    question_type = db.Column(db.String(50), nullable=False, default='text')
    
    category = db.Column(db.String(100), nullable=True) # e.g. 'Performance', 'Values'
    order = db.Column(db.Integer, default=0)
    
    is_required = db.Column(db.Boolean, default=True)
    is_for_self = db.Column(db.Boolean, default=True)
    is_for_manager = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'category': self.category,
            'order': self.order,
            'is_required': self.is_required,
            'is_for_self': self.is_for_self,
            'is_for_manager': self.is_for_manager,
        }
