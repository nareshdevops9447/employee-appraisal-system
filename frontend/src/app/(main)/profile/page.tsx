
"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText } from "lucide-react";

export default function ProfilePage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    const user = session?.user;

    if (!user) return <div>Please log in to view your profile.</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground">Manage your personal information and account settings.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Info */}
                <Card className="w-full lg:w-80 h-fit">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                                <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle>{user.name}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                        <div className="mt-4">
                            <Badge variant="outline" className="capitalize">{user.role}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Department</span>
                                <span className="font-medium">Engineering</span> {/* TODO: Fetch from user profile */}
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Location</span>
                                <span className="font-medium">Remote</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Joined</span>
                                <span className="font-medium">Jan 2024</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    <Tabs defaultValue="details">
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="activity">My Activity</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Personal Information</CardTitle>
                                    <CardDescription>Update your contact details.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input id="firstName" defaultValue={user.name?.split(' ')[0]} disabled />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input id="lastName" defaultValue={user.name?.split(' ').slice(1).join(' ')} disabled />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" defaultValue={user.email || ''} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" placeholder="+1 (555) 000-0000" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bio">Bio</Label>
                                        <Input id="bio" placeholder="Tell us a little about yourself" />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button>Save Changes</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="activity">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Activity Log</CardTitle>
                                    <CardDescription>Your recent interactions and updates.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {/* Mock Activity Items */}
                                        <div className="flex gap-4">
                                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full h-fit">
                                                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Submitted Self-Assessment</p>
                                                <p className="text-xs text-muted-foreground">2025 Annual Review • 2 days ago</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full h-fit">
                                                <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Updated Goal: Learn Rust</p>
                                                <p className="text-xs text-muted-foreground">Progress increased to 40% • 5 days ago</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
