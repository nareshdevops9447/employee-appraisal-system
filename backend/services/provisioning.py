"""
Service for auto-provisioning behavioral attributes from cycle templates.

Goals are NOT auto-provisioned. Managers assign goal templates to individual
team members via the /api/goals/push-templates-to-team endpoint.
"""
import logging
from extensions import db
from models.attribute_template import AttributeTemplate
from models.employee_attribute import EmployeeAttribute

logger = logging.getLogger(__name__)


def provision_appraisal_templates(appraisal):
    """Auto-provisions behavioral attributes from cycle templates.

    Goals are manager-driven — they are assigned via the Team Goals tab.
    Only behavioral attributes are auto-provisioned on cycle activation.
    """

    # Auto-provision Behavioral Attributes
    attr_templates = AttributeTemplate.query.filter_by(
        cycle_id=appraisal.cycle_id, is_active=True
    ).all()

    for at in attr_templates:
        existing_attr = EmployeeAttribute.query.filter_by(
            attribute_template_id=at.id,
            employee_id=appraisal.employee_id,
            cycle_id=appraisal.cycle_id,
        ).first()

        if not existing_attr:
            emp_attr = EmployeeAttribute(
                attribute_template_id=at.id,
                employee_id=appraisal.employee_id,
                cycle_id=appraisal.cycle_id,
            )
            db.session.add(emp_attr)

    logger.info(
        'Provisioned %d attributes for appraisal %s (Employee: %s). '
        'Goals will be assigned by the manager.',
        len(attr_templates), appraisal.id, appraisal.employee_id,
    )
