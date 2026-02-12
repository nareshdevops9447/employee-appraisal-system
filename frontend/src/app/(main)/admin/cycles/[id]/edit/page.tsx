"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormDescription,
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
import { useRouter, useParams } from "next/navigation";
import { useUpdateCycle, useCycles } from "@/hooks/use-cycles";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import apiClient from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    cycle_type: z.enum(["annual", "quarterly", "probation"]),
    start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid date string",
    }),
    end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid date string",
    }),
    self_assessment_deadline: z.string().optional(),
    manager_review_deadline: z.string().optional(),
});

export default function EditCyclePage() {
    const router = useRouter();
    const params = useParams();
    const cycleId = params.id as string;
    const updateCycle = useUpdateCycle();

    // Fetch cycle details explicitly
    const { data: cycle, isLoading } = useQuery({
        queryKey: ["cycle", cycleId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/cycles/${cycleId}`);
            return data;
        }
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            cycle_type: "annual",
            start_date: "",
            end_date: "",
        },
    });

    // Populate form when data is loaded
    useEffect(() => {
        if (cycle) {
            form.reset({
                name: cycle.name,
                description: cycle.description || "",
                cycle_type: cycle.cycle_type || "annual",
                start_date: cycle.start_date, // Assuming ISO string yyyy-mm-dd
                end_date: cycle.end_date,
                self_assessment_deadline: cycle.self_assessment_deadline || "",
                manager_review_deadline: cycle.manager_review_deadline || "",
            });
        }
    }, [cycle, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        updateCycle.mutate({
            id: cycleId,
            data: values
        }, {
            onSuccess: () => {
                router.push("/admin/cycles");
            }
        });
    }

    if (isLoading) {
        return <div className="p-6"><Skeleton className="h-[400px] w-full" /></div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Cycle</h1>
                <p className="text-muted-foreground">Update cycle details and deadlines.</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cycle Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. 2025 Annual Review" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="cycle_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cycle Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="annual">Annual</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="probation">Probation</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="start_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Start Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="end_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="self_assessment_deadline"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Self Assessment Deadline</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="manager_review_deadline"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Manager Review Deadline</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Optional description..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateCycle.isPending}>
                            {updateCycle.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
