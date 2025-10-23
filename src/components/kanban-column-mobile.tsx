
'use client';

import * as React from "react"
import { useMemo } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

export function KanbanColumnMobile({ id, title, children, items, isLoading }: { id: string, title: string, children: React.ReactNode, items: any[], isLoading: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const itemIds = useMemo(() => items.map(i => i.id), [items]);

    const titleColors: { [key: string]: string } = {
        submitted: 'border-blue-500',
        reviewed: 'border-yellow-500',
        offered: 'border-purple-500',
        accepted: 'border-green-500',
        rejected: 'border-red-500',
    };

    return (
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col flex-1">
            <Card ref={setNodeRef} className={cn(
                "h-full flex flex-col transition-colors rounded-3xl",
                isOver ? 'bg-primary/10 cursor-copy' : 'bg-muted/40',
            )}>
                <CardHeader className={cn("px-3 py-2 border-b-4 select-none", titleColors[id] || 'border-gray-500')}>
                    <CardTitle className="text-sm font-semibold capitalize flex justify-between items-center">
                        <span>{title}</span>
                        <span className="text-sm font-normal bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center">{items.length}</span>
                    </CardTitle>
                </CardHeader>
                <div
                    className={cn(
                        "p-2 flex-1 rounded-b-lg transition-colors min-h-[50px]"
                    )}
                >
                     {isLoading ? (
                        <div className="space-y-2">
                             <Skeleton className="h-12 w-full" />
                             <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                            {children}
                        </SortableContext>
                    )}
                </div>
            </Card>
        </div>
    );
}
