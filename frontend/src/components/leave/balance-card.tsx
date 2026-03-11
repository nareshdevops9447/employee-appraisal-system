
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LeaveBalance } from "@/types/leave";
import { Calendar } from "lucide-react";

interface BalanceCardProps {
    balance: LeaveBalance;
}

export function BalanceCard({ balance }: BalanceCardProps) {
    const percentage = (balance.used_days / balance.total_days) * 100;

    return (
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {balance.leave_type_name}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{balance.remaining_days} days</div>
                <p className="text-xs text-muted-foreground">
                    Remaining of {balance.total_days} days total
                </p>
                <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span>Used: {balance.used_days}d</span>
                        <span>Pending: {balance.pending_days}d</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                </div>
            </CardContent>
        </Card>
    );
}
