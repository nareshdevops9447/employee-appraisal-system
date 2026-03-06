import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGoalVersions } from "@/hooks/use-goal-approval";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface GoalVersionHistoryProps {
    goalId: string;
    currentVersion: number;
}

export function GoalVersionHistory({ goalId, currentVersion }: GoalVersionHistoryProps) {
    // Fetch version history using the hook
    const { data: versions, isLoading } = useGoalVersions(goalId);


    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
    }

    if (!versions || versions.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Version History</CardTitle>
                <CardDescription>Previous versions of this goal.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Version</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Changes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {versions.map((version) => (
                            <TableRow key={version.id}>
                                <TableCell>v{version.version_number}</TableCell>
                                <TableCell>{format(new Date(version.created_at), "MMM d, yyyy")}</TableCell>
                                <TableCell>{version.approval_status}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {/* Ideally show diff, for now just basic info */}
                                    {version.version_number === currentVersion ? "(Current)" : "View Details (Coming Soon)"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
