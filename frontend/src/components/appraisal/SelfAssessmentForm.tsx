"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Send, Star, Loader2, CheckCircle2 } from "lucide-react";
import { useAppraisalSelfAssessments, useUpsertSelfAssessment, useSubmitSelfAssessment } from "@/hooks/use-self-assessments";
import { useCycleAttributeTemplates, useEmployeeAttributeRatings, useRateEmployeeAttribute } from "@/hooks/use-attribute-templates";
import type { Appraisal, GoalForAssessment } from "@/types/appraisal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SelfAssessmentFormProps {
    appraisal: Appraisal;
    goals: GoalForAssessment[];
}

export function SelfAssessmentForm({ appraisal, goals }: SelfAssessmentFormProps) {
    // --- Goal Assessments ---
    const { data: assessments, isLoading: loadingGoals } = useAppraisalSelfAssessments(appraisal.id);
    const selfSave = useUpsertSelfAssessment();
    const selfSubmit = useSubmitSelfAssessment();

    // --- Attribute Assessments ---
    const { data: attributeTemplates, isLoading: loadingTemplates } = useCycleAttributeTemplates(appraisal.cycle_id);
    const { data: attributeRatings, isLoading: loadingRatings } = useEmployeeAttributeRatings(appraisal.employee_id, appraisal.cycle_id);
    const rateAttribute = useRateEmployeeAttribute();

    // Local state for ratings
    const [goalRatings, setGoalRatings] = useState<Record<string, { rating: number; comment: string }>>({});
    const [attrRatings, setAttrRatings] = useState<Record<string, { rating: number; comment: string }>>({});

    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState("goals");

    // Initialize Goal state
    useEffect(() => {
        if (assessments && goals) {
            const init: Record<string, { rating: number; comment: string }> = {};
            for (const goal of goals) {
                init[goal.id] = { rating: 0, comment: "" };
            }
            for (const assessment of assessments) {
                if (init[assessment.goal_id]) {
                    init[assessment.goal_id] = {
                        rating: assessment.employee_rating || 0,
                        comment: assessment.employee_comment || "",
                    };
                }
            }
            setGoalRatings(init);
        }
    }, [assessments, goals]);

    // Initialize Attribute state
    useEffect(() => {
        if (attributeTemplates && attributeRatings) {
            const init: Record<string, { rating: number; comment: string }> = {};
            for (const template of attributeTemplates) {
                init[template.id] = { rating: 0, comment: "" };
            }
            for (const rating of attributeRatings) {
                if (init[rating.attribute_template_id]) {
                    init[rating.attribute_template_id] = {
                        rating: rating.self_rating || 0,
                        comment: rating.self_comment || "",
                    };
                }
            }
            setAttrRatings(init);
        }
    }, [attributeTemplates, attributeRatings]);

    const updateGoalRating = useCallback((goalId: string, field: "rating" | "comment", value: number | string) => {
        setGoalRatings((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
    }, []);

    const updateAttrRating = useCallback((templateId: string, field: "rating" | "comment", value: number | string) => {
        setAttrRatings((prev) => ({ ...prev, [templateId]: { ...prev[templateId], [field]: value } }));
    }, []);

    // Deadline warning
    const deadline = appraisal.self_assessment_deadline ? new Date(appraisal.self_assessment_deadline) : null;
    const isNearDeadline = deadline && (deadline.getTime() - Date.now()) / 86400000 < 3;

    // Save Handlers
    const handleSaveGoal = useCallback((goalId: string) => {
        const data = goalRatings[goalId];
        if (!data) return;
        selfSave.mutate({
            appraisal_id: appraisal.id,
            goal_id: goalId,
            employee_rating: data.rating,
            employee_comment: data.comment
        }, { onSuccess: () => setLastSaved(new Date().toLocaleTimeString()) });
    }, [selfSave, appraisal.id, goalRatings]);

    const handleSaveAttr = useCallback((templateId: string) => {
        const data = attrRatings[templateId];
        if (!data) return;
        rateAttribute.mutate({
            attribute_template_id: templateId,
            employee_id: appraisal.employee_id,
            cycle_id: appraisal.cycle_id,
            self_rating: data.rating,
            self_comment: data.comment
        }, { onSuccess: () => setLastSaved(new Date().toLocaleTimeString()) });
    }, [rateAttribute, appraisal, attrRatings]);

    const handleSaveAllDrafts = useCallback(() => {
        for (const goal of goals) handleSaveGoal(goal.id);
        if (attributeTemplates) {
            for (const template of attributeTemplates) handleSaveAttr(template.id);
        }
    }, [handleSaveGoal, goals, handleSaveAttr, attributeTemplates]);

    if (loadingGoals || loadingTemplates || loadingRatings) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const performanceGoals = goals.filter(g => g.goal_type === 'performance');
    const ratedGoalsCount = performanceGoals.filter(g => (goalRatings[g.id]?.rating ?? 0) > 0 && (goalRatings[g.id]?.comment ?? "").trim().length > 0).length;
    const ratedAttrsCount = (attributeTemplates || []).filter(t => (attrRatings[t.id]?.rating ?? 0) > 0 && (attrRatings[t.id]?.comment ?? "").trim().length > 0).length;
    const allGoalsRated = ratedGoalsCount === performanceGoals.length && performanceGoals.length > 0;
    const allAttrsRated = ratedAttrsCount === (attributeTemplates?.length || 0) && (attributeTemplates?.length || 0) > 0;
    const isReadyToSubmit = allGoalsRated && allAttrsRated;

    const handleSubmit = () => {
        if (!isReadyToSubmit) return;
        handleSaveAllDrafts();
        selfSubmit.mutate(appraisal.id);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Self Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                        Complete both your Goal Ratings and Behavioral Attributes. All sections are mandatory.
                    </p>
                </div>
                {deadline && <Badge variant={isNearDeadline ? "destructive" : "secondary"}>Deadline: {deadline.toLocaleDateString()}</Badge>}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="goals">
                        Performance Goals
                        {allGoalsRated && <CheckCircle2 className="w-4 h-4 ml-2 text-green-500" />}
                    </TabsTrigger>
                    <TabsTrigger value="attributes">
                        Behavioral Attributes
                        {allAttrsRated && <CheckCircle2 className="w-4 h-4 ml-2 text-green-500" />}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="goals" className="space-y-4">
                    {goals.map((goal) => {
                        const r = goalRatings[goal.id] || { rating: 0, comment: "" };
                        const isMandatory = goal.goal_type === 'performance';

                        return (
                            <Card key={goal.id} className={isMandatory ? "border-l-4 border-l-primary" : ""}>
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            {goal.title}
                                            {isMandatory && <Badge variant="outline" className="text-xs font-normal">Mandatory</Badge>}
                                        </CardTitle>
                                        {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleSaveGoal(goal.id)} disabled={selfSave.isPending}>
                                        <Save className="h-4 w-4 mr-1" /> Save
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Self Rating {isMandatory && <span className="text-destructive">*</span>}</label>
                                        <div className="flex gap-3 mt-1 items-center">
                                            <Input
                                                type="number"
                                                min="1"
                                                max="5"
                                                step="0.01"
                                                value={r.rating > 0 ? r.rating : ""}
                                                onChange={(e) => updateGoalRating(goal.id, "rating", parseFloat(e.target.value) || 0)}
                                                placeholder="e.g. 4.2"
                                                className="w-32"
                                            />
                                            <span className="text-sm text-muted-foreground">/ 5</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Comments {isMandatory && <span className="text-destructive">*</span>}</label>
                                        <Textarea
                                            placeholder="Describe your achievements, challenges, and learnings..."
                                            value={r.comment}
                                            onChange={(e) => updateGoalRating(goal.id, "comment", e.target.value)}
                                            className="mt-1" rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="attributes" className="space-y-4">
                    {attributeTemplates?.length === 0 ? (
                        <Card><CardContent className="p-6 text-center text-muted-foreground">No behavioral attributes defined for this cycle.</CardContent></Card>
                    ) : (
                        attributeTemplates?.map((template) => {
                            const r = attrRatings[template.id] || { rating: 0, comment: "" };
                            return (
                                <Card key={template.id} className="border-l-4 border-l-secondary">
                                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                {template.title}
                                                <Badge variant="outline" className="text-xs font-normal">Mandatory</Badge>
                                            </CardTitle>
                                            {template.description && <p className="text-sm text-muted-foreground mt-1">{template.description}</p>}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleSaveAttr(template.id)} disabled={rateAttribute.isPending}>
                                            <Save className="h-4 w-4 mr-1" /> Save
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium">Self Rating <span className="text-destructive">*</span></label>
                                            <div className="flex gap-3 mt-1 items-center">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.01"
                                                    value={r.rating > 0 ? r.rating : ""}
                                                    onChange={(e) => updateAttrRating(template.id, "rating", parseFloat(e.target.value) || 0)}
                                                    placeholder="e.g. 3.5"
                                                    className="w-32"
                                                />
                                                <span className="text-sm text-muted-foreground">/ 5</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">How did you demonstrate this? <span className="text-destructive">*</span></label>
                                            <Textarea
                                                placeholder="Provide examples of how you demonstrated this attribute..."
                                                value={r.comment}
                                                onChange={(e) => updateAttrRating(template.id, "comment", e.target.value)}
                                                className="mt-1" rows={3}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </TabsContent>
            </Tabs>

            {/* Action buttons */}
            <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
                <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Submission Readiness (Both sections required)</div>
                    <div className="text-xs flex gap-4">
                        <span className={allGoalsRated ? "text-green-600 font-medium" : "text-amber-600"}>
                            Performance Goals: {ratedGoalsCount} / {performanceGoals.length} completed
                        </span>
                        <span className={allAttrsRated ? "text-green-600 font-medium" : "text-amber-600"}>
                            Behavioral Attributes: {ratedAttrsCount} / {attributeTemplates?.length || 0} completed
                        </span>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="text-sm text-muted-foreground mr-2">{lastSaved && `Draft saved at ${lastSaved}`}</div>
                    <Button variant="outline" onClick={handleSaveAllDrafts} disabled={selfSave.isPending || rateAttribute.isPending}>
                        <Save className="mr-2 h-4 w-4" /> Save All Drafts
                    </Button>

                    {!showConfirm ? (
                        <Button disabled={!isReadyToSubmit} onClick={() => setShowConfirm(true)}>
                            <Send className="mr-2 h-4 w-4" /> Submit Self Review
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-destructive font-medium">This cannot be undone.</span>
                            <Button variant="destructive" onClick={handleSubmit} disabled={selfSubmit.isPending}>
                                {selfSubmit.isPending ? "Submitting..." : "Confirm Submit"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        </div>
                    )}
                </div>
            </div>

            {!isReadyToSubmit && (
                <p className="text-sm text-amber-600 text-right">
                    You must rate and comment on all mandatory performance goals and behavioral attributes before submitting.
                </p>
            )}
        </div>
    );
}