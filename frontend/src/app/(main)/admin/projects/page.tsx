
"use client";

import { useProjects } from "@/hooks/use-timesheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Settings, Check, X, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProjectsPage() {
    const { data: projects, isLoading } = useProjects();

    if (isLoading) return <Skeleton className="h-[400px] w-full" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        Project Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure project codes and descriptions for timesheet tracking.
                    </p>
                </div>
                <Button className="shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Create Project
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects?.map((project) => (
                    <Card key={project.id} className="border-0 shadow-md hover:shadow-lg transition-all border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                </div>
                                <Badge variant={project.is_active ? "default" : "secondary"}>
                                    {project.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="text-sm font-mono bg-muted/50 p-1 px-2 rounded inline-block">
                                    {project.code}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                    {project.description || "No description provided."}
                                </p>

                                <div className="pt-2">
                                    <Button variant="outline" size="sm" className="w-full">
                                        <Settings className="h-4 w-4 mr-2" /> Project Settings
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
