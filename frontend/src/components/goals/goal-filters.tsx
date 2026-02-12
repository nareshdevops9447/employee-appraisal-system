
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

export function GoalFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Local state for filters to avoid excessive URL updates on every keystroke
    const [title, setTitle] = useState(searchParams.get("title") || "");
    const [date, setDate] = useState<Date | undefined>(
        searchParams.get("date") ? new Date(searchParams.get("date")!) : undefined
    );

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const handleFilterChange = (name: string, value: string) => {
        router.push(pathname + "?" + createQueryString(name, value));
    };

    const clearFilters = () => {
        setTitle("");
        setDate(undefined);
        router.push(pathname);
    };

    const handleDateSelect = (date: Date | undefined) => {
        setDate(date);
        if (date) {
            // Filter goals due ON or AFTER this date? Or exactly? 
            // Usually filtering by month or "due soon". 
            // Let's stick to a simple single date for now, acting as "Target Date" filter
            router.push(pathname + "?" + createQueryString("date", date.toISOString()));
        } else {
            router.push(pathname + "?" + createQueryString("date", ""));
        }
    }

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search goals..."
                    className="pl-9"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        // Debounce logic would go here ideally
                        if (e.target.value === "") handleFilterChange("title", "");
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleFilterChange("title", title);
                    }}
                />
            </div>

            <Select
                value={searchParams.get("status") || "all"}
                onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value)}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={searchParams.get("priority") || "all"}
                onValueChange={(value) => handleFilterChange("priority", value === "all" ? "" : value)}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        {date ? format(date, "PPP") : <span>Pick a due date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {(searchParams.toString().length > 0) && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
