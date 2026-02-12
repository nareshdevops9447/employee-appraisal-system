
"use client";

import { Check, Circle, Dot } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
    { id: "self_assessment", label: "Self Assessment" },
    { id: "manager_review", label: "Manager Review" },
    { id: "meeting_scheduled", label: "Meeting" }, // Or meeting_completed
    { id: "acknowledged", label: "Acknowledged" }, // Final state
    { id: "completed", label: "Completed" },
];

export function WorkflowStepper({ currentStatus }: { currentStatus: string }) {
    const currentIndex = steps.findIndex(s => s.id === currentStatus);
    // Handle mapped statuses if needed (e.g. meeting_scheduled -> meeting)

    // Simple mapping approach:
    const statusOrder = [
        "not_started",
        "self_assessment",
        "manager_review",
        "meeting_scheduled",
        "meeting_completed",
        "acknowledged",
        "completed"
    ];
    const currentStepIndex = statusOrder.indexOf(currentStatus);

    // Map backend status to visual steps
    const visualSteps = [
        { label: "Self Assessment", matches: ["self_assessment"] },
        { label: "Manager Review", matches: ["manager_review"] },
        { label: "Meeting", matches: ["meeting_scheduled", "meeting_completed"] },
        { label: "Completion", matches: ["acknowledged", "completed"] },
    ];

    return (
        <div className="w-full py-4">
            <div className="flex items-center justify-between relative">
                {/* Connector Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10" />

                {visualSteps.map((step, index) => {
                    // Determine state of this visual step
                    // It's completed if the current status is AFTER this step's matches
                    // It's current if the current status is IN this step's matches
                    // It's upcoming otherwise

                    // Logic: find the index of the current status in the master list
                    // compare with the index of the first match of this step

                    const stepFirstStatusIndex = statusOrder.indexOf(step.matches[0]);
                    const stepLastStatusIndex = statusOrder.indexOf(step.matches[step.matches.length - 1]);

                    let state: 'completed' | 'current' | 'upcoming' = 'upcoming';

                    if (currentStepIndex > stepLastStatusIndex) state = 'completed';
                    else if (currentStepIndex >= stepFirstStatusIndex) state = 'current';

                    return (
                        <div key={step.label} className="flex flex-col items-center bg-background px-2">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                                state === 'completed' ? "bg-primary border-primary text-primary-foreground" :
                                    state === 'current' ? "border-primary text-primary" :
                                        "border-muted text-muted-foreground"
                            )}>
                                {state === 'completed' ? <Check className="w-4 h-4" /> :
                                    state === 'current' ? <Dot className="w-8 h-8" /> :
                                        <Circle className="w-4 h-4" />}
                            </div>
                            <span className={cn(
                                "text-xs mt-2 font-medium",
                                state === 'upcoming' ? "text-muted-foreground" : "text-foreground"
                            )}>{step.label}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
