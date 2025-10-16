
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { withdrawApplication } from "@/ai/flows/withdraw-application-flow";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";

interface WithdrawApplicationButtonProps {
    jobId: string;
}

export function WithdrawApplicationButton({ jobId }: WithdrawApplicationButtonProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const handleWithdraw = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Not authenticated" });
            return;
        }

        setIsWithdrawing(true);
        try {
            await withdrawApplication({ jobId, userId: user.uid });
            toast({ title: "Application Withdrawn", description: "You have successfully withdrawn your application." });
            // Use router.refresh() to refetch server-side data
            router.refresh();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Withdrawal Failed', description: error.message });
        } finally {
            setIsWithdrawing(false);
        }
    };

    return (
        <AlertDialog>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={isWithdrawing}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Withdraw Application</span>
                            </Button>
                        </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Withdraw Application</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                    <AlertDialogDescription className="py-3">
                        This will permanently remove your application for this role. This action cannot be undone. Are you sure?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleWithdraw} disabled={isWithdrawing} className="bg-destructive hover:bg-destructive/90">
                        {isWithdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
