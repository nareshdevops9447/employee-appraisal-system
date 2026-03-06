
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
    gradient?: string
    iconColor?: string
    iconBg?: string
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    className,
    href,
    gradient = "from-violet-500/10 via-transparent to-transparent",
    iconColor = "text-violet-600",
    iconBg = "bg-violet-100",
}: StatCardProps) {
    const cardContent = (
        <Card className={cn(
            "relative overflow-hidden border-0 shadow-md transition-all duration-200",
            href && "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
            className,
        )}>
            <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", iconBg)}>
                    <Icon className={cn("h-4 w-4", iconColor)} />
                </div>
            </CardHeader>
            <CardContent className="relative">
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    )

    if (href) {
        return <Link href={href} className="block">{cardContent}</Link>
    }

    return cardContent
}
