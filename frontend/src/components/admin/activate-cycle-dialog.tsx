"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Play } from "lucide-react";
import { useState } from "react";
import { useDepartments } from "@/hooks/use-departments";

const criteriaSchema = z.object({
    department_id: z.string().optional(),
    employment_type: z.string().optional(),
    eligibility_rule: z.enum(["auto", "all", "full_cycle_only", "probation_only"]),
});

interface ActivateCycleDialogProps {
    cycleId: string;
    onActivate: (id: string, criteria: any) => void;
    isSync?: boolean;
}

export function ActivateCycleDialog({ cycleId, onActivate, isSync = false }: ActivateCycleDialogProps) {
    const [open, setOpen] = useState(false);
    const { data: departments } = useDepartments();

    const form = useForm<z.infer<typeof criteriaSchema>>({
        resolver: zodResolver(criteriaSchema),
        defaultValues: {
            department_id: "all",
            employment_type: "all",
            eligibility_rule: "auto",
        },
    });

    const onSubmit = (values: z.infer<typeof criteriaSchema>) => {
        onActivate(cycleId, values);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isSync ? (
                    <Button variant="outline" size="sm" className="w-full">
                        Sync Users
                    </Button>
                ) : (
                    <Button size="sm" className="w-full">
                        <Play className="mr-2 h-3 w-3" /> Activate
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isSync ? "Sync Users" : "Activate Cycle"}</DialogTitle>
                    <DialogDescription>
                        {isSync
                            ? "Add eligible users to this active cycle."
                            : "Start this cycle and generate appraisals."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="eligibility_rule"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Eligibility Rule</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select rule" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="auto">All Eligible (Apply Policy)</SelectItem>
                                            <SelectItem value="full_hike_only">Full Hike Only (12+ Months)</SelectItem>
                                            <SelectItem value="eligible_for_hike">All Hike Eligible (3+ Months)</SelectItem>
                                            <SelectItem value="probation_or_feedback">Probation/Feedback Only (&lt; 3 months)</SelectItem>
                                            <SelectItem value="all">Everyone (Force)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="employment_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Employment Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="All types" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="full_time">Full Time</SelectItem>
                                            <SelectItem value="contractor">Contractor</SelectItem>
                                            <SelectItem value="probation">Probation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="department_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="All departments" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments?.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">
                                {isSync ? "Sync" : "Activate"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
