
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Briefcase } from "lucide-react";
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
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const handleScroll = () => {
            const currentScrollY = mainContent.scrollTop;

            // Add a small threshold to prevent flickering on minor scrolls
            if (Math.abs(currentScrollY - lastScrollY.current) < 10) {
                return;
            }

            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                // Scrolling down
                setIsVisible(false);
            } else {
                // Scrolling up
                setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };

        mainContent.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            mainContent.removeEventListener("scroll", handleScroll);
        };
    }, []);

    if (!user) {
        return null;
    }

    return (
        <div className={cn(
            "md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-t z-50 transition-transform duration-300 ease-in-out",
            isVisible ? "translate-y-0" : "translate-y-full"
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
