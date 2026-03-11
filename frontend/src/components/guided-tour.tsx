"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from "react-joyride";
import { useMe } from "@/hooks/use-user";
import apiClient from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

function CustomTooltip({
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    isLastStep,
}: TooltipRenderProps) {
    return (
        <div {...tooltipProps} className="bg-card text-card-foreground border border-border rounded-xl shadow-xl w-80 p-5 space-y-4">
            {step.title && <h3 className="font-semibold text-lg">{step.title}</h3>}
            <div className="text-sm leading-relaxed text-muted-foreground">
                {step.content}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-2" {...closeProps}>
                    Skip
                </Button>
                <div className="flex gap-2">
                    {index > 0 && (
                        <Button variant="outline" size="sm" className="h-8" {...backProps}>
                            Back
                        </Button>
                    )}
                    <Button size="sm" className="h-8 shadow-sm" {...primaryProps}>
                        {isLastStep ? "Finish" : "Next"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function GuidedTour() {
    const { data: user, isLoading } = useMe();
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);

    useEffect(() => {
        if (!isLoading && user && !user.has_completed_tour && pathname === "/dashboard") {
            const roleSteps = getStepsForRole(user.role);
            setSteps(roleSteps);
            // Add a small delay to ensure DOM elements (like sidebar links) are fully rendered
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isLoading, user, pathname]);

    const handleJoyrideCallback = async (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            // Mark tour as completed in backend
            try {
                await apiClient.post("/api/users/me/tour");
                queryClient.invalidateQueries({ queryKey: ["users", "me"] });
            } catch (error) {
                console.error("Failed to mark tour as completed", error);
            }
        }
    };

    if (!run || steps.length === 0) return null;

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton
            run={run}
            scrollToFirstStep
            showProgress={false}
            showSkipButton
            steps={steps}
            tooltipComponent={CustomTooltip}
            styles={{
                options: {
                    zIndex: 10000,
                    overlayColor: "rgba(0, 0, 0, 0.4)",
                    arrowColor: "hsl(var(--card))",
                },
            }}
        />
    );
}

function getStepsForRole(role: string): Step[] {
    const rawBaseSteps: Step[] = [
        {
            content: <h2>Welcome to the Employee Appraisal System! Let's take a quick tour.</h2>,
            placement: "center",
            target: "body",
        },
        {
            target: "[data-tour='dashboard']",
            content: "This is your Dashboard. You'll see a quick summary of your active goals, upcoming deadlines, and appraisal progress here.",
            placement: "right",
            title: "Dashboard Overview",
        },
        {
            target: "[data-tour='my-appraisals']",
            content: "When appraisal season arrives, you'll complete your self-assessments and view your manager's feedback in this tab.",
            placement: "right",
            title: "Appraisals",
        },
        {
            target: "[data-tour='my-goals']",
            content: "Head over to My Goals to create and track your specific objectives (OKRs). Don't forget to keep your progress updated!",
            placement: "right",
            title: "Goal Tracking",
        },
        {
            target: "[data-tour='notifications']",
            content: "Keep an eye on this bell! We'll notify you here when goals are approved, comments are left, or appraisals are finalized.",
            placement: "right",
            title: "Notifications",
        },
    ];

    let roleSteps = [...rawBaseSteps];

    if (role === "manager") {
        roleSteps.push({
            target: "[data-tour='team']",
            content: "As a Manager, your Team tab is crucial. Here you can review your direct reports' appraisals and manage their goals.",
            placement: "right",
            title: "Team Management",
        });
    } else if (role === "hr_admin" || role === "super_admin") {
        roleSteps.push(
            {
                target: "[data-tour='reports']",
                content: "HR Admins have access to the global Reports dashboard to see organizational compliance and rating distributions.",
                placement: "right",
                title: "HR Reports",
            },
            {
                target: "[data-tour='cycles']",
                content: "Manage the core timeline of the organization by creating and activating Appraisal Cycles here.",
                placement: "right",
                title: "Appraisal Cycles",
            }
        );
    }

    return roleSteps.map(step => ({
        ...step,
        tooltipComponent: CustomTooltip,
    }));
}


