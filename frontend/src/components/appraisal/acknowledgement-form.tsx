"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import type { Appraisal, GoalForAssessment } from "@/types/appraisal";
import { FinalSummary } from "@/components/appraisal/FinalSummary";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function AcknowledgementForm({ appraisal, goals }: { appraisal: Appraisal; goals?: GoalForAssessment[] }) {
    const queryClient = useQueryClient();
    const [comments, setComments] = useState("");
    const [isDispute, setIsDispute] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const mutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.put(`/api/appraisals/${appraisal.id}/acknowledge`, {
                comments: comments.trim() || undefined,
                dispute: isDispute,
            });
            return data;
        },
        onSuccess: () => {
            toast.success(isDispute ? "Appraisal acknowledged with a note." : "Appraisal acknowledged successfully.");
            queryClient.invalidateQueries({ queryKey: ["appraisals", appraisal.id] });
            queryClient.invalidateQueries({ queryKey: ["appraisals"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to acknowledge appraisal.");
        },
    });

    return (
        <div className="space-y-8">
            {/* Full appraisal summary before sign-off */}
            {goals && <FinalSummary appraisal={appraisal} goals={goals} />}

            <Separator />

            {/* Sign-off section */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-base font-semibold mb-1">Employee Sign-Off</h3>
                    <p className="text-sm text-muted-foreground">
                        Please review the assessment above and acknowledge that you have read and discussed it with your manager.
                    </p>
                </div>

                {/* Comments */}
                <div className="space-y-1.5">
                    <label htmlFor="ack-comments" className="text-sm font-medium">
                        Additional Comments <span className="text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <Textarea
                        id="ack-comments"
                        placeholder="Add any final thoughts, context, or clarifications..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Dispute flag */}
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <input
                        id="dispute-check"
                        type="checkbox"
                        checked={isDispute}
                        onChange={(e) => setIsDispute(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 accent-amber-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                        <label htmlFor="dispute-check" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            I acknowledge but wish to flag a concern
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Checking this will mark this appraisal as disputed. You will still be acknowledging receipt
                            — HR will be notified separately. Please describe your concern in the comments field above.
                        </p>
                    </div>
                </div>

                {/* Submit actions */}
                {!showConfirm ? (
                    <Button onClick={() => setShowConfirm(true)} size="lg">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {isDispute ? "Acknowledge with Concern" : "Acknowledge & Close"}
                    </Button>
                ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border rounded-lg bg-muted/50">
                        <div className="flex-1">
                            <p className="text-sm font-medium">
                                {isDispute
                                    ? "You are acknowledging this appraisal with a flagged concern."
                                    : "You are acknowledging this appraisal. This action cannot be undone."}
                            </p>
                            {isDispute && (
                                <Badge variant="outline" className="mt-1 border-amber-400 text-amber-700">
                                    Dispute flag will be set
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => mutation.mutate()}
                                disabled={mutation.isPending}
                                variant={isDispute ? "outline" : "default"}
                            >
                                {mutation.isPending ? "Submitting..." : "Confirm"}
                            </Button>
                            <Button variant="ghost" onClick={() => setShowConfirm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
