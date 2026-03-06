'use client'

import { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground space-y-4 p-4 text-center">
            <div className="bg-destructive/10 p-4 rounded-full">
                <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-4xl font-bold">Oops!</h1>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground max-w-md">
                {error.message || "An unexpected error occurred while processing your request."}
            </p>
            <div className="flex gap-4">
                <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
                    Go to Dashboard
                </Button>
                <Button onClick={() => reset()}>Try again</Button>
            </div>
        </div>
    )
}
