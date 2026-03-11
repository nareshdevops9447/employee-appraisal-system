
"use client";

import { useLeaveTypes } from "@/hooks/use-leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Check, X, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLeaveTypesPage() {
    const { data: leaveTypes, isLoading } = useLeaveTypes();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-[250px]" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        Leave Type Configurations
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure available leave types, their annual allowances, and approval rules.
                    </p>
                </div>
                <Button className="shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Add Leave Type
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leaveTypes?.map((type) => (
                    <Card key={type.id} className="border-0 shadow-md hover:shadow-lg transition-all border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{type.name}</CardTitle>
                                <Badge variant={type.is_active ? "default" : "secondary"}>
                                    {type.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                    {type.description || "No description provided."}
                                </p>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-muted/50 rounded flex flex-col items-center">
                                        <span className="text-muted-foreground block mb-1">Allowance</span>
                                        <span className="font-bold text-sm">{type.default_days_per_year} Days</span>
                                    </div>
                                    <div className="p-2 bg-muted/50 rounded flex flex-col items-center">
                                        <span className="text-muted-foreground block mb-1">Paid Leave</span>
                                        <span className="font-bold text-sm">{type.is_paid ? "Yes" : "No"}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs pt-2">
                                    <div className="flex items-center gap-1">
                                        {type.requires_approval ? (
                                            <Check className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                            <X className="h-3 w-3 text-rose-500" />
                                        )}
                                        <span>Requires Approval</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button variant="outline" size="sm" className="w-full">
                                        <Settings className="h-4 w-4 mr-2" /> Edit Configuration
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
