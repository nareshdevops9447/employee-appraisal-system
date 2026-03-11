
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeaveRequest, LeaveStatus } from "@/types/leave";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { XCircle, Eye } from "lucide-react";
import { useState } from "react";
import { LeaveDetailsDialog } from "./leave-details-dialog";

interface RequestTableProps {
    requests: LeaveRequest[];
    onCancel?: (id: string) => void;
    showUser?: boolean;
}

export function RequestTable({ requests, onCancel, showUser = false }: RequestTableProps) {
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const handleView = (request: LeaveRequest) => {
        setSelectedRequest(request);
        setIsDetailsOpen(true);
    };

    const getStatusVariant = (status: LeaveStatus) => {
        switch (status) {
            case 'APPROVED': return 'default';
            case 'PENDING': return 'secondary';
            case 'REJECTED': return 'destructive';
            case 'CANCELLED': return 'outline';
            default: return 'outline';
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {showUser && <TableHead>Employee</TableHead>}
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={showUser ? 6 : 5} className="h-24 text-center">
                                No leave requests found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        requests.map((request) => (
                            <TableRow key={request.id}>
                                {showUser && <TableCell>{request.user_name || `ID: ${request.user_id}`}</TableCell>}
                                <TableCell className="font-medium">{request.leave_type_name}</TableCell>
                                <TableCell>
                                    {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>{request.duration_days} days</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(request.status)}>
                                        {request.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleView(request)}
                                        className="text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                    </Button>
                                    {(request.status === 'PENDING' || request.status === 'APPROVED') && onCancel && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onCancel(request.id)}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Cancel
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <LeaveDetailsDialog
                request={selectedRequest}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
            />
        </div>
    );
}
