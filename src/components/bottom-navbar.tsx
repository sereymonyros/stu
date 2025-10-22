
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Moon, Sun, Plus, MoreHorizontal, MessageSquare, LogOut, User as UserIcon, LogIn, MessageSquareHeart, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirestore, useAuth } from "@/firebase";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { doc } from "firebase/firestore";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "./ui/dropdown-menu";
import { useChatbot } from "./chatbot-provider";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

const navItems = [
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function BottomNavbar() {
    const pathname = usePathname();
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const firestore = useFirestore();
    const { setOpen: setChatbotOpen } = useChatbot();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            }, 150); // User is considered "stopped" after 150ms of no scrolling
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isMenuOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
            document.body.classList.add('body-lock');
        } else {
            document.body.classList.remove('body-lock');
            document.body.style.removeProperty('--scrollbar-width');
        }

        return () => {
            document.body.classList.remove('body-lock');
            document.body.style.removeProperty('--scrollbar-width');
        }
    }, [isMenuOpen]);

     const handleAskAI = () => {
        setChatbotOpen(true);
    };

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/');
    };
    
    return (
        <div className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 flex justify-center z-50 transition-opacity duration-1000",
            isScrolling ? "opacity-30" : "opacity-100",
            "pointer-events-none"
        )}>
            <div className="relative pointer-events-auto flex items-center justify-center gap-2 w-full">
                {user && isRecruiter && (
                    <div className="pointer-events-auto flex-shrink-0">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="border shadow-3xl bg-zinc-100/10 backdrop-blur-lg rounded-full h-12 w-12" onClick={(e) => e.stopPropagation()}>
                                        <Link href="/jobs/new"><Plus className="h-4 w-4" /></Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>Post a New Job</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}

                <div className="min-w-48 shadow-3xl bg-zinc-100/10 backdrop-blur-lg rounded-full flex h-12 items-center justify-evenly flex-1 border">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link 
                                key={item.href}
                                href={item.href}
                                className="inline-flex flex-col items-center justify-center h-full"
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-full h-full rounded-full transition-colors duration-200 font-medium",
                                    isActive ? "text-primary dark:text-white" : "dark:text-zinc-400"
                                )}>
                                    <div className="flex flex-col items-center justify-center px-4">
                                        <span>{item.label}</span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
                
                <div className="flex-shrink-0 pointer-events-auto">
                     <DropdownMenu onOpenChange={setIsMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-12 w-12 shadow-3xl bg-zinc-100/10 backdrop-blur-lg border"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-64 p-4 mb-2 rounded-3xl shadow-3xl bg-zinc-100/10 backdrop-blur-lg gap-3 flex flex-col border"
                            side="top"
                            align="end"
                        >
                             {user && userProfile && (
                                <>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{userProfile.displayName ?? user.email}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-zinc-900/20 dark:bg-zinc-100/20 -mx-4 -mt-2" />
                                </>
                             )}

                            <DropdownMenuItem onClick={handleAskAI}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>Ask AI Helper</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </DropdownMenuItem>
                            
                            {user ? (
                                <>
                                     <DropdownMenuItem asChild>
                                        <Link href="/profile">
                                            <UserIcon className="mr-2 h-4 w-4" />
                                            <span>Profile</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/feedback">
                                            <MessageSquareHeart className="mr-2 h-4 w-4" />
                                            <span>Give Feedback</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-900/20 dark:bg-zinc-100/20 -mx-4" />
                                    <DropdownMenuItem onClick={handleSignOut} className="-mt-1">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                     <DropdownMenuItem asChild>
                                         <Link href="/feedback">
                                            <MessageSquareHeart className="mr-2 h-4 w-4" />
                                            <span>Give Feedback</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-900/20 dark:bg-zinc-100/20 -mx-4" />
                                    <DropdownMenuItem asChild className="-mt-1">
                                         <Link href="/login">
                                            <LogIn className="mr-2 h-4 w-4" />
                                            <span>Login</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
