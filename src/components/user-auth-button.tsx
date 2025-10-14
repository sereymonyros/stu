
'use client';

import { useUser, useAuth, useDoc, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, User as UserIcon, LayoutDashboard, Settings, MessageSquare, MessageSquareHeart } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { useChatbot } from './chatbot-provider';
import { useAnimation } from '@/contexts/animation-context';
import { cn } from '@/lib/utils';

export function UserAuthButton() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { setOpen: setChatbotOpen } = useChatbot();
  const { isAvatarPopping } = useAnimation();


  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleAskAI = () => {
    setChatbotOpen(true);
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (user) {
    const fallbackText = userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className={cn("h-10 w-10", isAvatarPopping && 'animate-avatar-pop')}>
              <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName ?? 'User'} />
              <AvatarFallback>{fallbackText}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userProfile?.displayName ?? user.email}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
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
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button asChild>
      <Link href="/login">Login</Link>
    </Button>
  );
}
