"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { AppraisalStatus } from "@/types/appraisal";
import { STATUS_LABELS, STATUS_ORDER } from "@/types/appraisal";

interface WorkflowStepperProps {
    currentStatus: AppraisalStatus;
}

export function WorkflowStepper({ currentStatus }: WorkflowStepperProps) {
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between">
                {STATUS_ORDER.map((status, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                        <div key={status} className="flex items-center flex-1 last:flex-none">
                            {/* Step circle */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                                        isCompleted && "border-green-600 bg-green-600 text-white",
                                        isCurrent && "border-blue-600 bg-blue-600 text-white",
                                        !isCompleted && !isCurrent && "border-gray-300 bg-white text-gray-400"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "mt-2 text-xs text-center max-w-[80px] leading-tight",
                                        isCurrent && "font-semibold text-blue-600",
                                        isCompleted && "text-green-600",
                                        !isCompleted && !isCurrent && "text-gray-400"
                                    )}
                                >
                                    {STATUS_LABELS[status]}
                                </span>
                            </div>

                            {/* Connector line */}
                            {idx < STATUS_ORDER.length - 1 && (
                                <div
                                    className={cn(
                                        "flex-1 h-0.5 mx-2 mt-[-1.5rem]",
                                        idx < currentIdx ? "bg-green-600" : "bg-gray-200"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}