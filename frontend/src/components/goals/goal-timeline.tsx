
"use client";

import { useGoalComments, useAddComment } from "@/hooks/use-goal-comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trophy, AlertCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalTimelineProps {
    goalId: string;
}

const typeIcons: Record<string, LucideIcon> = {
    update: MessageSquare,
    feedback: MessageSquare,
    blocker: AlertCircle,
    achievement: Trophy,
};

const typeColors: Record<string, string> = {
    update: "text-blue-500 bg-blue-500/10",
    feedback: "text-purple-500 bg-purple-500/10",
    blocker: "text-red-500 bg-red-500/10",
    achievement: "text-yellow-500 bg-yellow-500/10",
};

export function GoalTimeline({ goalId }: GoalTimelineProps) {
    const { data: comments, isLoading } = useGoalComments(goalId);
    const addComment = useAddComment();
    const [newComment, setNewComment] = useState("");
    const [commentType, setCommentType] = useState("update");

    const handleSubmit = () => {
        if (!newComment.trim()) return;
        addComment.mutate(
            { goalId, data: { content: newComment, comment_type: commentType } },
            {
                onSuccess: () => {
                    setNewComment("");
                    setCommentType("update");
                }
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading activity...</p>
                ) : comments?.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No activity yet.</p>
                ) : (
                    comments?.map((comment) => {
                        const Icon = typeIcons[comment.comment_type] || MessageSquare;
                        return (
                            <div key={comment.id} className="flex gap-4">
                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1", typeColors[comment.comment_type] || "bg-muted")}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="space-y-1 bg-muted/30 p-3 rounded-lg flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm">{comment.author?.name || "Unknown User"}</span>
                                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="flex gap-2 items-start mt-4 pt-4 border-t">
                <div className="flex-1 space-y-2">
                    <Textarea
                        placeholder="Log activity, feedback, or blockers..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px]"
                    />
                    <div className="flex justify-between items-center">
                        <Select value={commentType} onValueChange={setCommentType}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="feedback">Feedback</SelectItem>
                                <SelectItem value="blocker">Blocker</SelectItem>
                                <SelectItem value="achievement">Achievement</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleSubmit} disabled={addComment.isPending || !newComment.trim()}>
                            {addComment.isPending ? "Posting..." : "Post Comment"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
