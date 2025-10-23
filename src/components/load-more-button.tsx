
'use client';

import { Button } from "./ui/button";

interface LoadMoreButtonProps {
    onClick: () => void;
    isLoading: boolean;
}

export function LoadMoreButton({ onClick, isLoading }: LoadMoreButtonProps) {
    return (
        <Button onClick={onClick} disabled={isLoading} variant="outline">
            {isLoading ? 'Loading...' : 'Load More'}
        </Button>
    );
}
