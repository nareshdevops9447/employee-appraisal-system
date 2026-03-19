"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Send, Eye, Loader2, CheckCircle2, Save, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    useManagerReviews,
    useUpsertManagerGoalReview,
    useUpsertAppraisalReview,
    useSubmitManagerReview
} from "@/hooks/use-manager-reviews";
import { useAppraisalSelfAssessments } from "@/hooks/use-self-assessments";
import { useCycleAttributeTemplates, useEmployeeAttributeRatings, useRateEmployeeAttribute } from "@/hooks/use-attribute-templates";
import type { Appraisal, GoalForAssessment } from "@/types/appraisal";

const RatingGuide = () => (
    <div className="space-y-2 p-1">
        <h4 className="font-medium text-sm border-b pb-1 mb-2">Rating Scale Guide</h4>
        <div className="grid grid-cols-[30px_1fr] gap-x-2 gap-y-1 text-xs">
            <span className="font-bold text-red-600">1.0</span>
            <span className="text-muted-foreground">Needs Improvement / Unsatisfactory</span>
            
            <span className="font-bold text-amber-600">2.0</span>
            <span className="text-muted-foreground">Developing / Below Expectations</span>
            
            <span className="font-bold text-blue-600">3.0</span>
            <span className="text-muted-foreground">Meets Expectations / Satisfactory</span>
            
            <span className="font-bold text-green-600">4.0</span>
            <span className="text-muted-foreground">Exceeds Expectations / Above Average</span>
            
            <span className="font-bold text-emerald-600">5.0</span>
            <span className="text-muted-foreground">Outstanding / Exceptional</span>
        </div>
        <p className="text-[10px] italic text-muted-foreground mt-2 pt-1 border-t">
            * Precision decimals (e.g. 3.75) are supported.
        </p>
    </div>
);

interface ManagerReviewFormProps {
    appraisal: Appraisal;
    goals: GoalForAssessment[];
    readOnly?: boolean;
}

export function ManagerReviewForm({ appraisal, goals, readOnly = false }: ManagerReviewFormProps) {
    // Fetch employee self assessments (for viewing)
    const { data: selfAssessments, isLoading: loadingSelf } = useAppraisalSelfAssessments(appraisal.id);
    const { data: attrTemplates, isLoading: loadingAttrTemplates } = useCycleAttributeTemplates(appraisal.cycle_id);
    const { data: attrRatings, isLoading: loadingAttrRatings } = useEmployeeAttributeRatings(appraisal.employee_id, appraisal.cycle_id);

    // Fetch manager drafts
    const { data: managerReviews, isLoading: loadingManager } = useManagerReviews(appraisal.id);

    // Mutations
    const upsertGoalReview = useUpsertManagerGoalReview();
    const upsertAppraisalReview = useUpsertAppraisalReview();
    const rateAttribute = useRateEmployeeAttribute();
    const submitReview = useSubmitManagerReview();

    // Local state
    const [goalRatings, setGoalRatings] = useState<Record<string, { rating: number; comment: string }>>({});
    const [attrRatingsState, setAttrRatingsState] = useState<Record<string, { rating: number; comment: string }>>({});

    const [overallRating, setOverallRating] = useState<number>(0);
    const [overallFeedback, setOverallFeedback] = useState("");
    const [strengths, setStrengths] = useState("");
    const [developmentAreas, setDevelopmentAreas] = useState("");

    const [step, setStep] = useState(1);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    // Initialize local state from remote drafts
    useEffect(() => {
        if (managerReviews && goals) {
            const drafts = managerReviews.goal_reviews || [];
            const initGoals: Record<string, { rating: number; comment: string }> = {};
            for (const goal of goals) {
                const draft = drafts.find(d => d.goal_id === goal.id);
                initGoals[goal.id] = {
                    rating: draft?.manager_rating || 0,
                    comment: draft?.manager_comment || ""
                };
            }
            setGoalRatings(initGoals);

            if (managerReviews.overall_review) {
                setOverallRating(managerReviews.overall_review.overall_rating || 0);
                setOverallFeedback(managerReviews.overall_review.overall_comment || "");
                setStrengths(managerReviews.overall_review.strengths || "");
                setDevelopmentAreas(managerReviews.overall_review.development_areas || "");
            }
        }
    }, [managerReviews, goals]);

    useEffect(() => {
        if (attrTemplates && attrRatings) {
            const initAttrs: Record<string, { rating: number; comment: string }> = {};
            for (const template of attrTemplates) {
                const draft = attrRatings.find(r => r.attribute_template_id === template.id);
                initAttrs[template.id] = {
                    rating: draft?.manager_rating || 0,
                    comment: draft?.manager_comment || ""
                };
            }
            setAttrRatingsState(initAttrs);
        }
    }, [attrTemplates, attrRatings]);

    // Auto-calculate overall rating based on Goal Average and Attribute Average
    useEffect(() => {
        if (readOnly) return;

        const goalVals = Object.values(goalRatings).map(r => r.rating).filter(v => v > 0);
        const attrVals = Object.values(attrRatingsState).map(r => r.rating).filter(v => v > 0);

        let goalAvg = 0;
        if (goalVals.length > 0) {
            goalAvg = goalVals.reduce((sum, v) => sum + v, 0) / goalVals.length;
        }

        let attrAvg = 0;
        if (attrVals.length > 0) {
            attrAvg = attrVals.reduce((sum, v) => sum + v, 0) / attrVals.length;
        }

        let newOverall = 0;
        if (goalAvg > 0 && attrAvg > 0) {
            newOverall = (goalAvg + attrAvg) / 2;
        } else if (goalAvg > 0) {
            newOverall = goalAvg;
        } else if (attrAvg > 0) {
            newOverall = attrAvg;
        }

        if (newOverall > 0) {
            setOverallRating(Math.round(newOverall * 100) / 100);
        }
    }, [goalRatings, attrRatingsState, readOnly]);

    // Update helpers
    const updateGoalRating = useCallback((goalId: string, field: "rating" | "comment", value: number | string) => {
        let finalValue = value;
        if (field === "rating") {
            const num = typeof value === "string" ? parseFloat(value) : value;
            if (num > 5) {
                finalValue = 5;
                toast.error("Rating cannot exceed 5.0");
            }
        }
        setGoalRatings(prev => ({ ...prev, [goalId]: { ...prev[goalId], [field]: finalValue } }));
    }, []);

    const updateAttrRating = useCallback((templateId: string, field: "rating" | "comment", value: number | string) => {
        let finalValue = value;
        if (field === "rating") {
            const num = typeof value === "string" ? parseFloat(value) : value;
            if (num > 5) {
                finalValue = 5;
                toast.error("Rating cannot exceed 5.0");
            }
        }
        setAttrRatingsState(prev => ({ ...prev, [templateId]: { ...prev[templateId], [field]: finalValue } }));
    }, []);

    // Save Handlers
    const handleSaveGoal = useCallback((goalId: string) => {
        const data = goalRatings[goalId];
        if (!data || data.rating === 0 || !data.comment.trim()) return;
        upsertGoalReview.mutate({
            appraisal_id: appraisal.id,
            goal_id: goalId,
            manager_rating: data.rating,
            manager_comment: data.comment
        }, { onSuccess: () => setLastSaved(new Date().toLocaleTimeString()) });
    }, [upsertGoalReview, appraisal.id, goalRatings]);

    const handleSaveAttr = useCallback((templateId: string) => {
        const data = attrRatingsState[templateId];
        if (!data || data.rating === 0 || !data.comment.trim()) return;
        rateAttribute.mutate({
            attribute_template_id: templateId,
            employee_id: appraisal.employee_id,
            cycle_id: appraisal.cycle_id,
            manager_rating: data.rating,
            manager_comment: data.comment
        }, { onSuccess: () => setLastSaved(new Date().toLocaleTimeString()) });
    }, [rateAttribute, appraisal, attrRatingsState]);

    const handleSaveOverall = useCallback(() => {
        upsertAppraisalReview.mutate({
            appraisal_id: appraisal.id,
            overall_rating: overallRating || undefined,
            overall_comment: overallFeedback || undefined,
            strengths: strengths || undefined,
            development_areas: developmentAreas || undefined
        }, { onSuccess: () => setLastSaved(new Date().toLocaleTimeString()) });
    }, [upsertAppraisalReview, appraisal.id, overallRating, overallFeedback, strengths, developmentAreas]);

    const handleSaveAllDrafts = useCallback(() => {
        for (const goal of goals) handleSaveGoal(goal.id);
        if (attrTemplates) {
            for (const template of attrTemplates) handleSaveAttr(template.id);
        }
        handleSaveOverall();
    }, [handleSaveGoal, goals, handleSaveAttr, attrTemplates, handleSaveOverall]);

    if (loadingSelf || loadingManager || loadingAttrTemplates || loadingAttrRatings) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const performanceGoals = goals.filter((g: any) => g.goal_type === 'performance');
    const allGoalsRated = performanceGoals.every((g: any) => (goalRatings[g.id]?.rating ?? 0) > 0 && (goalRatings[g.id]?.comment ?? "").trim().length > 0);
    const allAttrsRated = (attrTemplates || []).every(t => (attrRatingsState[t.id]?.rating ?? 0) > 0 && (attrRatingsState[t.id]?.comment ?? "").trim().length > 0);
    const isOverallReady = overallRating > 0 && overallFeedback.trim().length > 0;

    const isReadyToSubmit = allGoalsRated && allAttrsRated && isOverallReady;

    const handleSubmit = () => {
        if (!isReadyToSubmit) return;
        handleSaveAllDrafts();
        submitReview.mutate(appraisal.id);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">{readOnly ? "Manager Review Summary" : "Manager Review"}</h3>
                    <p className="text-sm text-muted-foreground">
                        {readOnly ? "Review the final manager assessment and feedback." : "Review the employee's self-assessment, then provide your own ratings and feedback."}
                    </p>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-3">
                        {lastSaved && <span className="text-xs text-muted-foreground">Draft saved: {lastSaved}</span>}
                        <Button variant="outline" size="sm" onClick={handleSaveAllDrafts} disabled={upsertGoalReview.isPending || upsertAppraisalReview.isPending || rateAttribute.isPending}>
                            {upsertGoalReview.isPending || upsertAppraisalReview.isPending || rateAttribute.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : <Save className="h-4 w-4 mr-2" />}
                            Save Drafts
                        </Button>
                    </div>
                )}
            </div>

            {/* Stepper Header */}
            <div className="flex justify-between items-center mb-8 px-2 relative">
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted -z-10" />
                {[1, 2, 3].map((s) => (
                    <button 
                        key={s} 
                        type="button"
                        onClick={() => setStep(s)}
                        className="flex flex-col items-center gap-2 bg-card px-2 cursor-pointer transition-opacity hover:opacity-80"
                    >
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                            step === s ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background" : 
                            step > s ? "bg-primary text-primary-foreground opacity-70" : "bg-muted text-muted-foreground"
                        )}>
                            {s}
                        </div>
                        <span className={cn(
                            "text-xs font-medium flex items-center gap-1",
                            step === s ? "text-primary" : "text-muted-foreground"
                        )}>
                            {s === 1 ? 'Performance Goals' : s === 2 ? 'Behavioral Attributes' : 'Overall Review'}
                            {s === 1 && allGoalsRated && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {s === 2 && allAttrsRated && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {s === 3 && isOverallReady && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        </span>
                    </button>
                ))}
            </div>

            <div className="min-h-[300px]">
                {/* STEP 1: GOALS TAB */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {performanceGoals.map((goal) => {
                        const selfAssessment = selfAssessments?.find(sa => sa.goal_id === goal.id);
                        const mgrData = goalRatings[goal.id] || { rating: 0, comment: "" };

                        return (
                            <Card key={goal.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base">{goal.title}</CardTitle>
                                            {goal.weight && <Badge variant="secondary" className="mt-1">Weight: {goal.weight}%</Badge>}
                                        </div>
                                    </div>
                                    {goal.description && <CardDescription className="mt-2 text-sm text-foreground">{goal.description}</CardDescription>}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Employee Self-Rating Read-Only */}
                                    {selfAssessment ? (
                                        <div className="rounded-lg bg-muted/50 p-4 space-y-2 border">
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                <Eye className="h-4 w-4" />
                                                Employee Self-Assessment
                                            </div>
                                            <div className="flex gap-1 text-amber-500">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} className={`h-4 w-4 ${star <= (selfAssessment.employee_rating || 0) ? "fill-amber-500" : "text-gray-300"}`} />
                                                ))}
                                                <span className="text-xs text-muted-foreground ml-2">({selfAssessment.employee_rating || "NR"}/5)</span>
                                            </div>
                                            {selfAssessment.employee_comment && (
                                                <div className="text-sm bg-background p-3 rounded border text-muted-foreground italic">
                                                    "{selfAssessment.employee_comment}"
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic p-2 border rounded">
                                            Employee did not provide a self-assessment for this goal.
                                        </div>
                                    )}

                                    {/* Manager Rating Input */}
                                    <div className="pt-2">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium">Your Rating (1-5) <span className="text-red-500">*</span></label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full p-0">
                                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent side="right" className="w-64">
                                                    <RatingGuide />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2">
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.01"
                                                    value={mgrData.rating > 0 ? mgrData.rating : ""}
                                                    onChange={(e) => !readOnly && updateGoalRating(goal.id, "rating", parseFloat(e.target.value) || 0)}
                                                    readOnly={readOnly}
                                                    disabled={readOnly}
                                                    placeholder="e.g. 3.85"
                                                    className="w-32"
                                                />
                                                <span className="text-sm text-muted-foreground">out of 5</span>
                                            </div>
                                            {!readOnly && (
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    Rate from 1 (Low) to 5 (High). Decimals allowed (e.g., 4.5).
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Manager Comment Input */}
                                    <div>
                                        <label className="text-sm font-medium">{readOnly ? "Manager Feedback" : "Your Feedback"} {!readOnly && <span className="text-red-500">*</span>}</label>
                                        <Textarea
                                            placeholder="Provide evidence and feedback on this goal's achievement..."
                                            value={mgrData.comment}
                                            onChange={(e) => updateGoalRating(goal.id, "comment", e.target.value)}
                                            onBlur={() => handleSaveGoal(goal.id)}
                                            className="mt-1"
                                            rows={2}
                                            readOnly={readOnly}
                                            disabled={readOnly}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    </div>
                )}

                {/* STEP 2: ATTRIBUTES TAB */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {attrTemplates?.map((template) => {
                        const employeeRatingObj = attrRatings?.find(r => r.attribute_template_id === template.id);
                        const mgrData = attrRatingsState[template.id] || { rating: 0, comment: "" };

                        return (
                            <Card key={template.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base">{template.title}</CardTitle>
                                    </div>
                                    {template.description && <CardDescription className="mt-2 text-sm text-foreground">{template.description}</CardDescription>}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Employee Self-Rating Read-Only */}
                                    {employeeRatingObj?.self_rating ? (
                                        <div className="rounded-lg bg-muted/50 p-4 space-y-2 border">
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                <Eye className="h-4 w-4" />
                                                Employee Self-Assessment
                                            </div>
                                            <div className="flex gap-1 text-amber-500">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} className={`h-4 w-4 ${star <= (employeeRatingObj.self_rating || 0) ? "fill-amber-500" : "text-gray-300"}`} />
                                                ))}
                                                <span className="text-xs text-muted-foreground ml-2">({employeeRatingObj.self_rating || "NR"}/5)</span>
                                            </div>
                                            {employeeRatingObj.self_comment && (
                                                <div className="text-sm bg-background p-3 rounded border text-muted-foreground italic">
                                                    "{employeeRatingObj.self_comment}"
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic p-2 border rounded">
                                            Employee did not provide a self-assessment for this attribute.
                                        </div>
                                    )}

                                    {/* Manager Rating Input */}
                                    <div className="pt-2">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium">Your Rating (1-5) <span className="text-red-500">*</span></label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full p-0">
                                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent side="right" className="w-64">
                                                    <RatingGuide />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2">
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.01"
                                                    value={mgrData.rating > 0 ? mgrData.rating : ""}
                                                    onChange={(e) => !readOnly && updateAttrRating(template.id, "rating", parseFloat(e.target.value) || 0)}
                                                    readOnly={readOnly}
                                                    disabled={readOnly}
                                                    placeholder="e.g. 4.2"
                                                    className="w-32"
                                                />
                                                <span className="text-sm text-muted-foreground">out of 5</span>
                                            </div>
                                            {!readOnly && (
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    Rate from 1 (Low) to 5 (High). Decimals allowed (e.g., 4.5).
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Manager Comment Input */}
                                    <div>
                                        <label className="text-sm font-medium">{readOnly ? "Manager Feedback" : "Your Feedback"} {!readOnly && <span className="text-red-500">*</span>}</label>
                                        <Textarea
                                            placeholder="Provide specific behavioral examples..."
                                            value={mgrData.comment}
                                            onChange={(e) => updateAttrRating(template.id, "comment", e.target.value)}
                                            onBlur={() => handleSaveAttr(template.id)}
                                            className="mt-1"
                                            rows={2}
                                            readOnly={readOnly}
                                            disabled={readOnly}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    </div>
                )}

                {/* STEP 3: OVERALL TAB */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Overall Manager Review</CardTitle>
                            <CardDescription>Summarize the employee's performance for this cycle.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium">{readOnly ? "Overall Rating" : "Overall Rating (Auto-calculated average)"} {!readOnly && <span className="text-red-500">*</span>}</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full p-0">
                                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent side="right" className="w-64">
                                            <RatingGuide />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex flex-col gap-1 mt-2">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min="1"
                                            max="5"
                                            step="0.01"
                                            value={overallRating > 0 ? overallRating : ""}
                                            onChange={(e) => !readOnly && setOverallRating(parseFloat(e.target.value) || 0)}
                                            readOnly={readOnly}
                                            disabled={readOnly}
                                            placeholder="e.g. 3.5"
                                            className="w-32 text-lg font-semibold"
                                        />
                                        <span className="text-sm text-muted-foreground">out of 5</span>
                                    </div>
                                    {!readOnly && (
                                        <span className="text-xs text-muted-foreground mt-1">
                                            Rate from 1 (Low) to 5 (High). Decimals allowed (e.g., 4.5).
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium">{readOnly ? "Summary Feedback" : "Summary Feedback"} {!readOnly && <span className="text-red-500">*</span>}</label>
                                <Textarea
                                    placeholder="Provide a general summary of performance..."
                                    value={overallFeedback}
                                    onChange={(e) => setOverallFeedback(e.target.value)}
                                    onBlur={handleSaveOverall}
                                    className="mt-1"
                                    rows={3}
                                    readOnly={readOnly}
                                    disabled={readOnly}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Key Strengths</label>
                                    <Textarea
                                        placeholder="What did the employee excel in?"
                                        value={strengths}
                                        onChange={(e) => setStrengths(e.target.value)}
                                        onBlur={handleSaveOverall}
                                        className="mt-1"
                                        rows={3}
                                        readOnly={readOnly}
                                        disabled={readOnly}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Development Areas</label>
                                    <Textarea
                                        placeholder="What should the employee focus on improving?"
                                        value={developmentAreas}
                                        onChange={(e) => setDevelopmentAreas(e.target.value)}
                                        onBlur={handleSaveOverall}
                                        className="mt-1"
                                        rows={3}
                                        readOnly={readOnly}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    </div>
                )}
            </div>

            {/* Common Navigation Block */}
            <div className="flex flex-col gap-4 border-t border-border pt-4 mt-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                                Previous
                            </Button>
                        )}
                        {step < 3 && (
                            <Button onClick={() => setStep(s => s + 1)}>
                                Next Step
                            </Button>
                        )}
                    </div>
                    
                    {!readOnly && step === 3 && (
                        <div className="flex items-center justify-end gap-3">
                            {!showConfirm ? (
                                <Button disabled={!isReadyToSubmit} onClick={() => setShowConfirm(true)} size="lg">
                                    <Send className="mr-2 h-4 w-4" />
                                    Finalize Manager Review
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2 p-3 border rounded-lg bg-red-50">
                                    <span className="text-sm text-destructive font-medium">
                                        This finalizes the review and sends it to the employee for acknowledgement.
                                    </span>
                                    <Button
                                        variant="destructive"
                                        onClick={handleSubmit}
                                        disabled={submitReview.isPending}
                                    >
                                        {submitReview.isPending ? "Submitting..." : "Confirm Submit"}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setShowConfirm(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!readOnly && step === 3 && !isReadyToSubmit && (
                    <p className="text-sm text-amber-600 text-right">
                        You must rate and comment on all Goals and Attributes, and provide an Overall Rating/Feedback.
                    </p>
                )}
            </div>
        </div>
    );
}