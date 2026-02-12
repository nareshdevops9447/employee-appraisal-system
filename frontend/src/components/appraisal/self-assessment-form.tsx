
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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Appraisal } from "@/types/appraisal";

const formSchema = z.object({
    content: z.string().min(10, {
        message: "Self-assessment must be at least 10 characters.",
    }),
});

export function SelfAssessmentForm({ appraisal }: { appraisal: Appraisal }) {
    const queryClient = useQueryClient();

    // Parse existing content if available (assuming it's JSON or string)
    // The backend model says self_assessment is JSON, but types might say key-value
    // Let's assume for now it's a simple text field or a specific JSON structure we defined.
    // Checking type definition next will confirm. For now, assuming generic text/JSON.

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            content: appraisal.self_assessment_data?.content || "",
        },
    });

    const mutation = useMutation({
        mutationFn: async ({ values, isSubmit }: { values: z.infer<typeof formSchema>; isSubmit: boolean }) => {
            await apiClient.post(`/api/appraisals/${appraisal.id}/self-assessment`, {
                ...values,
                is_submit: isSubmit,
            });
        },
        onSuccess: (_, variables) => {
            toast.success(variables.isSubmit ? "Self-assessment submitted" : "Draft saved");
            queryClient.invalidateQueries({ queryKey: ['appraisals', appraisal.id] });
        },
        onError: () => {
            toast.error("Failed to save/submit assessment");
        }
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Default submit handler (triggered by Enter? or just generic submit)
        // We'll handle buttons explicitly
    }


    return (
        <Form {...form}>
            <form className="space-y-8">
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }: { field: any }) => (
                        <FormItem>
                            <FormLabel>Self Assessment</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe your achievements..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={form.handleSubmit((values: any) => mutation.mutate({ values, isSubmit: false }))}
                    >
                        Save Draft
                    </Button>
                    <Button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={form.handleSubmit((values: any) => mutation.mutate({ values, isSubmit: true }))}
                    >
                        {mutation.isPending ? "Processing..." : "Submit Assessment"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
