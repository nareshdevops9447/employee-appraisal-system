"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, User, Briefcase } from "lucide-react";
import type { Appraisal, GoalForAssessment } from "@/types/appraisal";
import { useAppraisalSelfAssessments } from "@/hooks/use-self-assessments";
import { useManagerReviews } from "@/hooks/use-manager-reviews";
import { useCycleAttributeTemplates, useEmployeeAttributeRatings } from "@/hooks/use-attribute-templates";
import { Skeleton } from "@/components/ui/skeleton";

interface FinalSummaryProps {
    appraisal: Appraisal;
    goals: GoalForAssessment[];
}

export function FinalSummary({ appraisal, goals }: FinalSummaryProps) {
    // Fetch all relational data
    const { data: selfAssessments, isLoading: loadingSelf } = useAppraisalSelfAssessments(appraisal.id);
    const { data: managerReviews, isLoading: loadingManager } = useManagerReviews(appraisal.id);
    const { data: attrTemplates, isLoading: loadingAttrTemplates } = useCycleAttributeTemplates(appraisal.cycle_id);
    const { data: attrRatings, isLoading: loadingAttrRatings } = useEmployeeAttributeRatings(appraisal.employee_id, appraisal.cycle_id);

    if (loadingSelf || loadingManager || loadingAttrTemplates || loadingAttrRatings) {
        return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
    }

    const selfRatingsObj: Record<string, { rating: number, comment: string }> = {};
    if (selfAssessments) {
        for (const sa of selfAssessments) {
            selfRatingsObj[sa.goal_id] = { rating: sa.employee_rating || 0, comment: sa.employee_comment || "" };
        }
    }

    const mgrRatingsObj: Record<string, { rating: number, comment: string }> = {};
    if (managerReviews?.goal_reviews) {
        for (const mr of managerReviews.goal_reviews) {
            mgrRatingsObj[mr.goal_id] = { rating: mr.manager_rating || 0, comment: mr.manager_comment || "" };
        }
    }

    const attrSelfRatingsObj: Record<string, { rating: number, comment: string }> = {};
    const attrMgrRatingsObj: Record<string, { rating: number, comment: string }> = {};
    if (attrRatings) {
        for (const ar of attrRatings) {
            attrSelfRatingsObj[ar.attribute_template_id] = { rating: ar.self_rating || 0, comment: ar.self_comment || "" };
            attrMgrRatingsObj[ar.attribute_template_id] = { rating: ar.manager_rating || 0, comment: ar.manager_comment || "" };
        }
    }

    const overallReview = managerReviews?.overall_review;

    // Calculate averages (combining goals and attributes for self and manager)
    const selfAvg = calcAverage([...Object.values(selfRatingsObj), ...Object.values(attrSelfRatingsObj)]);
    const mgrAvg = calcAverage([...Object.values(mgrRatingsObj), ...Object.values(attrMgrRatingsObj)]);

    return (
        <div className="space-y-6">
            {/* Completion banner */}
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                    <p className="font-semibold text-green-800">
                        Appraisal Completed
                    </p>
                    <p className="text-sm text-green-700">
                        {appraisal.cycle_name} — {formatCycleType(appraisal.cycle_type)}
                    </p>
                </div>
            </div>

            {/* Overall rating card */}
            <Card>
                <CardHeader>
                    <CardTitle>Overall Rating</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-4xl font-bold">
                                {overallReview?.overall_rating ?? "—"}
                            </div>
                            <div className="flex gap-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        className={`h-5 w-5 ${s <= (overallReview?.overall_rating ?? 0)
                                            ? "fill-amber-500 text-amber-500"
                                            : "text-gray-200"
                                            }`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Manager Rating
                            </p>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                            <div className="rounded-lg bg-muted p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">Self Avg</span>
                                </div>
                                <span className="text-2xl font-semibold">
                                    {selfAvg.toFixed(1)}
                                </span>
                            </div>
                            <div className="rounded-lg bg-muted p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Briefcase className="h-4 w-4" />
                                    <span className="font-medium">Manager Avg</span>
                                </div>
                                <span className="text-2xl font-semibold">
                                    {mgrAvg.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Goal-by-goal breakdown */}
            <div>
                <h3 className="text-lg font-semibold mb-3">Goal Breakdown</h3>
                {goals.map((goal) => {
                    const sr = selfRatingsObj[goal.id];
                    const mr = mgrRatingsObj[goal.id];
                    return (
                        <Card key={goal.id} className="mb-3">
                            <CardContent className="pt-4">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-medium">{goal.title}</h4>
                                    <div className="flex gap-2">
                                        {sr && sr.rating > 0 && (
                                            <Badge variant="secondary">
                                                Self: {sr.rating}/5
                                            </Badge>
                                        )}
                                        {mr && mr.rating > 0 && (
                                            <Badge>
                                                Manager: {mr.rating}/5
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Comments */}
                                {sr?.comment && (
                                    <div className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                                        <span className="font-medium text-foreground">Employee: </span>
                                        {sr.comment}
                                    </div>
                                )}
                                {mr?.comment && (
                                    <div className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                                        <span className="font-medium text-foreground">Manager: </span>
                                        {mr.comment}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Attributes Breakdown */}
            {attrTemplates && attrTemplates.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-3">Behavioral Attributes</h3>
                    {attrTemplates.map((attr) => {
                        const sr = attrSelfRatingsObj[attr.id];
                        const mr = attrMgrRatingsObj[attr.id];
                        return (
                            <Card key={attr.id} className="mb-3">
                                <CardContent className="pt-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium">{attr.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{attr.description}</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {sr && sr.rating > 0 && (
                                                <Badge variant="secondary">
                                                    Self: {sr.rating}/5
                                                </Badge>
                                            )}
                                            {mr && mr.rating > 0 && (
                                                <Badge>
                                                    Manager: {mr.rating}/5
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comments */}
                                    {sr?.comment && (
                                        <div className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                                            <span className="font-medium text-foreground">Employee: </span>
                                            {sr.comment}
                                        </div>
                                    )}
                                    {mr?.comment && (
                                        <div className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                                            <span className="font-medium text-foreground">Manager: </span>
                                            {mr.comment}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Manager feedback overview */}
            {overallReview?.overall_comment && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-3">Manager Feedback</h3>
                    <Card>
                        <CardContent className="pt-6">
                            <h4 className="font-medium mb-1">Overall Assessment</h4>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground mb-4">
                                {overallReview.overall_comment}
                            </p>

                            {overallReview.strengths && (
                                <>
                                    <h4 className="font-medium mb-1">Key Strengths</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                                        {overallReview.strengths}
                                    </p>
                                </>
                            )}

                            {overallReview.development_areas && (
                                <>
                                    <h4 className="font-medium mb-1">Areas for Development</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {overallReview.development_areas}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Employee Acknowledgement Comments */}
            {appraisal.employee_comments && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-3">Employee Sign-Off</h3>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                {appraisal.employee_comments}
                            </p>
                            {appraisal.is_dispute && (
                                <Badge variant="destructive" className="mt-4">
                                    Flagged for Review
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground space-y-1 border-t pt-3 mt-6">
                {appraisal.self_assessment_submitted_at && (
                    <p>
                        Self-assessment submitted:{" "}
                        {new Date(appraisal.self_assessment_submitted_at).toLocaleString()}
                    </p>
                )}
                {appraisal.manager_assessment_submitted_at && (
                    <p>
                        Manager review submitted:{" "}
                        {new Date(appraisal.manager_assessment_submitted_at).toLocaleString()}
                    </p>
                )}
                {appraisal.employee_acknowledgement_date && (
                    <p>
                        Employee acknowledged:{" "}
                        {new Date(appraisal.employee_acknowledgement_date).toLocaleString()}
                    </p>
                )}
            </div>
        </div>
    );
}

function calcAverage(ratings: { rating: number }[]): number {
    const values = ratings
        .map((r) => r.rating)
        .filter((r) => r > 0);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatCycleType(type?: string): string {
    const labels: Record<string, string> = {
        annual: "Annual Review",
        mid_year: "Half-Yearly Review",
        probation: "Probation Review",
    };
    return labels[type ?? ""] ?? type ?? "";
}