"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTeamMembers } from "@/hooks/use-team";
import { useDiscussions, Discussion } from "@/hooks/use-discussions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Calendar, Lock, Globe, MessageSquarePlus, Edit2, Trash2, Search, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import apiClient from "@/lib/api-client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


export default function DiscussionsPage() {
    const { data: session } = useSession();
    const isManager = ['manager', 'hr_admin', 'super_admin'].includes(session?.user?.role || '');

    // For managers: they can view team members.
    // For employees: they just view their own discussions with their manager.
    const [selectedUserId, setSelectedUserId] = useState<string | null>(isManager ? null : session?.user?.id || null);
    const [searchTeam, setSearchTeam] = useState("");

    const { data: teamMembers, isLoading: isLoadingTeam } = useTeamMembers({
        search: searchTeam || undefined,
    });

    // If employee, just use their own ID. If manager, use the selected ID from the sidebar
    const targetUserId = isManager ? selectedUserId : session?.user?.id;

    const { data: discussions, isLoading: isLoadingDiscussions, mutate } = useDiscussions(targetUserId || undefined);
    
    const { toast } = useToast();

    // Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editingDiscussion, setEditingDiscussion] = useState<Discussion | null>(null);

    // Form State
    const [content, setContent] = useState("");
    const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const resetForm = () => {
        setContent("");
        setMeetingDate(format(new Date(), 'yyyy-MM-dd'));
        setIsPrivate(false);
    };

    const handleCreate = async () => {
        if (!targetUserId || !content || !meetingDate) return;
        setIsSaving(true);
        try {
            await apiClient.post('/api/discussions', {
                employee_id: targetUserId,
                content,
                meeting_date: meetingDate,
                is_private: isPrivate,
            });
            
            toast({ title: "Discussion note saved successfully." });
            mutate();
            setIsCreateOpen(false);
            resetForm();
        } catch (error) {
            toast({ title: "Error saving discussion", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!editingDiscussion || !content || !meetingDate) return;
        setIsSaving(true);
        try {
            await apiClient.put(`/api/discussions/${editingDiscussion.id}`, {
                content,
                meeting_date: meetingDate,
                is_private: isPrivate,
            });
            
            toast({ title: "Discussion note updated successfully." });
            mutate();
            setIsEditOpen(false);
            setEditingDiscussion(null);
        } catch (error) {
            toast({ title: "Error updating discussion", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await apiClient.delete(`/api/discussions/${deleteId}`);
            
            toast({ title: "Discussion deleted." });
            mutate();
        } catch (error) {
            toast({ title: "Error deleting discussion", variant: "destructive" });
        } finally {
            setDeleteId(null);
        }
    };

    const openEditDialog = (discussion: Discussion) => {
        setEditingDiscussion(discussion);
        setContent(discussion.content);
        setMeetingDate(discussion.meeting_date);
        setIsPrivate(discussion.is_private);
        setIsEditOpen(true);
    };

    const selectedMember = teamMembers?.find(m => m.id === targetUserId);

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6">
            
            {/* Left Sidebar - Team Members (Managers only) */}
            {isManager && (
                <div className="w-80 flex flex-col gap-4 border-r pr-6">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight mb-1">Team Members</h2>
                        <p className="text-sm text-muted-foreground">Select a member to view 1-on-1s</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search team..."
                            className="pl-9"
                            value={searchTeam}
                            onChange={(e) => setSearchTeam(e.target.value)}
                        />
                    </div>
                    
                    <ScrollArea className="flex-1 -mr-4 pr-4">
                        <div className="space-y-2 pb-4">
                            {teamMembers?.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => setSelectedUserId(member.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                        selectedUserId === member.id
                                            ? "bg-primary/10 hover:bg-primary/15"
                                            : "hover:bg-accent"
                                    )}
                                >
                                    <Avatar className="h-10 w-10 border bg-background">
                                        <AvatarImage src={`https://avatar.vercel.sh/${member.email}`} />
                                        <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                        <p className={cn(
                                            "font-medium text-sm truncate",
                                            selectedUserId === member.id && "text-primary font-semibold"
                                        )}>
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {member.job_title || "Employee"}
                                        </p>
                                    </div>
                                </button>
                            ))}
                            {teamMembers?.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No team members found.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Right Pane - Discussions */}
            <div className="flex-1 flex flex-col min-w-0">
                {!targetUserId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center">
                            <MessageSquarePlus className="h-10 w-10 text-primary/30" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold">Select a Team Member</h3>
                            <p className="text-muted-foreground max-w-sm mt-2">
                                Choose someone from the sidebar to view your shared 1-on-1 discussion notes.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-6 pb-6 border-b">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">1-on-1 Discussions</h2>
                                <p className="text-muted-foreground">
                                    {isManager ? `Meeting notes with ${selectedMember?.name || 'Loading...'}` : 'Meeting notes with your manager'}
                                </p>
                            </div>
                            
                            {isManager && (
                                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                                    if(!open) resetForm();
                                    setIsCreateOpen(open);
                                }}>
                                    <DialogTrigger asChild>
                                        <Button className="gap-2">
                                            <MessageSquarePlus className="h-4 w-4" />
                                            New Note
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[600px]">
                                        <DialogHeader>
                                            <DialogTitle>Add Meeting Note</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Meeting Date</Label>
                                                    <Input 
                                                        type="date" 
                                                        value={meetingDate} 
                                                        onChange={(e) => setMeetingDate(e.target.value)} 
                                                    />
                                                </div>
                                                <div className="space-y-2 flex flex-col justify-end">
                                                    <div className="flex items-center justify-between border rounded-lg p-3">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-sm leading-none flex items-center gap-2">
                                                                {isPrivate ? <Lock className="h-3 w-3 text-amber-500" /> : <Globe className="h-3 w-3 text-green-500" />}
                                                                {isPrivate ? 'Private Note' : 'Shared Note'}
                                                            </Label>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {isPrivate ? 'Only you can see this' : 'Visible to employee'}
                                                            </p>
                                                        </div>
                                                        <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Discussion Notes</Label>
                                                <RichTextEditor 
                                                    placeholder="What was discussed?"
                                                    value={content}
                                                    onChange={(val) => setContent(val)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                            <Button onClick={handleCreate} disabled={!content || isSaving}>
                                                {isSaving ? "Saving..." : "Save Note"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                            {isLoadingDiscussions ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <Card key={i} className="animate-pulse">
                                            <CardHeader className="h-16 bg-muted/50" />
                                            <CardContent className="h-32" />
                                        </Card>
                                    ))}
                                </div>
                            ) : discussions?.length === 0 ? (
                                <Card className="border-dashed border-2 bg-transparent text-center py-12">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                                        <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="font-semibold text-lg">No meetings documented yet</h3>
                                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                                        {isManager 
                                            ? "Add notes from your 1-on-1s to keep track of feedback and topics over time." 
                                            : "Your manager hasn't added any 1-on-1 meeting notes yet."}
                                    </p>
                                </Card>
                            ) : (
                                <div className="space-y-6 pb-8">
                                    {discussions?.map((note: Discussion) => (
                                        <Card key={note.id} className="overflow-hidden">
                                            <CardHeader className="py-3 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                        <Calendar className="h-4 w-4 text-primary" />
                                                        {format(new Date(note.meeting_date), 'MMM d, yyyy')}
                                                    </div>
                                                    {note.is_private ? (
                                                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                            <Lock className="w-3 h-3 mr-1" /> Private
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                            <Globe className="w-3 h-3 mr-1" /> Shared
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                {isManager && session?.user?.id === note.manager_id && (
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(note)}>
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(note.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardHeader>
                                            <CardContent className="pt-4 pb-5">
                                                <div 
                                                    className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-foreground/90"
                                                    dangerouslySetInnerHTML={{ __html: note.content }}
                                                />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open);
                if(!open) setEditingDiscussion(null);
            }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Meeting Note</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Meeting Date</Label>
                                <Input 
                                    type="date" 
                                    value={meetingDate} 
                                    onChange={(e) => setMeetingDate(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2 flex flex-col justify-end">
                                <div className="flex items-center justify-between border rounded-lg p-3">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm leading-none flex items-center gap-2">
                                            {isPrivate ? <Lock className="h-3 w-3 text-amber-500" /> : <Globe className="h-3 w-3 text-green-500" />}
                                            {isPrivate ? 'Private Note' : 'Shared Note'}
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isPrivate ? 'Only you can see this' : 'Visible to employee'}
                                        </p>
                                    </div>
                                    <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Discussion Notes</Label>
                            <RichTextEditor 
                                placeholder="What was discussed?"
                                value={content}
                                onChange={(val) => setContent(val)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEdit} disabled={!content || isSaving}>
                            {isSaving ? "Saving..." : "Update Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meeting Note</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this discussion note? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
