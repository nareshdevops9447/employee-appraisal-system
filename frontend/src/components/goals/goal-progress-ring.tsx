
import { cn } from "@/lib/utils";

interface GoalProgressRingProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export function GoalProgressRing({
    progress,
    size = 60,
    strokeWidth = 4,
    className,
}: GoalProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/20"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn(
                        "text-primary transition-all duration-500 ease-in-out",
                        progress >= 100 && "text-green-500",
                        progress > 0 && progress < 100 && "text-blue-500",
                        // overdue logic could be passed in className
                    )}
                />
            </svg>
            <span className="absolute text-xs font-semibold">
                {Math.round(progress)}%
            </span>
        </div>
    );
}
