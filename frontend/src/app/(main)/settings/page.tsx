"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { Preferences, DEFAULT_PREFERENCES } from "@/lib/preferences-store";

// ─── Setting row sub-component ────────────────────────────────────

interface SettingRowProps {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    disabled?: boolean;
}

function SettingRow({ id, label, description, checked, onCheckedChange, disabled }: SettingRowProps) {
    return (
        <div className="flex items-center justify-between space-x-2">
            <Label htmlFor={id} className="flex flex-col space-y-1">
                <span>{label}</span>
                <span className="font-normal text-xs text-muted-foreground">{description}</span>
            </Label>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
            />
        </div>
    );
}

// ─── Settings page ────────────────────────────────────────────────

export default function SettingsPage() {
    const { data: serverPrefs, isLoading } = usePreferences();
    const updateMutation = useUpdatePreferences();

    // Local form state — toggles don't apply until Save
    const [form, setForm] = useState<Preferences>(DEFAULT_PREFERENCES);
    const [initialForm, setInitialForm] = useState<Preferences>(DEFAULT_PREFERENCES);

    // Sync server state → local form when data arrives
    useEffect(() => {
        if (serverPrefs) {
            const merged = { ...DEFAULT_PREFERENCES, ...serverPrefs };
            setForm(merged);
            setInitialForm(merged);
        }
    }, [serverPrefs]);

    // Dirty tracking — only enable Save when something changed
    const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

    const toggle = (key: keyof Preferences) => (value: boolean) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateMutation.mutate(form, {
            onSuccess: (data) => {
                const merged = { ...DEFAULT_PREFERENCES, ...data };
                setInitialForm(merged);
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your application preferences.</p>
            </div>

            <div className="grid gap-6">
                {/* ── Notifications ────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>Configure how you receive notifications.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <SettingRow
                            id="appraisal-updates"
                            label="Appraisal Updates"
                            description="Receive emails when your appraisal status changes."
                            checked={form.notify_appraisal_updates}
                            onCheckedChange={toggle('notify_appraisal_updates')}
                        />
                        <SettingRow
                            id="goal-reminders"
                            label="Goal Reminders"
                            description="Receive reminders about upcoming goal deadlines."
                            checked={form.notify_goal_reminders}
                            onCheckedChange={toggle('notify_goal_reminders')}
                        />
                        <SettingRow
                            id="marketing-emails"
                            label="Marketing"
                            description="Receive news and updates about the platform."
                            checked={form.notify_marketing}
                            onCheckedChange={toggle('notify_marketing')}
                        />
                    </CardContent>
                </Card>

                {/* ── Display ─────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Display</CardTitle>
                        <CardDescription>Customize your view of the application.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <SettingRow
                            id="compact-mode"
                            label="Compact Mode"
                            description="Use a denser layout for lists and tables."
                            checked={form.compact_mode}
                            onCheckedChange={toggle('compact_mode')}
                        />
                        <SettingRow
                            id="dark-mode"
                            label="Dark Mode"
                            description="Toggle dark mode manually (system default is used otherwise)."
                            checked={form.dark_mode}
                            onCheckedChange={toggle('dark_mode')}
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={!isDirty || updateMutation.isPending}
                >
                    {updateMutation.isPending ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        'Save Preferences'
                    )}
                </Button>
            </div>
        </div>
    );
}
