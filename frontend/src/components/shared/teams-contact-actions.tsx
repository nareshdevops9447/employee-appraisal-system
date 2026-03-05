
"use client";

import { Button } from "@/components/ui/button";
import { MessageSquareMore, Phone, Mail, Video } from "lucide-react";

interface TeamsContactActionsProps {
    email: string;
    name?: string;
    /** "full" shows labeled buttons; "compact" shows icon-only */
    variant?: "full" | "compact";
    className?: string;
}

/**
 * Quick-contact buttons that deep-link into Microsoft Teams.
 * Works with any Entra ID / M365 user via their email address.
 */
export function TeamsContactActions({
    email,
    name,
    variant = "full",
    className = "",
}: TeamsContactActionsProps) {
    const chatUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}&message=${encodeURIComponent('')}`;
    const callUrl = `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(email)}`;
    const mailUrl = `mailto:${email}`;

    if (variant === "compact") {
        return (
            <div className={`flex items-center gap-1 ${className}`}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-[#6264a7]"
                    asChild
                    title={`Chat with ${name || email} on Teams`}
                >
                    <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                        <MessageSquareMore className="h-3.5 w-3.5" />
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-[#6264a7]"
                    asChild
                    title={`Call ${name || email} on Teams`}
                >
                    <a href={callUrl} target="_blank" rel="noopener noreferrer">
                        <Video className="h-3.5 w-3.5" />
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                    asChild
                    title={`Email ${name || email}`}
                >
                    <a href={mailUrl}>
                        <Mail className="h-3.5 w-3.5" />
                    </a>
                </Button>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Button
                variant="outline"
                size="sm"
                className="text-[#6264a7] border-[#6264a7]/30 hover:bg-[#6264a7]/10 hover:text-[#6264a7]"
                asChild
            >
                <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                    <MessageSquareMore className="h-4 w-4 mr-1.5" /> Chat
                </a>
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="text-[#6264a7] border-[#6264a7]/30 hover:bg-[#6264a7]/10 hover:text-[#6264a7]"
                asChild
            >
                <a href={callUrl} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-1.5" /> Call
                </a>
            </Button>
            <Button
                variant="outline"
                size="sm"
                asChild
            >
                <a href={mailUrl}>
                    <Mail className="h-4 w-4 mr-1.5" /> Email
                </a>
            </Button>
        </div>
    );
}
