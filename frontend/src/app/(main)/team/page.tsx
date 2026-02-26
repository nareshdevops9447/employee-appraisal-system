
"use client";

import { useTeamMembers, TeamMember } from "@/hooks/use-team";
import { useDepartments } from "@/hooks/use-departments";
import { TeamMemberCard } from "@/components/team/team-member-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeamPage() {
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("all");
    const [scope, setScope] = useState<'my-team' | 'all'>('my-team');
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const { data: departments } = useDepartments();

    const { data: members, isLoading } = useTeamMembers({
        search: search || undefined,
        department_id: department === "all" ? undefined : department,
        scope: scope === 'all' ? 'all' : undefined,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Team</h1>
                <p className="text-muted-foreground">Manage your team members and view their performance status.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search team..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments?.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select defaultValue="name">
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="department">Department</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                    </Select>
                    <Tabs value={scope} onValueChange={(v) => setScope(v as 'my-team' | 'all')} className="w-[200px]">
                        <TabsList className="grid w-full grid-cols-2 h-9 p-1">
                            <TabsTrigger value="my-team" className="text-xs">My Team</TabsTrigger>
                            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-[250px] w-full bg-card rounded-xl" />
                    ))}
                </div>
            ) : members?.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No team members found.</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {members?.map((member) => (
                        <div key={member.id} onClick={() => setSelectedMember(member)} className="cursor-pointer">
                            <TeamMemberCard member={member} />
                        </div>
                    ))}
                </div>
            )}

            {/* Team Member Detail Sheet */}
            <Sheet open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                    {selectedMember && (
                        <div className="space-y-6">
                            <SheetHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={`https://avatar.vercel.sh/${selectedMember.email}`} alt={selectedMember.name} />
                                        <AvatarFallback>{selectedMember.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <SheetTitle className="text-2xl">{selectedMember.name}</SheetTitle>
                                        <SheetDescription className="text-base">{selectedMember.job_title || 'Employee'}</SheetDescription>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <h4 className="font-semibold text-muted-foreground mb-1">Department</h4>
                                        <p>{selectedMember.department_name || selectedMember.department_id || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-muted-foreground mb-1">Email</h4>
                                        <p>{selectedMember.email}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-muted-foreground mb-1">Start Date</h4>
                                        <p>{selectedMember.start_date ? new Date(selectedMember.start_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-muted-foreground mb-1">Probation Status</h4>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={selectedMember.probation_status === 'cleared' ? 'default' : 'secondary'} className="capitalize">
                                                {selectedMember.probation_status || 'Pending'}
                                            </Badge>
                                            {selectedMember.probation_status !== 'cleared' && selectedMember.probation_end_date && (
                                                <span className="text-[10px] text-muted-foreground">Ends: {new Date(selectedMember.probation_end_date).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Current Status</h3>
                                    <div className="space-y-4 bg-muted/40 p-4 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Appraisal Cycle</span>
                                            <Badge variant={selectedMember.active_appraisal_status === 'overdue' ? 'destructive' : 'default'} className="capitalize">
                                                {selectedMember.active_appraisal_status?.replace('_', ' ') || 'Not Started'}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Goals Progress</span>
                                                <span className="text-muted-foreground">{selectedMember.goals_completed || 0} / {selectedMember.goals_total || 0} Completed</span>
                                            </div>
                                            <Progress value={selectedMember.goals_total ? (selectedMember.goals_completed! / selectedMember.goals_total) * 100 : 0} className="h-2" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground italic">No recent activity found.</p>
                                        {/* Maps activity feed here */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
