
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

interface WithdrawApplicationButtonProps {
    jobId: string;
    onWithdrawSuccess: () => void;
}

export function WithdrawApplicationButton({ jobId, onWithdrawSuccess }: WithdrawApplicationButtonProps) {
    const { user } = useUser();
    const { toast } = useToast();
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
            onWithdrawSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Withdrawal Failed', description: error.message });
        } finally {
            setIsWithdrawing(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isWithdrawing}>
                    <Trash2 className="mr-2 h-4 w-4" /> Withdraw
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                    <AlertDialogDescription>
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
