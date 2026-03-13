"use client";

import { useState, useMemo } from "react";
import { useProjects, useCalendarEvents, useUpsertEntries, useSubmitTimesheet, usePendingTimesheets } from "@/hooks/use-timesheet";
import { useTeamMembers, TeamMember } from "@/hooks/use-team";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths } from "date-fns";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Send, Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TimesheetCalendar } from "@/components/timesheet/TimesheetCalendar";
import { TimesheetEventDialog } from "@/components/timesheet/TimesheetEventDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TimesheetPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('week');
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
    
    // Determine the date range to fetch based on current view
    const dateRange = useMemo(() => {
        if (currentView === 'month') {
            return {
                start: startOfWeek(startOfMonth(currentDate)),
                end: endOfWeek(endOfMonth(currentDate))
            };
        }
        return {
            start: startOfWeek(currentDate),
            end: endOfWeek(currentDate)
        };
    }, [currentDate, currentView]);

    const { data: session } = useSession();
    const { data: team } = useTeamMembers();
    const role = (session?.user as any)?.role;
    const isManager = role === 'manager' || role === 'hr_admin' || role === 'super_admin';

    const { data: projects, isLoading: projectsLoading } = useProjects();
    const { data: events, isLoading: eventsLoading } = useCalendarEvents(dateRange.start, dateRange.end, selectedUserId);
    const upsertMutation = useUpsertEntries();
    const submitMutation = useSubmitTimesheet();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedSlotDate, setSelectedSlotDate] = useState<Date | undefined>();

    const handleSelectSlot = (slotInfo: { start: Date; end: Date; action: 'select' | 'click' | 'doubleClick' }) => {
        // Can only add entries if viewing own calendar
        if (selectedUserId) return;
        
        setSelectedEvent(null);
        setSelectedSlotDate(slotInfo.start);
        setIsDialogOpen(true);
    };

    const handleSelectEvent = (event: any) => {
        setSelectedEvent(event);
        setSelectedSlotDate(event.start);
        setIsDialogOpen(true);
    };

    const handleSaveEntry = (entryData: any) => {
        upsertMutation.mutate([entryData], {
            onSuccess: () => {
                setIsDialogOpen(false);
            }
        });
    };

    const handleDeleteEntry = () => {
        if (!selectedEvent || !selectedEvent.resource) return;
        
        if (window.confirm("Delete this timesheet entry?")) {
            upsertMutation.mutate([{
                date: selectedEvent.resource.date,
                project_id: selectedEvent.resource.project_id,
                hours: 0, // Sending 0 hours effectively deletes it or zeroes it out depending on backend logic
                description: selectedEvent.resource.description
            }], {
                onSuccess: () => {
                    setIsDialogOpen(false);
                }
            });
        }
    };

    const handleSubmitWeek = () => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        if (window.confirm(`Submit timesheet for the week of ${format(weekStart, 'MMM d, yyyy')}?`)) {
            submitMutation.mutate(format(weekStart, 'yyyy-MM-dd'));
        }
    };

    if (projectsLoading) return <TimesheetSkeleton />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Timesheet</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your time allocations and submit for approval.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isManager && team && team.length > 0 && (
                        <Select value={selectedUserId || "me"} onValueChange={(val) => setSelectedUserId(val === "me" ? undefined : val)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="My Timesheet" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="me">My Timesheet</SelectItem>
                                {team.map((member: TeamMember) => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.first_name} {member.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {!selectedUserId && (
                        <Button onClick={handleSubmitWeek} disabled={submitMutation.isPending}>
                            <Send className="h-4 w-4 mr-2" /> Submit Week of {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}
                        </Button>
                    )}
                </div>
            </div>

            {eventsLoading ? (
                <Skeleton className="h-[700px] w-full rounded-lg" />
            ) : (
                <TimesheetCalendar
                    events={events || []}
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                />
            )}

            <TimesheetEventDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                event={selectedEvent}
                selectedDate={selectedSlotDate}
                projects={projects || []}
                onSave={handleSaveEntry}
                onDelete={handleDeleteEntry}
                isSubmitting={upsertMutation.isPending}
            />
        </div>
    );
}

function TimesheetSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-[700px] w-full rounded-lg" />
        </div>
    );
}
