
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";
import { useState, useEffect, useRef } from "react";

const navItems = [
    { href: "/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
]

export function BottomNavbar() {
    const pathname = usePathname();
    const { user } = useUser();
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            }, 150); // Adjust delay as needed
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
            "md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm z-50 transition-opacity duration-300 ease-in-out",
            isScrolling ? "opacity-50" : "opacity-100"
        )}>
            <div className="grid h-full grid-cols-2 max-w-lg mx-auto font-medium">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted group",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="w-5 h-5 mb-1" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
