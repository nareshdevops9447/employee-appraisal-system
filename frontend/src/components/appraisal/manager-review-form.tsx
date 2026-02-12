
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Appraisal } from "@/types/appraisal";

const formSchema = z.object({
    rating: z.coerce.number().min(1).max(5),
    comments: z.string().min(10),
});

export function ManagerReviewForm({ appraisal }: { appraisal: Appraisal }) {
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            rating: appraisal.overall_rating || 0,
            comments: appraisal.manager_assessment_data?.comments || "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            await apiClient.post(`/api/appraisals/${appraisal.id}/manager-review`, values);
        },
        onSuccess: () => {
            toast.success("Manager review submitted successfully");
            queryClient.invalidateQueries({ queryKey: ['appraisals', appraisal.id] });
        },
        onError: (error) => {
            toast.error("Failed to submit review");
        }
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutation.mutate(values);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rating (1-5)</FormLabel>
                            <FormControl>
                                <Input type="number" min={1} max={5} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Manager Comments</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Provide feedback..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
            </form>
        </Form>
    );
}
