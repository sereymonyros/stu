
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, X, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type MultiSelectOption = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
    ({ options, selectedValues, onValueChange, className, placeholder = "Select options...", ...props }, ref) => {
        const [open, setOpen] = React.useState(false);

        const handleUnselect = (e: React.MouseEvent, value: string) => {
            e.preventDefault();
            onValueChange(value);
        };
        
        return (
            <div className="p-1">
                <Command className="w-full">
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => onValueChange(option.value)}
                                        style={{ pointerEvents: "auto", opacity: 1 }}
                                        className="cursor-pointer"
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>{option.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </div>
        );
    }
);

MultiSelect.displayName = "MultiSelect";
