
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Goal } from "@/types/goal";
import { useFieldArray } from "react-hook-form";
import { TeamMember } from "@/hooks/use-team";
import { UserProfile } from "@/types/user";

const goalFormSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(200),
    description: z.string().max(2000).optional(),
    category: z.enum(['performance', 'development', 'project', 'mission_aligned']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    weight: z.number().min(0).max(100).optional(),
    start_date: z.date(),
    target_date: z.date(),
    employee_id: z.string().optional(),
    key_results: z.array(z.object({
        title: z.string().min(3, "Key Result title is required"),
        target_value: z.number().min(1),
        unit: z.string().min(1),
        due_date: z.date().optional(),
    })).optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormProps {
    initialData?: Goal;
    onSubmit: (data: GoalFormValues) => void;
    isLoading?: boolean;
    employeeId?: string | null;
    teamMembers?: TeamMember[];
    onSaveAndSubmit?: (data: GoalFormValues) => void;
    isSubmitLoading?: boolean;
    currentUserProfile?: UserProfile;
}

export function GoalForm({ initialData, onSubmit, isLoading, employeeId, teamMembers, onSaveAndSubmit, isSubmitLoading, currentUserProfile }: GoalFormProps) {
    const form = useForm<GoalFormValues>({
        resolver: zodResolver(goalFormSchema),
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            category: initialData?.category || "development",
            priority: initialData?.priority || "medium",
            weight: initialData?.weight || 0,
            start_date: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
            target_date: initialData?.target_date ? new Date(initialData.target_date) : undefined,
            employee_id: employeeId || initialData?.employee_id || undefined,
            key_results: initialData?.key_results?.map(kr => ({
                title: kr.title,
                target_value: kr.target_value,
                unit: kr.unit,
                due_date: kr.due_date ? new Date(kr.due_date) : undefined
            })) || [{ title: "", target_value: 100, unit: "%" }], // Default one empty KR
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "key_results",
    });

    const watchedEmployeeId = form.watch("employee_id");

    useEffect(() => {
        // Only run this auto-fill logic if creating a *new* goal
        if (initialData) return;

        let activeTargetUser: UserProfile | undefined;
        if (watchedEmployeeId && watchedEmployeeId !== "myself") {
            activeTargetUser = teamMembers?.find(m => m.id === watchedEmployeeId);
        } else {
            activeTargetUser = currentUserProfile;
        }

        if (activeTargetUser?.probation_status === 'pending') {
            const startDateStr = activeTargetUser.joined_at || activeTargetUser.start_date;
            const targetDateStr = activeTargetUser.probation_end_date;

            if (startDateStr) {
                form.setValue("start_date", new Date(startDateStr));
            }
            if (targetDateStr) {
                form.setValue("target_date", new Date(targetDateStr));
            }
        }
    }, [watchedEmployeeId, currentUserProfile, teamMembers, form, initialData]);

    const handleSaveAndSubmit = (data: GoalFormValues) => {
        if (!onSaveAndSubmit) return;
        const payload = { ...data };
        if (payload.employee_id === "myself") {
            payload.employee_id = null as any;
        }
        onSaveAndSubmit(payload);
    };

    const handleSubmit = (data: GoalFormValues) => {
        // Sanitize "myself" value to null
        const payload = { ...data };
        if (payload.employee_id === "myself") {
            payload.employee_id = null as any;
        }
        onSubmit(payload);
    };

    const [step, setStep] = useState(1);
    const totalSteps = 3;

    const nextStep = async () => {
        let isValid = false;
        if (step === 1) {
            isValid = await form.trigger(['category', 'priority', 'employee_id']);
        } else if (step === 2) {
            isValid = await form.trigger(['title', 'description']);
        }
        
        if (isValid) setStep(s => s + 1);
    };
    
    const prevStep = () => setStep(s => s - 1);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                {/* Stepper Header */}
                <div className="flex justify-between items-center mb-8 px-2 relative">
                    <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted -z-10" />
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex flex-col items-center gap-2 bg-card px-2">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                                step === s ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background" : 
                                step > s ? "bg-primary text-primary-foreground opacity-70" : "bg-muted text-muted-foreground"
                            )}>
                                {s}
                            </div>
                            <span className={cn(
                                "text-xs font-medium",
                                step === s ? "text-primary" : "text-muted-foreground"
                            )}>
                                {s === 1 ? 'Classification' : s === 2 ? 'Details' : 'Metrics'}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="min-h-[300px]">
                    {/* STEP 1: Classification */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {teamMembers && teamMembers.length > 0 && (
                                <FormField
                                    control={form.control}
                                    name="employee_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Assign To</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select team member (Optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="myself">Myself</SelectItem>
                                                    {teamMembers.map(member => (
                                                        <SelectItem key={member.id} value={member.id}>
                                                            {member.name || member.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Leave blank or select "Myself" to assign to yourself.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="performance" disabled={!initialData || initialData.category !== 'performance'}>Performance (Auto-provisioned)</SelectItem>
                                                <SelectItem value="development">Development</SelectItem>
                                                <SelectItem value="project">Project</SelectItem>
                                                <SelectItem value="mission_aligned">Mission Aligned</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Identify the primary area this goal belongs to.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* STEP 2: Details */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Goal Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Increase sales by 10%" className="text-lg py-6" {...field} />
                                        </FormControl>
                                        <FormDescription>Make it actionable and specific.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <RichTextEditor 
                                                placeholder="Details about this goal..." 
                                                value={field.value || ""} 
                                                onChange={field.onChange} 
                                            />
                                        </FormControl>
                                        <FormDescription>Provide context on why this goal is important and how it will be achieved.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* STEP 3: Metrics & Timeline */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
                                <FormField
                                    control={form.control}
                                    name="start_date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Start Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="target_date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Target Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {(initialData?.goal_type === "performance" || initialData?.category === "performance" || form.watch("category") === "performance") && (
                                <FormField
                                    control={form.control}
                                    name="weight"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Weight (%)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="e.g. 20"
                                                    {...field}
                                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Weights for all performance goals must total exactly 100%.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <FormLabel>Key Results</FormLabel>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ title: "", target_value: 100, unit: "%" })}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Key Result
                                    </Button>
                                </div>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 items-start p-3 bg-card border rounded-lg shadow-sm">
                                        <div className="flex-1 space-y-3">
                                            <FormField
                                                control={form.control}
                                                name={`key_results.${index}.title`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Key Result Description" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex gap-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`key_results.${index}.target_value`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormControl>
                                                                <Input type="number" placeholder="Target" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`key_results.${index}.unit`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-24">
                                                            <FormControl>
                                                                <Input placeholder="Unit" {...field} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="mt-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between pt-6 border-t mt-8">
                    {step > 1 ? (
                        <Button type="button" variant="outline" onClick={prevStep}>
                            Back
                        </Button>
                    ) : (
                        <Button type="button" variant="ghost" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                    )}
                    
                    <div className="flex gap-4">
                        {step < totalSteps ? (
                            <Button type="button" onClick={nextStep}>
                                Continue
                            </Button>
                        ) : (
                            <>
                                <Button type="submit" variant="outline" disabled={isLoading || isSubmitLoading}>
                                    {isLoading ? "Saving..." : "Save Draft"}
                                </Button>
                                {onSaveAndSubmit && (!initialData || ['draft', 'revision_requested'].includes(initialData?.approval_status || '')) && (
                                    <Button
                                        type="button"
                                        variant="default"
                                        className="bg-primary hover:bg-primary/90 shadow-md"
                                        onClick={form.handleSubmit(handleSaveAndSubmit)}
                                        disabled={isLoading || isSubmitLoading}
                                    >
                                        {isSubmitLoading ? "Submitting..." : "Save & Submit"}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </form>
        </Form>
    );
}
