
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
    comments: z.string().optional(),
});

export function AcknowledgementForm({ appraisal }: { appraisal: Appraisal }) {
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            comments: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            await apiClient.post(`/api/appraisals/${appraisal.id}/acknowledge`, values);
        },
        onSuccess: () => {
            toast.success("Appraisal acknowledged");
            queryClient.invalidateQueries({ queryKey: ['appraisals', appraisal.id] });
        },
        onError: () => {
            toast.error("Failed to acknowledge");
        }
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutation.mutate(values);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="bg-muted p-4 rounded-md mb-4">
                    <p className="text-sm text-muted-foreground">
                        By submitting this form, you acknowledge that you have reviewed your manager's assessment and discussed it with them.
                    </p>
                </div>
                <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }: { field: any }) => (
                        <FormItem>
                            <FormLabel>Additional Comments (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Any final thoughts..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Acknowledging..." : "Acknowledge & Close"}
                </Button>
            </form>
        </Form>
    );
}
