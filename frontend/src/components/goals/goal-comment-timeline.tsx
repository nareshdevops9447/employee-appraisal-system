
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2, MessageSquare, MoreHorizontal, Pencil, Reply, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { TeamsContactActions } from "@/components/shared/teams-contact-actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Comment {
    id: string;
    content: string;
    author_id: string;
    author_name?: string;
    author_email?: string;
    author_role?: string;
    created_at: string;
    updated_at?: string;
    goal_id: string;
    reply_to_id?: string;
    is_edited?: boolean;
    is_deleted?: boolean;
    reply_count?: number;
    replies?: Comment[];
    reactions?: Record<string, { count: number; users: string[] }>;
}

interface GoalCommentTimelineProps {
    goalId: string;
    canComment: boolean;
    currentUserId: string;
}

export function GoalCommentTimeline({ goalId, canComment, currentUserId }: GoalCommentTimelineProps) {
    const [content, setContent] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [mentionSearch, setMentionSearch] = useState("");
    const [mentionUsers, setMentionUsers] = useState<any[]>([]);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionAnchor, setMentionAnchor] = useState<{ x: number, y: number } | null>(null);
    const [activeInput, setActiveInput] = useState<"top" | "reply" | "edit" | null>(null);

    const queryClient = useQueryClient();

    // ── Search for users for mentions ──────────────────────────
    const searchUsers = async (term: string) => {
        if (!term) {
            setMentionUsers([]);
            setShowMentions(false);
            return;
        }
        try {
            const res = await apiClient.get(`/api/users/?search=${term}&per_page=5`);
            setMentionUsers(res.data.users);
            setShowMentions(res.data.users.length > 0);
            setMentionIndex(0);
        } catch (e) {
            console.error("Mention search error", e);
        }
    };

    const handleTextSelection = (e: any, inputType: "top" | "reply" | "edit") => {
        const text = e.target.value;
        const pos = e.target.selectionStart;
        const before = text.slice(0, pos);
        const lastAt = before.lastIndexOf("@");

        if (lastAt !== -1 && !before.slice(lastAt + 1).includes(" ")) {
            const query = before.slice(lastAt + 1);
            setMentionSearch(query);
            setActiveInput(inputType);
            searchUsers(query);

            // Basic positioning - in a real app we'd use a more robust way to get cursor coords
            setMentionAnchor({ x: 0, y: 0 });
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (user: any) => {
        let currentText = "";
        let setter: any = null;
        const textarea: HTMLTextAreaElement | null = null;

        // Find the active element to get selection
        const activeEl = document.activeElement as HTMLTextAreaElement;

        if (activeInput === "top") { currentText = content; setter = setContent; }
        else if (activeInput === "reply") { currentText = replyContent; setter = setReplyContent; }
        else if (activeInput === "edit") { currentText = editContent; setter = setEditContent; }

        if (!setter) return;

        // Use selection start if available, otherwise fallback to lastIndexOf
        const pos = activeEl?.selectionStart ?? currentText.lastIndexOf("@" + mentionSearch);
        const lastAt = currentText.slice(0, pos).lastIndexOf("@");

        if (lastAt === -1) return;

        const mentionText = `[@${user.first_name} ${user.last_name}](${user.id}) `;
        const newText = currentText.slice(0, lastAt) + mentionText + currentText.slice(pos);

        setter(newText);
        setShowMentions(false);
        setMentionSearch("");

        // Re-focus and set cursor after the mention
        setTimeout(() => {
            activeEl?.focus();
            const newPos = lastAt + mentionText.length;
            activeEl?.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const { data: comments, isLoading } = useQuery<Comment[]>({
        queryKey: ['goal-comments', goalId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/goals/${goalId}/comments`);
            return response.data;
        },
        refetchInterval: 15000,
    });

    const invalidateComments = () =>
        queryClient.invalidateQueries({ queryKey: ['goal-comments', goalId] });

    // ── POST (new comment or reply) ────────────────────────────
    const addComment = useMutation({
        mutationFn: async ({ text, replyToId }: { text: string; replyToId?: string }) => {
            await apiClient.post(`/api/goals/${goalId}/comments`, {
                content: text,
                reply_to_id: replyToId || undefined,
            });
        },
        onSuccess: async () => {
            setContent("");
            setReplyContent("");
            setReplyingTo(null);
            await invalidateComments();
        },
    });

    // ── PUT (edit comment) ─────────────────────────────────────
    const editComment = useMutation({
        mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
            await apiClient.put(`/api/goals/${goalId}/comments/${commentId}`, {
                content: text,
            });
        },
        onSuccess: async () => {
            setEditingId(null);
            setEditContent("");
            await invalidateComments();
        },
    });

    // ── DELETE (soft-delete) ───────────────────────────────────
    const deleteComment = useMutation({
        mutationFn: async (commentId: string) => {
            await apiClient.delete(`/api/goals/${goalId}/comments/${commentId}`);
        },
        onSuccess: async () => {
            setDeleteTarget(null);
            await invalidateComments();
        },
    });

    // ── POST (toggle reaction) ─────────────────────────────────
    const toggleReaction = useMutation({
        mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
            await apiClient.post(`/api/goals/${goalId}/comments/${commentId}/react`, { emoji });
        },
        onSuccess: async () => {
            await invalidateComments();
        },
    });

    // ── Handle top-level submit ────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (content.trim()) {
            addComment.mutate({ text: content });
        }
    };

    // ── Handle reply submit ────────────────────────────────────
    const handleReply = (parentId: string) => {
        if (replyContent.trim()) {
            addComment.mutate({ text: replyContent, replyToId: parentId });
        }
    };

    // ── Get initials from name ─────────────────────────────────
    const getInitials = (comment: Comment) => {
        if (comment.author_name) {
            return comment.author_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return comment.author_email?.slice(0, 2).toUpperCase() || '??';
    };

    const getDisplayName = (comment: Comment) => {
        return comment.author_name || comment.author_email || 'Unknown User';
    };

    const isOwnComment = (comment: Comment) => comment.author_id === currentUserId;

    // ── Mention List UI ───────────────────────────────────────
    const renderMentionList = () => {
        if (!showMentions) return null;
        return (
            <div className="absolute z-50 mt-1 w-64 bg-background border rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in duration-100">
                {mentionUsers.map((user, i) => (
                    <button
                        key={user.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors ${i === mentionIndex ? 'bg-muted' : ''}`}
                        onClick={() => insertMention(user)}
                    >
                        <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                            <div className="font-medium truncate">{user.first_name} {user.last_name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                        </div>
                    </button>
                ))}
            </div>
        );
    };

    // ── Render content with mentions ──────────────────────────
    const renderContentWithMentions = (content: string) => {
        if (!content) return null;

        // More robust Regex to find [@Name](uuid) 
        // Captures exactly the format we insert: [@FirstName LastName](uuid)
        const mentionRegex = /(\[@(?!\s)[^\]]+?\]\([a-fA-F0-9-]+\))/g;
        const parts = content.split(mentionRegex);

        return parts.map((part, i) => {
            const match = part.match(/\[@(.*?)\]\(([a-fA-F0-9-]+)\)/);
            if (match) {
                const [_, name, userId] = match;
                return (
                    <Link
                        key={`${userId}-${i}`}
                        href={`/profile/${userId}`}
                        className="text-primary font-medium bg-primary/5 px-1 rounded border border-primary/10 hover:bg-primary/10 transition-colors inline-block -mx-0.5"
                    >
                        @{name}
                    </Link>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    // ── Render a single comment ────────────────────────────────
    const renderComment = (comment: Comment, isReply = false) => {
        const isEditing = editingId === comment.id;

        return (
            <div key={comment.id} className={`flex gap-3 group ${isReply ? 'ml-10 mt-3' : ''}`}>
                <Avatar className={isReply ? "h-7 w-7" : "h-9 w-9"}>
                    <AvatarFallback className={`text-xs ${isReply ? 'text-[10px]' : ''} ${comment.is_deleted ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                        }`}>
                        {comment.is_deleted ? '–' : getInitials(comment)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Author line */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${comment.is_deleted ? 'text-muted-foreground italic' : ''}`}>
                            {comment.is_deleted ? 'Deleted' : getDisplayName(comment)}
                        </span>
                        {!comment.is_deleted && comment.author_role && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal capitalize">
                                {comment.author_role}
                            </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                        {!comment.is_deleted && comment.author_email && (
                            <TeamsContactActions
                                email={comment.author_email}
                                name={comment.author_name}
                                variant="compact"
                                className="ml-1"
                            />
                        )}
                        {comment.is_edited && !comment.is_deleted && (
                            <span className="text-xs text-muted-foreground italic">(edited)</span>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="mt-1 relative space-y-2">
                            <Textarea
                                value={editContent}
                                onChange={(e) => {
                                    setEditContent(e.target.value);
                                    handleTextSelection(e, "edit");
                                }}
                                onKeyUp={(e) => handleTextSelection(e, "edit")}
                                autoFocus
                                className="min-h-[60px] text-sm"
                            />
                            {activeInput === "edit" && renderMentionList()}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => editComment.mutate({
                                        commentId: comment.id,
                                        text: editContent,
                                    })}
                                    disabled={!editContent.trim() || editComment.isPending}
                                    className="h-7 text-xs"
                                >
                                    {editComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setEditingId(null); setEditContent(""); }}
                                    className="h-7 text-xs"
                                >
                                    <X className="h-3 w-3 mr-1" /> Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className={`text-sm mt-0.5 whitespace-pre-wrap ${comment.is_deleted ? 'text-muted-foreground italic' : 'text-foreground/90'
                            }`}>
                            {renderContentWithMentions(comment.content)}
                        </div>
                    )}

                    {/* Action buttons */}
                    {!comment.is_deleted && !isEditing && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canComment && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                                    onClick={() => {
                                        setReplyingTo(replyingTo === comment.id ? null : (comment.reply_to_id || comment.id));
                                        setReplyContent("");
                                    }}
                                >
                                    <Reply className="h-3 w-3 mr-1" /> Reply
                                </Button>
                            )}
                            {canComment && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                                        >
                                            <span className="h-3 w-3 mr-1 flex items-center justify-center">😊</span> React
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="flex p-1 min-w-0 gap-1">
                                        {["👍", "❤️", "🎉", "😄", "🚀", "👀"].map((emoji) => (
                                            <Button
                                                key={emoji}
                                                variant="ghost"
                                                size="sm"
                                                className={`h-8 w-8 p-0 text-lg hover:bg-muted ${comment.reactions?.[emoji]?.users.includes(currentUserId)
                                                    ? "bg-primary/10"
                                                    : ""
                                                    }`}
                                                onClick={() => toggleReaction.mutate({ commentId: comment.id, emoji })}
                                            >
                                                {emoji}
                                            </Button>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {isOwnComment(comment) && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                                        onClick={() => {
                                            setEditingId(comment.id);
                                            setEditContent(comment.content);
                                        }}
                                    >
                                        <Pencil className="h-3 w-3 mr-1" /> Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-muted-foreground hover:text-destructive px-2"
                                        onClick={() => setDeleteTarget(comment.id)}
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Reactions Display */}
                    {comment.reactions && Object.keys(comment.reactions).length > 0 && !comment.is_deleted && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(comment.reactions).map(([emoji, data]) => (
                                <Button
                                    key={emoji}
                                    variant="outline"
                                    size="sm"
                                    className={`h-6 px-1.5 py-0 text-xs rounded-full gap-1 border-muted hover:bg-muted ${data.users.includes(currentUserId) ? "bg-primary/5 border-primary/20 text-primary" : "text-muted-foreground"
                                        }`}
                                    onClick={() => toggleReaction.mutate({ commentId: comment.id, emoji })}
                                >
                                    <span>{emoji}</span>
                                    <span className="font-medium">{data.count}</span>
                                </Button>
                            ))}
                        </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === comment.id && (
                        <div className="mt-3 flex gap-2 items-start">
                            <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">ME</AvatarFallback>
                            </Avatar>
                            <div className="relative flex-1 space-y-2">
                                <Textarea
                                    placeholder={`Reply to ${getDisplayName(comment)}... (Type @ to mention)`}
                                    value={replyContent}
                                    onChange={(e) => {
                                        setReplyContent(e.target.value);
                                        handleTextSelection(e, "reply");
                                    }}
                                    onKeyUp={(e) => handleTextSelection(e, "reply")}
                                    autoFocus
                                    className="min-h-[60px] text-sm"
                                />
                                {activeInput === "reply" && activeInput === "reply" && renderMentionList()}
                                {replyContent.includes("[@") && (
                                    <p className="text-[10px] text-muted-foreground mt-1 px-1 italic">
                                        Tip: Mentions appear as styled links in the thread.
                                    </p>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                                        className="h-7 text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleReply(comment.id)}
                                        disabled={!replyContent.trim() || addComment.isPending}
                                        className="h-7 text-xs"
                                    >
                                        {addComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                        Reply
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nested replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="border-l-2 border-muted pl-0 mt-1">
                            {comment.replies.map((reply) => renderComment(reply, true))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comments & Activity
                        {comments && comments.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* New Comment Form */}
                    {canComment && (
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">ME</AvatarFallback>
                            </Avatar>
                            <div className="relative flex-1 space-y-2">
                                <Textarea
                                    placeholder="Add a comment... (Type @ to mention someone)"
                                    value={content}
                                    onChange={(e) => {
                                        setContent(e.target.value);
                                        handleTextSelection(e, "top");
                                    }}
                                    onKeyUp={(e) => handleTextSelection(e, "top")}
                                    className="min-h-[80px]"
                                />
                                {activeInput === "top" && renderMentionList()}
                                {content.includes("[@") && (
                                    <p className="text-[10px] text-muted-foreground mt-1 px-1 italic">
                                        Tip: Mention format [ @Name ](id) will be converted to a clean link after posting.
                                    </p>
                                )}
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={!content.trim() || addComment.isPending}
                                        size="sm"
                                    >
                                        {addComment.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-2" />
                                        )}
                                        Post Comment
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Comments List */}
                    <div className="space-y-5">
                        {isLoading ? (
                            <div className="text-center text-muted-foreground py-4">Loading comments...</div>
                        ) : comments?.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No comments yet. Start the conversation!</p>
                            </div>
                        ) : (
                            comments?.map((comment) => renderComment(comment))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && deleteComment.mutate(deleteTarget)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteComment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
