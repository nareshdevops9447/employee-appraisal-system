
"use client";

import { useHolidays } from "@/hooks/use-leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function HolidayCalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { data: holidays, isLoading } = useHolidays(currentDate.getFullYear());

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    if (isLoading) {
        return <HolidaySkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Holiday Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        View upcoming public holidays and company events.
                    </p>
                </div>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold">
                        {format(currentDate, "MMMM yyyy")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="bg-background py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {day}
                            </div>
                        ))}

                        {/* Pad the start of the month */}
                        {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                            <div key={`pad-${i}`} className="bg-background h-24 p-2 opacity-50" />
                        ))}

                        {days.map((day) => {
                            const holiday = holidays?.find((h) => isSameDay(new Date(h.date), day));
                            return (
                                <div key={day.toString()} className="bg-background h-24 p-2 border-t border-l">
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? "h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center -ml-1 -mt-1" : ""}`}>
                                            {format(day, "d")}
                                        </span>
                                        {holiday && (
                                            <Badge variant={holiday.is_optional ? "outline" : "default"} className="text-[10px] px-1 py-0">
                                                Holiday
                                            </Badge>
                                        )}
                                    </div>
                                    {holiday && (
                                        <p className="mt-2 text-[10px] font-semibold text-premium-600 line-clamp-2 leading-tight">
                                            {holiday.name}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            Upcoming Holidays
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {holidays?.filter(h => new Date(h.date) >= new Date()).slice(0, 5).map((h) => (
                                <div key={h.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium">{h.name}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(h.date), "MMMM d, yyyy")}</p>
                                    </div>
                                    {h.is_optional && <Badge variant="outline">Optional</Badge>}
                                </div>
                            ))}
                            {(!holidays || holidays.filter(h => new Date(h.date) >= new Date()).length === 0) && (
                                <p className="text-center py-4 text-xs text-muted-foreground">No upcoming holidays scheduled.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function HolidaySkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-[250px]" />
            <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
    );
}
