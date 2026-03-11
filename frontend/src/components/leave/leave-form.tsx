
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays, isWeekend, addDays, isSameDay } from "date-fns";
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
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLeaveTypes, useCreateLeaveRequest, useHolidays } from "@/hooks/use-leave";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

const leaveFormSchema = z.object({
    leave_type_id: z.string().min(1, "Please select a leave type."),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    reason: z.string().min(5, "Reason must be at least 5 characters"),
    is_half_day: z.boolean(),
    half_day_period: z.enum(["FIRST_HALF", "SECOND_HALF"]).optional(),
}).refine((data) => {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return end >= start;
}, {
    message: "End date must be after start date",
    path: ["end_date"],
}).refine((data) => {
    return !isWeekend(new Date(data.start_date));
}, {
    message: "Leave cannot start on a weekend.",
    path: ["start_date"],
}).refine((data) => {
    return !isWeekend(new Date(data.end_date));
}, {
    message: "Leave cannot end on a weekend.",
    path: ["end_date"],
});

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

export function LeaveForm() {
    const router = useRouter();
    const { data: leaveTypes } = useLeaveTypes();
    const { data: holidays } = useHolidays();
    const createMutation = useCreateLeaveRequest();

    const form = useForm<LeaveFormValues>({
        resolver: zodResolver(leaveFormSchema),
        defaultValues: {
            leave_type_id: "",
            start_date: "",
            end_date: "",
            is_half_day: false,
            half_day_period: "FIRST_HALF",
            reason: "",
        },
    });

    const onSubmit = (values: LeaveFormValues) => {
        createMutation.mutate(values, {
            onSuccess: () => {
                router.push("/leave");
            },
        });
    };

    const isHalfDay = form.watch("is_half_day");
    const startDate = form.watch("start_date");
    const endDate = form.watch("end_date");

    let calculatedDays = 0;
    if (startDate && endDate) {
        if (isHalfDay) {
            calculatedDays = 0.5;
        } else {
            let current = new Date(startDate);
            const end = new Date(endDate);
            const holidayDates = holidays?.map(h => new Date(h.date)) || [];

            while (current <= end) {
                const isHolid = holidayDates.some(h => isSameDay(h, current));
                if (!isWeekend(current) && !isHolid) {
                    calculatedDays++;
                }
                current = addDays(current, 1);
            }
        }
    }

    return (
        <Card className="max-w-2xl mx-auto shadow-lg border-0">
            <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Leave Application Details
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="leave_type_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Leave Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a leave type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {leaveTypes?.map((type) => (
                                                <SelectItem key={type.id} value={type.id}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            <Input type="date" {...field} disabled={isHalfDay} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="is_half_day"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Half Day</FormLabel>
                                        <FormDescription>
                                            Check this if you are applying for a half day leave.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                if (checked) {
                                                    form.setValue("end_date", form.getValues("start_date"));
                                                }
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {isHalfDay && (
                            <FormField
                                control={form.control}
                                name="half_day_period"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Period</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select period" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="FIRST_HALF">First Half</SelectItem>
                                                <SelectItem value="SECOND_HALF">Second Half</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Leave</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Please provide a brief reason for your leave request"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {calculatedDays > 0 ? (
                            <div className="p-4 bg-muted/50 rounded-lg text-sm flex justify-between items-center">
                                <span className="font-medium">Total Duration:</span>
                                <span className="text-primary font-bold">{calculatedDays} day(s)</span>
                            </div>
                        ) : startDate && endDate && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-sm flex items-center gap-2 text-rose-600">
                                <Info className="h-4 w-4" />
                                <span>Selected range contains only non-working days.</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || calculatedDays === 0}
                                className="shadow-md"
                            >
                                {createMutation.isPending ? "Submitting..." : "Submit Application"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
