
"use client";

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
import { Textarea } from "@/components/ui/textarea";
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

const goalFormSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(200),
    description: z.string().max(2000).optional(),
    category: z.enum(['performance', 'development', 'project', 'mission_aligned']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
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
}

export function GoalForm({ initialData, onSubmit, isLoading, employeeId, teamMembers }: GoalFormProps) {
    const form = useForm<GoalFormValues>({
        resolver: zodResolver(goalFormSchema),
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            category: initialData?.category || "performance",
            priority: initialData?.priority || "medium",
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

    const handleSubmit = (data: GoalFormValues) => {
        // Sanitize "myself" value to undefined
        const payload = { ...data };
        if (payload.employee_id === "myself") {
            payload.employee_id = undefined;
        }
        onSubmit(payload);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-6">
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
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Goal Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Increase sales by 10%" {...field} />
                                    </FormControl>
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
                                        <Textarea placeholder="Details about this goal..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
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
                                                <SelectItem value="performance">Performance</SelectItem>
                                                <SelectItem value="development">Development</SelectItem>
                                                <SelectItem value="project">Project</SelectItem>
                                                <SelectItem value="mission_aligned">Mission Aligned</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
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
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                />
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
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel>Key Results</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ title: "", target_value: 100, unit: "%" })}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add Key Result
                                </Button>
                            </div>
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start p-3 bg-muted/40 rounded-lg">
                                    <div className="flex-1 space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`key_results.${index}.title`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Key Result Title" {...field} />
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
                                        className="mt-1 hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="secondary" onClick={() => window.history.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Goal"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
