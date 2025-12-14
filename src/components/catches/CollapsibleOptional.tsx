/**
 * Collapsible section for optional catch form fields.
 */
import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface CollapsibleOptionalProps {
  /** Content to show when expanded */
  children: React.ReactNode;
  /** Whether section is open by default */
  defaultOpen?: boolean;
  /** Title of the section */
  title?: string;
}

/**
 * Collapsible section with animated chevron.
 */
export function CollapsibleOptional({
  children,
  defaultOpen = false,
  title = "Opcjonalne szczegóły",
}: CollapsibleOptionalProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
        <span>{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
        <div className="space-y-4 pt-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
