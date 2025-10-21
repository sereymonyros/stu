
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Moon, Sun, Plus, MoreHorizontal, MessageSquare, LogOut, User as UserIcon, LogIn, MessageSquareHeart } from "lucide-react";
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
    { href: "/jobs", label: "Jobs" },
    { href: "/dashboard", label: "Dashboard" },
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isRecruiter = userProfile?.userType === 'recruiter';

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
            <div className="relative pointer-events-auto flex items-center justify-center gap-2">
                
                {user && isRecruiter && (
                    <div className="pointer-events-auto">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="bg-background rounded-full h-10 w-10 shadow-lg" onClick={(e) => e.stopPropagation()}>
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

                <div className="min-w-48 bg-background rounded-full shadow-lg flex h-10 items-center justify-evenly font-medium flex-1">
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
                                        <span className="text-[10px] font-medium">{item.label}</span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
                
                <div className="flex-shrink-0 flex items-center gap-2 pointer-events-auto">
                     <DropdownMenu onOpenChange={setIsMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="bg-background rounded-full h-10 w-10 shadow-lg"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 p-2 mb-2 rounded-2xl shadow-2xl bg-zinc-100/80 dark:bg-zinc-950/80 backdrop-blur-lg" side="top" align="end">
                             {user && userProfile && (
                                <>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{userProfile.displayName ?? user.email}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut}>
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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
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
