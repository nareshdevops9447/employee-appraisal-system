# Employee Appraisal System — Business Logic & Process Flow
### For HR Team Review & Validation

> **Purpose:** This document explains how the appraisal system works in plain language.
> Please review each section and confirm whether the logic matches your intended process.
> Mark any section with ✅ (correct) or ❌ (needs change) and add your comments.

---

## Table of Contents
1. [Who Can Do What (Roles)](#1-who-can-do-what-roles)
2. [Appraisal Cycle Setup](#2-appraisal-cycle-setup)
3. [Who Is Eligible for Appraisal](#3-who-is-eligible-for-appraisal)
4. [The Appraisal Journey (Step by Step)](#4-the-appraisal-journey-step-by-step)
5. [Goal Setting & Approval](#5-goal-setting--approval)
6. [Competency/Attribute Ratings](#6-competencyattribute-ratings)
7. [Peer Feedback](#7-peer-feedback)
8. [How the Final Score Is Calculated](#8-how-the-final-score-is-calculated)
9. [Calibration (Optional)](#9-calibration-optional)
10. [Employee Acknowledgement & Disputes](#10-employee-acknowledgement--disputes)
11. [Appeals (After Completion)](#11-appeals-after-completion)
12. [Probation Employees (Special Handling)](#12-probation-employees-special-handling)
13. [Mid-Year Reviews (Team Transfers)](#13-mid-year-reviews-team-transfers)
14. [Login & Access](#14-login--access)
15. [Summary of Key Rules](#15-summary-of-key-rules)

---

## 1. Who Can Do What (Roles)

The system has four roles. Each person sees only what they need.

| Role | What They Can Do |
|------|-----------------|
| **Employee** | Set their own goals, do self-assessment, rate themselves on competencies, acknowledge their final appraisal, raise appeals or disputes |
| **Manager** | Approve or reject team goals, review & rate team members, submit manager assessments, request peer feedback for their team |
| **HR Admin** | Create and manage appraisal cycles, set up competency templates, run calibration sessions, handle appeals, view all appraisals across the organisation |
| **Super Admin** | Everything HR Admin can do plus system-level settings and user management |

### Key Access Rules:
- An **employee** can only see their own appraisal
- A **manager** can see appraisals of their direct reports only
- **HR** can see all appraisals across the entire organisation
- A person's role can change — for example, if Azure AD shows someone now has direct reports, they automatically become a Manager

---

## 2. Appraisal Cycle Setup

An appraisal cycle is the time period during which appraisals happen (e.g., "Annual Review 2026").

### What HR Configures When Creating a Cycle:

| Setting | What It Means |
|---------|--------------|
| **Cycle Name** | e.g., "Annual Appraisal 2026" |
| **Cycle Type** | Annual, Probation, or Mid-Year |
| **Start & End Dates** | The period the cycle covers |
| **Self-Assessment Deadline** | Last date for employees to complete self-ratings |
| **Manager Review Deadline** | Last date for managers to submit their reviews |
| **Eligibility Cutoff Date** | Employees who joined AFTER this date are deferred to the probation cycle |
| **Minimum Service Months** | How many months someone must have worked to be eligible |
| **Include Probation Employees?** | Yes/No — should employees still on probation be included? |
| **Allow Prorated Evaluation?** | Yes/No — for employees who joined mid-cycle, should they get a prorated review? |
| **Requires Calibration?** | Yes/No — should there be an HR calibration step before the employee sees their rating? |
| **Score Weights** | How much each component counts toward the final score (must add up to 100%) |

### Score Weight Example:
```
Goals:         70%    ← how well they achieved their objectives
Competencies:  30%    ← how they demonstrated expected behaviours
Peer Feedback:  0%    ← not used this cycle
               ────
Total:        100%
```

### Important Rules:
- ⚠️ **Only ONE cycle of each type can be active at a time** (e.g., you cannot have two annual cycles running simultaneously)
- When HR activates an annual cycle, the system automatically creates a companion "Probation Goals" cycle for deferred employees

---

## 3. Who Is Eligible for Appraisal

When a cycle is activated, the system checks every active employee and decides if they qualify.

### For Annual Cycles — Eligibility Checklist:

```
Is the employee eligible?
│
├─ Have they completed their 3-month probation?
│   └─ NO → Deferred to Probation Cycle
│
├─ Does their probation end after the cycle ends?
│   └─ YES → Deferred to Probation Cycle
│
├─ Did they join AFTER the eligibility cutoff date?
│   └─ YES → Deferred to Probation Cycle
│
├─ Have they worked for the minimum required months?
│   └─ NO → Not Eligible (insufficient service)
│
├─ Are they still on probation AND the cycle excludes probation employees?
│   └─ YES → Not Eligible (probation excluded)
│
├─ Did they join after the cycle started AND prorated evaluation is disabled?
│   └─ YES → Not Eligible (proration not allowed)
│
├─ Did they join after the cycle started AND prorated evaluation IS allowed?
│   └─ YES → Eligible, but PRORATED ⚡
│
└─ None of the above?
    └─ ✅ Fully Eligible
```

### What Happens to Deferred Employees:
- They are NOT ignored — they are automatically placed into the **Probation Cycle** instead
- The system creates this probation cycle automatically when the annual cycle is activated

### What "Prorated" Means:
- The employee joined mid-cycle, so their evaluation period is shorter
- This flag is visible to HR and the manager for context
- The scores are still calculated the same way; it's informational

---

## 4. The Appraisal Journey (Step by Step)

Every appraisal moves through these stages in order. It cannot skip steps or go backwards (except for goals being revised).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  STAGE 1          STAGE 2            STAGE 3          STAGE 4              │
│  Goal Setting     Self-Assessment    Manager Review   Sign-Off             │
│                                                                             │
│  ┌──────────┐    ┌──────────────┐   ┌──────────────┐  ┌──────────────┐    │
│  │  Goals    │    │   Employee   │   │   Manager    │  │  Employee    │    │
│  │  Set &    │───▶│   Rates      │──▶│   Reviews &  │─▶│  Acknowledges│    │
│  │  Approved │    │   Themselves │   │   Rates      │  │  or Disputes │    │
│  └──────────┘    └──────────────┘   └──────┬───────┘  └──────────────┘    │
│                                            │                    │          │
│                                    (if calibration              │          │
│                                     is turned on)               ▼          │
│                                            │           ┌──────────────┐    │
│                                            ▼           │  COMPLETED   │    │
│                                     ┌────────────┐     │              │    │
│                                     │    HR      │────▶│  (can still  │    │
│                                     │ Calibrates │     │   appeal)    │    │
│                                     └────────────┘     └──────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Stage Breakdown:

#### Stage 1: Goal Setting
| What Happens | Who Does It |
|-------------|-------------|
| Performance goals are created (must be between **3 and 7**) | Employee or Manager |
| Goals are **automatically weighted equally** so they add up to **100%** | System |
| Goals are submitted for approval | Employee submits → Manager approves |
| Manager can approve or reject each goal | Manager |
| If rejected, employee revises and resubmits | Employee |
| All performance goals must be approved to move forward | — |
| Development goals can also be set (optional, max **3**) | Employee |

> 📌 **Development goals** are for learning/growth only. They do NOT count toward the final score and are not required to move forward.

#### Stage 2: Self-Assessment
| What Happens | Who Does It |
|-------------|-------------|
| Employee rates themselves on each goal (1–5 scale) | Employee |
| Employee rates themselves on each competency/attribute (1–5 scale) | Employee |
| Employee can add comments for each rating | Employee |
| Employee submits their self-assessment | Employee |
| Deadline is enforced (set by HR in the cycle) | System |

#### Stage 3: Manager Review
| What Happens | Who Does It |
|-------------|-------------|
| Manager sees employee's self-ratings and comments | Manager |
| Manager provides their own rating for each goal (1–5 scale) | Manager |
| Manager provides their own rating for each competency (1–5 scale) | Manager |
| Manager writes narrative: strengths, development areas, overall comments | Manager |
| Manager submits their assessment | Manager |
| System automatically calculates the final score | System |
| Deadline is enforced (set by HR in the cycle) | System |

#### Stage 3.5: Calibration (Only If Turned On)
| What Happens | Who Does It |
|-------------|-------------|
| After manager submits, the appraisal goes to HR instead of the employee | System |
| HR reviews the score across the organisation for fairness | HR |
| HR can adjust the overall rating (1–5) | HR |
| HR can add calibration notes | HR |
| HR approves and pushes to employee for acknowledgement | HR |

#### Stage 4: Employee Acknowledgement
| What Happens | Who Does It |
|-------------|-------------|
| Employee sees their final rating and all manager feedback | Employee |
| Employee acknowledges the appraisal | Employee |
| Employee can add comments | Employee |
| Employee can flag a **dispute** (disagree with the rating) | Employee |
| If disputed, the manager is notified | System |
| The appraisal is marked as **Completed** | System |

---

## 5. Goal Setting & Approval

### Goal Types

| Type | Count | Required? | Affects Score? |
|------|-------|-----------|---------------|
| **Performance** | Between **3 and 7** | Yes — cannot proceed without them | ✅ Yes — automatically weighted equally |
| **Development** | Up to **3** | No — completely optional | ❌ No — for personal growth only |

### Performance Goal Requirements:
- Each goal represents a portion of the total performance score based on how many goals there are.
- The system **automatically assigns an equal weight** to every performance goal.
- Example: If there are 4 goals, each is worth exactly 25% of the total goal score.

### How Goal Approval Works:

```
Employee creates goal
        │
        ▼
   ┌─────────┐
   │  Draft   │  ← Can still be edited freely
   └────┬─────┘
        │  Employee submits for approval
        ▼
  ┌─────────────────┐
  │ Pending Approval │  ← Waiting for manager
  └────┬──────┬──────┘
       │      │
   Approved  Rejected (with reason)
       │      │
       ▼      ▼
  ┌────────┐ ┌──────────┐
  │Approved│ │ Rejected │ ← Employee must revise
  └────────┘ └────┬─────┘
                  │  Employee revises & resubmits
                  ▼
            ┌─────────────────┐
            │ Pending Approval │  ← Back to manager
            └─────────────────┘
```

### Who Can Create Goals:
- **Employee** creates their own goals → submits to manager for approval
- **Manager** can create goals for their team member → employee is notified
- **HR** can create goals for any employee

### Audit Trail:
- Every time a goal is submitted or resubmitted, a **version record** is saved
- The system tracks who created, approved, or rejected each goal, and when

---

## 6. Competency/Attribute Ratings

Competencies (also called "Attributes") measure HOW an employee works, not just WHAT they achieve.

### How It Works:
1. **HR creates competency templates** for each cycle (up to **5** per cycle)
   - Example: "Communication", "Leadership", "Problem Solving", "Teamwork", "Innovation"
   - Can also be uploaded in bulk via Excel file
2. When an employee's appraisal is created, they automatically receive all the competencies for that cycle
3. **Employee rates themselves** on each competency (1–5 scale) with optional comments
4. **Manager rates the employee** on each competency (1–5 scale) with optional comments

### Scoring:
- The competency score = **average of all manager ratings**
- Example: Communication (4) + Leadership (3) + Problem Solving (5) + Teamwork (4) + Innovation (3) = **3.8 average**
- This average is then weighted according to the cycle configuration (e.g., 30% of the total)

---

## 7. Peer Feedback

Peer feedback allows colleagues to provide ratings and comments about an employee.

### How It Works:

| Step | Who | What Happens |
|------|-----|-------------|
| 1 | Employee, Manager, or HR | Requests feedback from a specific colleague |
| 2 | System | Sends the request to the colleague (status: **Pending**) |
| 3 | Colleague | Provides a rating (1–5) and optional comments |
| 4 | System | Marks feedback as **Submitted** |
| 5 | System | Includes the rating in score calculation (if peer weight > 0%) |

### Rules:
- An employee **cannot review themselves** (system prevents this)
- Only **one request per colleague** per appraisal (no duplicates)
- Once submitted, feedback **cannot be changed**
- A pending request can be **cancelled** by the employee, their manager, or HR
- Peer feedback is only used in the final score if the cycle has `peer_feedback_weight > 0%`

### Who Can See Peer Feedback:
- The reviewer (who wrote it)
- The employee being reviewed
- Their manager
- HR

---

## 8. How the Final Score Is Calculated

The final score is a weighted combination of three components.

### The Formula:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Final Score = (Goal Score × Goal Weight%)                     │
│               + (Competency Score × Competency Weight%)         │
│               + (Peer Score × Peer Weight%)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### How Each Component Is Calculated:

#### Goal Score (Simple Average of Manager Ratings)
```
For each performance goal:
    Manager gives a rating (1-5)

Goal Score = Sum of all manager ratings ÷ Number of performance goals
(This mathematically applies equal weighting to all goals so they sum to 100%)
```

**Example (with 5 goals = 20% weight each):**
| Goal | Manager Rating | Weight | Contribution |
|------|---------------|--------|-------------|
| Increase sales by 20% | 4 | 20% | 4 × 20 = 80 |
| Launch new product | 3 | 20% | 3 × 20 = 60 |
| Reduce costs by 10% | 5 | 20% | 5 × 20 = 100 |
| Improve team NPS | 4 | 20% | 4 × 20 = 80 |
| Complete training programme | 3 | 20% | 3 × 20 = 60 |
| **Total** | | **100%** | **380 ÷ 100 = 3.80** |

#### Competency Score (Simple Average)
```
Competency Score = Sum of all manager ratings ÷ Number of competencies
```

**Example:**
| Competency | Manager Rating |
|-----------|---------------|
| Communication | 4 |
| Leadership | 3 |
| Problem Solving | 5 |
| Teamwork | 4 |
| Innovation | 3 |
| **Average** | **3.8** |

#### Peer Feedback Score (Simple Average)
```
Peer Score = Sum of all peer ratings ÷ Number of peer reviews submitted
```

### Putting It All Together — Example:

| Component | Score | Weight | Contribution |
|-----------|-------|--------|-------------|
| Goals | 3.80 | 70% | 3.80 × 0.70 = **2.660** |
| Competencies | 3.80 | 30% | 3.80 × 0.30 = **1.140** |
| Peer Feedback | — | 0% | not used this cycle |
| **Final Score** | | | **3.800 → Rounded to 4** |

### Special Case — Peer Weight Exists but No One Submitted:

If the cycle says peer feedback is worth 20%, but no peers actually submitted feedback:
- The system **does NOT penalise** the employee
- Instead, it **redistributes** the peer weight proportionally to goals and competencies:

```
Original weights: Goals 60% + Competencies 20% + Peer 20%
No peer feedback → Redistributed: Goals 75% + Competencies 25% + Peer 0%

(The ratio between goals and competencies stays the same: 60:20 = 3:1 → 75:25 = 3:1)
```

---

## 9. Calibration (Optional)

Calibration is an **optional step** that HR can enable per cycle to ensure fairness across the organisation.

### When Is It Used?
- Only when HR sets `Requires Calibration = Yes` in the cycle settings
- It happens **after the manager submits** and **before the employee sees** the result

### What Happens:

```
Manager submits review
        │
        ▼  (instead of going to employee)
  ┌────────────┐
  │ Calibration │  ← HR reviews all ratings across departments
  │   Phase     │     to check for consistency and fairness
  └──────┬─────┘
         │
    HR can adjust the overall rating (1–5)
    HR can add calibration notes
         │
         ▼
  ┌──────────────────────┐
  │ Goes to Employee for │
  │ Acknowledgement      │
  └──────────────────────┘
```

### Key Points:
- HR can trigger calibration for **all appraisals at once** (bulk action)
- HR can **change the overall rating** (the number the employee sees)
- The original calculated score is still preserved in the system for reference
- Calibration notes are appended to the overall comments

---

## 10. Employee Acknowledgement & Disputes

### What Happens at the End:

After the manager (and optionally HR calibration) is done:

| Action | Details |
|--------|---------|
| Employee sees their final rating | All scores, manager comments, strengths, development areas |
| Employee must **acknowledge** | This confirms they have read the appraisal |
| Employee can add **comments** | Optional — any final thoughts |
| Employee can flag a **dispute** | Ticking "I disagree" — the manager is automatically notified |

### Important:
- **Acknowledging does NOT mean agreeing** — it means "I have read and received this"
- If the employee disputes, the system records it and notifies the manager
- The appraisal still moves to **Completed** after acknowledgement (even if disputed)
- After completion, the employee can still raise a formal **Appeal** (see next section)

---

## 11. Appeals (After Completion)

An appeal is a formal process for an employee to challenge their completed appraisal.

### How It Works:

```
Employee raises appeal (with written reason)
        │
        ▼
  ┌──────────┐
  │ Pending  │  ← HR receives the appeal
  └────┬─────┘
       │  HR picks it up
       ▼
  ┌──────────────┐
  │ Under Review │  ← HR investigates
  └────┬────┬────┘
       │    │
   Upheld  Overturned
       │    │
       ▼    ▼
  ┌────────┐ ┌────────────┐
  │Rating  │ │ Rating     │
  │stays   │ │ changed to │
  │same    │ │ new value  │
  └────────┘ └────────────┘
```

### Rules:
- Only the **employee** can raise an appeal
- Only on **completed** appraisals
- **One appeal per appraisal** (cannot appeal twice)
- Must provide a **written reason** (cannot be empty)
- If **overturned**, HR provides a new overall rating (1–5)
- The resolution and any changes are recorded in the appraisal comments

---

## 12. Probation Employees (Special Handling)

New employees who are still within their probation period get special treatment.

### The 3-Month Rule:
- Every new employee has a **mandatory 3-month probation period**
- During this time, they are NOT eligible for the annual appraisal cycle
- Instead, they are placed in a separate **Probation Cycle**

### Automatic Handling:

```
HR activates Annual Cycle (with eligibility cutoff date)
        │
        ├─── Employee joined before cutoff ──▶ ✅ Annual Cycle
        │
        └─── Employee joined after cutoff ───▶ ⏳ Probation Cycle
                                                  (created automatically)
```

### What HR Needs to Know:
- The system **automatically creates** the probation cycle when the annual cycle is activated
- It's called "Probation Goals — {Year}"
- It's linked to the parent annual cycle
- All deferred employees are automatically placed in it
- The probation cycle follows the same workflow (goals → self-assessment → manager review → acknowledgement)

---

## 13. Mid-Year Reviews (Team Transfers)

Mid-year cycles are specifically for employees who **changed teams** during a cycle period.

### How It Works:
- HR creates a mid-year cycle with a date range
- The system checks if the employee had a **team transfer** during that period
- If yes → they are eligible for the mid-year review
- If no transfer → they are NOT eligible

### Why This Exists:
- When someone moves to a new manager mid-cycle, neither the old nor new manager has a full picture
- The mid-year review gives the new manager a structured way to evaluate the transition

---

## 14. Login & Access

### Two Ways to Log In:

| Method | How It Works |
|--------|-------------|
| **Azure AD (SSO)** | Employees click "Sign in with Microsoft" — uses the company's Azure Active Directory. No separate password needed. |
| **Local Account** | Email and password (for users not on Azure AD) |

### Azure AD Special Behaviours:
- The system reads the employee's **role from Azure AD** (Super Admin, HR Admin, Manager, Employee)
- If Azure shows someone has **direct reports**, they're automatically set as a Manager
- Department, job title, and manager info are synced from Azure AD
- If someone **transfers teams**, it's recorded for mid-year review eligibility

### Security:
- **Local accounts**: After **5 failed login attempts**, the account is locked for **15 minutes**
- **Azure AD accounts**: Lockout is handled by Microsoft (not the app)

---

## 15. Summary of Key Rules

Please review each rule and confirm if it matches your intended process:

| # | Rule | Current Behaviour | ✅ or ❌ |
|---|------|------------------|---------|
| 1 | Performance goals required per employee | Between **3 and 7** | |
| 2 | Performance goal weights | **Automatically weighted equally** to 100% | |
| 3 | Development goals allowed | Up to **3** (optional, no score impact) | |
| 4 | Competency templates per cycle | Up to **5** | |
| 5 | Probation period | **3 months** mandatory before annual eligibility | |
| 6 | Default score weights | Goals **70%** + Competencies **30%** + Peer **0%** | |
| 7 | Peer feedback with no submissions | Weight redistributed (employee NOT penalised) | |
| 8 | Calibration | Optional per cycle, HR can override final rating | |
| 9 | Employee acknowledgement | Required, but does NOT mean agreement | |
| 10 | Disputes | Flagged during acknowledgement, manager notified | |
| 11 | Appeals | One per appraisal, post-completion only, HR decides | |
| 12 | Active cycles | Only ONE per type at any time | |
| 13 | Rating scale | **1 to 5** for all ratings (goals, competencies, peer) | |
| 14 | Account lockout | 5 failed attempts → 15-minute lock (local accounts) | |
| 15 | Self-reviews in peer feedback | **Not allowed** (system prevents it) | |
| 16 | Goal approval required by | **Manager** (or HR) | |
| 17 | Who can raise an appeal | **Employee only** | |
| 18 | Probation cycle creation | **Automatic** when annual is activated | |
| 19 | Manager auto-detection | Via Azure AD direct reports | |
| 20 | Deadlines enforced for | Self-assessment and Manager review | |

---

## How to Provide Your Feedback

For each section above, please note:

1. **Is the process correct?** Does it match what you expect to happen?
2. **Are the numbers right?** (5 goals, 3 dev goals, 5 competencies, 3-month probation, etc.)
3. **Are the weights right?** (default 70/30/0 split)
4. **Is anything missing?** Any step or rule that should exist but doesn't?
5. **Is anything wrong?** Any step that should work differently?

Please send your feedback with section numbers so we can address each point precisely.

---

*Document generated: March 2026*
*System version: EAS Monolith v1.0*
