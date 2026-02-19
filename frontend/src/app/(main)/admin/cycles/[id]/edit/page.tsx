"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCycles, useUpdateCycle } from "@/hooks/use-cycles";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useParams } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const cycleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["annual", "mid_year", "probation"]),
    startDate: z.date(),
    endDate: z.date(),
});

export default function EditCyclePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    // We fetch all cycles and find the one we need, or we could fetch single (useGetCycle not strictly in hooks but GET /:id exists)
    // efficient enough for now to use the cached list or fetch list
    const { data: cycles, isLoading } = useCycles();
    const updateCycle = useUpdateCycle();

    const cycle = cycles?.find((c: any) => c.id === id);

    const form = useForm<z.infer<typeof cycleSchema>>({
        resolver: zodResolver(cycleSchema),
        defaultValues: {
            name: "",
            type: "annual",
        },
    });

    // Populate form when data is ready
    useEffect(() => {
        if (cycle) {
            form.reset({
                name: cycle.name,
                type: (cycle.cycle_type || cycle.type) as any,
                startDate: new Date(cycle.start_date || cycle.startDate),
                endDate: new Date(cycle.end_date || cycle.endDate),
            });
        }
    }, [cycle, form]);

    const onSubmit = (values: z.infer<typeof cycleSchema>) => {
        updateCycle.mutate({
            id,
            data: {
                name: values.name,
                cycle_type: values.type,
                start_date: values.startDate.toISOString(),
                end_date: values.endDate.toISOString(),
            },
        }, {
            onSuccess: () => router.push("/admin/cycles"),
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!cycle && !isLoading) {
        return <div className="p-8">Cycle not found</div>;
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Cycle</h1>
                <p className="text-muted-foreground">Update appraisal cycle details.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Cycle Details</CardTitle>
                    <CardDescription>Update the parameters for this review period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }: { field: any }) => (
                                    <FormItem>
                                        <FormLabel>Cycle Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 2025 Annual Review" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }: { field: any }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a cycle type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="annual">Annual</SelectItem>
                                                <SelectItem value="mid_year">Half Yearly</SelectItem>
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
                                    name="startDate"
                                    render={({ field }: { field: any }) => (
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
                                    name="endDate"
                                    render={({ field }: { field: any }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>End Date</FormLabel>
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

                            <div className="flex justify-end gap-4">
                                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                                <Button type="submit" disabled={updateCycle.isPending}>
                                    {updateCycle.isPending ? "Updating..." : "Update Cycle"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
