
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";

interface UserDisplayProps {
    userId: string;
    className?: string;
    showEmail?: boolean;
}

export function UserDisplay({ userId, className, showEmail = false }: UserDisplayProps) {
    const { data: user, isLoading } = useUser(userId);

    if (isLoading) {
        return <Skeleton className="h-4 w-24 inline-block align-middle" />;
    }

    if (!user) {
        return <span className={className}>User {userId.substring(0, 8)}...</span>;
    }

    const displayName = user.name || user.email || userId;

    return (
        <span className={className} title={user.email}>
            {displayName}
            {showEmail && user.email && user.name && (
                <span className="text-muted-foreground ml-1">&lt;{user.email}&gt;</span>
            )}
        </span>
    );
}
