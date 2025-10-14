
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, User, Settings, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";
import { useState, useEffect, useRef } from "react";
import { useSettingsSheet } from "./settings-sheet";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

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
    const { setOpen: setSettingsOpen } = useSettingsSheet();
    const { theme, setTheme } = useTheme();


    useEffect(() => {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const handleScroll = () => {
            setIsScrolling(true);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 1000);
        };

        mainContent.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            mainContent.removeEventListener("scroll", handleScroll);
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
            "fixed bottom-4 left-1/2 -translate-x-1/2 w-full px-4 flex justify-center z-50 transition-opacity duration-1000 ease-in-out pointer-events-none",
            isScrolling ? "opacity-30" : "opacity-100"
        )}>
            <div className="relative w-full max-w-lg pointer-events-auto" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                <div className="bg-background/80 dark:bg-gradient-to-r from-black via-blue-900 to-black backdrop-blur-sm border rounded-full shadow-lg py-2.5">
                    <div className="flex h-full items-center justify-evenly max-w-lg mx-auto font-medium">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link 
                                    key={item.href}
                                    href={item.href}
                                    className="inline-flex flex-col items-center justify-center relative"
                                    onClick={(e) => e.stopPropagation()}
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
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                    onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                >
                    <Sun className="h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </div>
    )
}
