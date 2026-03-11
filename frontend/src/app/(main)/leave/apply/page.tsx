
"use client";

import { LeaveForm } from "@/components/leave/leave-form";

export default function ApplyLeavePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Apply for Leave</h1>
                <p className="text-muted-foreground mt-1">
                    Complete the form below to submit your leave request for approval.
                </p>
            </div>

            <div className="py-4">
                <LeaveForm />
            </div>
        </div>
    );
}
