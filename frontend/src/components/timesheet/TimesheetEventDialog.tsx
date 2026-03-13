import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Project } from '@/types/timesheet';

interface EventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event?: any;
    selectedDate?: Date;
    projects: Project[];
    onSave: (data: any) => void;
    onDelete?: () => void;
    isSubmitting: boolean;
}

export function TimesheetEventDialog({ open, onOpenChange, event, selectedDate, projects, onSave, onDelete, isSubmitting }: EventDialogProps) {
    const [projectId, setProjectId] = useState<string>('');
    const [hours, setHours] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    useEffect(() => {
        if (open) {
            if (event) {
                setProjectId(event.resource?.project_id || '');
                setHours(event.resource?.hours?.toString() || '');
                setDescription(event.resource?.description || '');
            } else {
                setProjectId('');
                setHours('');
                setDescription('');
            }
        }
    }, [open, event]);

    const handleSave = () => {
        if (!projectId || !hours) return;
        
        onSave({
            date: event ? event.start.toISOString().split('T')[0] : (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
            project_id: projectId,
            hours: parseFloat(hours),
            description: description,
            entry_type: 'WORK',
            allDay: false
        });
    };

    const isReadOnly = event?.allDay || event?.resource?.entry_type === 'LEAVE' || event?.resource?.entry_type === 'HOLIDAY';
    const displayDate = event ? event.start : selectedDate;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{event ? (isReadOnly ? 'View Entry' : 'Edit Entry') : 'New Timesheet Entry'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Date</Label>
                        <div className="col-span-3 text-sm font-medium">
                            {displayDate ? format(displayDate, 'EEEE, MMMM d, yyyy') : ''}
                        </div>
                    </div>
                    {isReadOnly && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Type</Label>
                            <div className="col-span-3">
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{
                                    backgroundColor: event.title === 'HOLIDAY' ? '#d1fae5' : '#fef3c7',
                                    color: event.title === 'HOLIDAY' ? '#065f46' : '#92400e'
                                }}>
                                    {event.title}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="project" className="text-right">Project {isReadOnly ? '' : '*'}</Label>
                        <div className="col-span-3">
                            {isReadOnly ? (
                                <Input value={event?.resource?.project_name || 'N/A'} disabled />
                            ) : (
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="hours" className="text-right">Hours {isReadOnly ? '' : '*'}</Label>
                        <Input
                            id="hours"
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            className="col-span-3"
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Notes</Label>
                        <Textarea
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            disabled={isReadOnly}
                            placeholder="Optional description of work done..."
                        />
                    </div>
                </div>
                <DialogFooter className="flex items-center justify-between sm:justify-between">
                    {!isReadOnly && event ? (
                        <Button variant="destructive" onClick={onDelete} disabled={isSubmitting}>
                            Delete
                        </Button>
                    ) : (
                        <div></div>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                        {!isReadOnly && (
                            <Button onClick={handleSave} disabled={!projectId || !hours || isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Entry'}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
