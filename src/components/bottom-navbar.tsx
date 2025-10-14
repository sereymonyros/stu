
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";
import { useState, useEffect, useRef } from "react";
import { useSettingsSheet } from "./settings-sheet";

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
            "md:hidden fixed bottom-4 left-2 right-2 h-16 bg-background/80 dark:bg-zinc-900/95 backdrop-blur-sm z-50 transition-opacity duration-1000 ease-in-out border rounded-full shadow-lg",
            isScrolling ? "opacity-30" : "opacity-100"
        )}>
            <div className="grid h-full grid-cols-4 max-w-lg mx-auto font-medium">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className="inline-flex flex-col items-center justify-center px-5 relative"
                        >
                            <div className={cn(
                                "flex items-center justify-center w-full h-full rounded-full transition-colors duration-200",
                                isActive ? "bg-primary/10 dark:bg-zinc-800" : "text-muted-foreground dark:text-zinc-400"
                            )}>
                                <div className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-full",
                                    isActive ? "text-primary dark:text-white" : ""
                                )}>
                                    <item.icon className="w-5 h-5 mb-1" />
                                    <span className="text-xs font-medium">{item.label}</span>
                                </div>
                            </div>
                        </Link>
                    )
                })}
                 <button
                    onClick={() => setSettingsOpen(true)}
                    className="inline-flex flex-col items-center justify-center px-5 text-muted-foreground dark:text-zinc-400"
                >
                    <Settings className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Settings</span>
                 </button>
            </div>
        </div>
    )
}
