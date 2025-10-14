import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-3xl bg-card text-card-foreground shadow-xl transition-shadow duration-300",
      
      // === AGGRESSIVE SHINE REDESIGN ===
      // 1. **Inner Shine/Border:** Use 'ring' for a sharp, visible light-catching edge.
      //    We use a very low opacity white (white/50) for a clean highlight.
      "dark:ring-1 dark:ring-white/10",

      // 2. **Outer Glow/Shadow:** Use a custom box-shadow with higher opacity (0.1 to 0.2)
      //    and a large spread/blur to create the 'lift' and 'halo' effect.
      //    Using a pale blue/cyan gives it a modern "neon" feel.
      "dark:shadow-[0_0px_20px_rgba(255,255,255,0.1)]", // Base glow (Pale White)

      // 3. **Hover Effect:** Intensify the glow on hover for a dramatic lift.
      "dark:hover:shadow-[0_0px_30px_rgba(255,255,255,0.2)]",
      
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
