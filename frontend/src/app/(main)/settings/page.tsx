
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your application preferences.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>Configure how you receive notifications.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="appraisal-updates" className="flex flex-col space-y-1">
                                <span>Appraisal Updates</span>
                                <span className="font-normal text-xs text-muted-foreground">Receive emails when your appraisal status changes.</span>
                            </Label>
                            <Switch id="appraisal-updates" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="goal-reminders" className="flex flex-col space-y-1">
                                <span>Goal Reminders</span>
                                <span className="font-normal text-xs text-muted-foreground">Receive reminders about upcoming goal deadlines.</span>
                            </Label>
                            <Switch id="goal-reminders" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="marketing-emails" className="flex flex-col space-y-1">
                                <span>Marketing</span>
                                <span className="font-normal text-xs text-muted-foreground">Receive news and updates about the platform.</span>
                            </Label>
                            <Switch id="marketing-emails" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Display</CardTitle>
                        <CardDescription>Customize your view of the application.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="compact-mode" className="flex flex-col space-y-1">
                                <span>Compact Mode</span>
                                <span className="font-normal text-xs text-muted-foreground">Use a denser layout for lists and tables.</span>
                            </Label>
                            <Switch id="compact-mode" />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                                <span>Dark Mode</span>
                                <span className="font-normal text-xs text-muted-foreground">Toggle dark mode manually (system default is used otherwise).</span>
                            </Label>
                            <Switch id="dark-mode" />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-end">
                <Button>Save Preferences</Button>
            </div>
        </div>
    );
}
