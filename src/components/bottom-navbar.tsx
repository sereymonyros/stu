
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, User, Settings, Moon, Sun, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSettingsSheet } from "./settings-sheet";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { doc } from "firebase/firestore";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";

const navItems = [
    { href: "/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNavbar() {
    const pathname = usePathname();
    const { user } = useUser();
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { theme, setTheme } = useTheme();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isRecruiter = userProfile?.userType === 'recruiter';


    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 500);
        };

        // Listen on the window object for global scroll events
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    if (!user) {
        return null;
    }

    return (
        <div className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 w-full px-4 flex justify-center z-50 transition-opacity duration-500 ease-in-out pointer-events-none",
            isScrolling ? "opacity-50" : "opacity-100"
        )}>
            <div className="relative w-full max-w-lg pointer-events-auto">
                <div className="bg-background/80 dark:bg-gradient-to-r from-black via-blue-900 to-black backdrop-blur-sm border rounded-full shadow-lg py-2">
                    <div className="flex h-full items-center justify-evenly max-w-lg mx-auto font-medium">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link 
                                    key={item.href}
                                    href={item.href}
                                    className="inline-flex flex-col items-center justify-center relative"
                                >
                                    <div className={cn(
                                        "flex items-center justify-center w-full h-full rounded-full transition-colors duration-200",
                                        isActive ? "bg-primary/10 dark:bg-white/10" : "text-muted-foreground dark:text-zinc-400"
                                    )}>
                                        <div className={cn(
                                            "flex flex-col items-center justify-center px-5 py-2 rounded-full",
                                            isActive ? "text-primary dark:text-white" : ""
                                        )}>
                                            <item.icon className="w-5 h-5 mb-1" />
                                            <span className="text-xs font-medium">{item.label}</span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
                 <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-7 w-7 rounded-full"
                    onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                >
                    <Sun className="h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
                {isRecruiter && (
                    <div className="absolute left-0 -top-2">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild size="icon" className="bg-background/80 backdrop-blur-sm border dark:text-white dark:border-white rounded-full h-10 w-10" onClick={(e) => e.stopPropagation()}>
                                        <Link href="/jobs/new"><Plus className="h-5 w-5" /></Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Post a New Job</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>
        </div>
    )
}
