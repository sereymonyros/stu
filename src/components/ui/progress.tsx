"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
    // Determine color based on value
    const getProgressColor = (progressValue: number | null | undefined) => {
        if (progressValue === null || progressValue === undefined) return 'bg-gray-400';
        if (progressValue < 40) return 'bg-red-500';
        if (progressValue < 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };
    
    const colorClass = getProgressColor(value);

    return (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-muted",
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn("h-full w-full flex-1 transition-all", colorClass)}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
