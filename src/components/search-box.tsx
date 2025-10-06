"use client";

import { useRef, useEffect } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/firebase";

// SubmitButton component needs to be a child of the form to use useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="icon"
      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md transition-all duration-300 hover:bg-primary/90 focus:scale-110 focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-95 disabled:bg-primary/50"
      aria-label="Search"
      disabled={pending}
    >
      {pending ? (
        <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" role="status" aria-live="polite">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <ArrowRight className="h-5 w-5" />
      )}
    </Button>
  );
}

export function SearchBox({ searchAction, className }: { searchAction: (formData: FormData) => Promise<void>, className?: string }) {
  const { user } = useUser();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (formData: FormData) => {
    if (user) {
      formData.append('userId', user.uid);
    }
    await searchAction(formData);
    // Do not reset the form here to keep the input value on the results page
  };
  
  return (
    <form
      ref={formRef}
      action={handleSearch}
      className={cn("group relative w-full", className)}
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
      <Input
        ref={inputRef}
        type="search"
        name="query"
        placeholder="Ask about places, food, or culture in Cambodia..."
        className="h-12 w-full rounded-full border-2 border-border bg-background/90 pl-11 pr-14 text-base shadow-inner transition-all duration-300 ease-in-out focus:border-primary focus:bg-background focus:shadow-md focus-visible:ring-0"
        required
        defaultValue={query ?? ''}
      />
      <SubmitButton />
    </form>
  );
}
