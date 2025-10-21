
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, User, Settings, Moon, Sun, Plus, MoreHorizontal, MessageSquare, LogOut, MessageSquareHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirestore, useAuth } from "@/firebase";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { doc } from "firebase/firestore";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useChatbot } from "./chatbot-provider";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

const navItems = [
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile", icon: User },
];

export function BottomNavbar() {
    const pathname = usePathname();
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { theme, setTheme } = useTheme();
    const firestore = useFirestore();
    const { setOpen: setChatbotOpen } = useChatbot();

    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isRecruiter = userProfile?.userType === 'recruiter';

     const handleAskAI = () => {
        setChatbotOpen(true);
    };

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/');
    };


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

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 w-full flex justify-center z-50 transition-opacity duration-500 ease-in-out pointer-events-none",
            isScrolling ? "opacity-50" : "opacity-100"
        )}>
           {user && (
            <div className="relative w-full max-w-lg pointer-events-auto flex items-center justify-center gap-2">
                
                {isRecruiter && (
                    <div className="pointer-events-auto">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild size="icon" className="bg-background/80 backdrop-blur-sm border dark:text-white dark:border-white rounded-full h-12 w-12 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                        <Link href="/jobs/new"><Plus className="h-6 w-6" /></Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>Post a New Job</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}

                <div className="bg-background/80 dark:bg-zinc-900/80 backdrop-blur-sm border rounded-full shadow-lg flex h-12 items-center justify-evenly font-medium flex-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link 
                                key={item.href}
                                href={item.href}
                                className="inline-flex flex-col items-center justify-center"
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-full h-full rounded-full transition-colors duration-200 text-muted-foreground dark:text-zinc-400",
                                    isActive ? "text-primary dark:text-white" : ""
                                )}>
                                    <div className="flex flex-col items-center justify-center px-4">
                                        <item.icon className="h-5 w-5" />
                                        <span className="text-[10px] font-medium">{item.label}</span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
                
                <div className="flex items-center gap-2 pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-background/80 backdrop-blur-sm border rounded-full h-12 w-12 shadow-lg"
                        onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button
                                variant="ghost"
                                size="icon"
                                className="bg-background/80 backdrop-blur-sm border rounded-full h-12 w-12 shadow-lg"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mb-2" side="top" align="end">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userProfile?.displayName ?? user.email}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={handleAskAI}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>Ask AI Helper</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/feedback">
                                    <MessageSquareHeart className="mr-2 h-4 w-4" />
                                    <span>Give Feedback</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            )}
        </div>
    )
}
