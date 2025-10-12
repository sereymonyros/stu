
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";

const navItems = [
    { href: "/listings", icon: Store, label: "For Sale" },
    { href: "/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
]

export function BottomNavbar() {
    const pathname = usePathname();
    const { user } = useUser();

    if (!user) {
        return null;
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-50">
            <div className="grid h-full grid-cols-3 max-w-lg mx-auto font-medium">
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
