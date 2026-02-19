
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatCardProps {
    title: string
    value: string | number
    description?: string
    icon: LucideIcon
    className?: string
    href?: string
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    className,
    href,
}: StatCardProps) {
    const cardContent = (
        <Card className={cn(
            className,
            href && "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-primary/30"
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground">{description}</p>
                )}
            </CardContent>
        </Card>
    )

    if (href) {
        return <Link href={href} className="block">{cardContent}</Link>
    }

    return cardContent
}
