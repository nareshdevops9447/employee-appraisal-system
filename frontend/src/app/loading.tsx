import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col space-y-4 p-8">
            <div className="flex items-center justify-between space-y-2">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-8 w-[100px]" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-[125px] w-full rounded-xl" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-[125px] w-full rounded-xl" />
                    <Skeleton className="h-[125px] w-full rounded-xl" />
                    <Skeleton className="h-[125px] w-full rounded-xl" />
                    <Skeleton className="h-[125px] w-full rounded-xl" />
                </div>
                <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
        </div>
    )
}
