import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGoalAudit } from "@/hooks/use-goal-approval";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { UserDisplay } from "@/components/user-display";

interface GoalAuditTrailProps {
    goalId: string;
}

export function GoalAuditTrail({ goalId }: GoalAuditTrailProps) {
    const { data: audits, isLoading } = useGoalAudit(goalId);

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
    }

    if (!audits || audits.length === 0) {
        return <div className="text-sm text-muted-foreground p-4">No audit history available.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Version</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {audits.map((audit) => (
                        <TableRow key={audit.id}>
                            <TableCell className="text-sm">
                                {format(new Date(audit.timestamp), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-sm">
                                <UserDisplay userId={audit.changed_by_user_id} /> <span className="text-xs text-muted-foreground">({audit.changed_by_role})</span>
                            </TableCell>
                            <TableCell className="text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="line-through text-muted-foreground">{audit.old_status}</span>
                                    <span>→</span>
                                    <span className="font-medium">{audit.new_status}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">v{audit.version_number}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
