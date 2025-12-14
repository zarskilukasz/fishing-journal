/**
 * ResponsiveDialog - Automatically switches between Dialog (desktop) and Drawer (mobile).
 *
 * Uses Vaul Drawer on mobile for native-feeling bottom sheets with gesture support,
 * and Radix Dialog on desktop for centered modals.
 *
 * @example
 * ```tsx
 * <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
 *   <ResponsiveDialogContent>
 *     <ResponsiveDialogHeader>
 *       <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
 *       <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
 *     </ResponsiveDialogHeader>
 *     <ResponsiveDialogBody>
 *       Content here
 *     </ResponsiveDialogBody>
 *     <ResponsiveDialogFooter>
 *       <Button>Action</Button>
 *     </ResponsiveDialogFooter>
 *   </ResponsiveDialogContent>
 * </ResponsiveDialog>
 * ```
 */
import * as React from "react";
import { useIsMobile } from "@/components/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogCloseButton,
} from "./dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";

// ============================================================================
// Context for sharing mobile state
// ============================================================================

interface ResponsiveDialogContextValue {
  isMobile: boolean;
}

const ResponsiveDialogContext = React.createContext<ResponsiveDialogContextValue | null>(null);

function useResponsiveDialogContext() {
  const context = React.useContext(ResponsiveDialogContext);
  if (!context) {
    throw new Error("ResponsiveDialog components must be used within ResponsiveDialog");
  }
  return context;
}

// ============================================================================
// Root
// ============================================================================

interface ResponsiveDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Root component that provides context and renders appropriate primitive.
 */
function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  const contextValue = React.useMemo(() => ({ isMobile }), [isMobile]);

  if (isMobile) {
    return (
      <ResponsiveDialogContext.Provider value={contextValue}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      </ResponsiveDialogContext.Provider>
    );
  }

  return (
    <ResponsiveDialogContext.Provider value={contextValue}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveDialogContext.Provider>
  );
}

// ============================================================================
// Content
// ============================================================================

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
  /** Optional handler for escape key (useful for blocking close during loading) */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /** Optional handler for pointer down outside (useful for blocking close during loading) */
  onPointerDownOutside?: (event: CustomEvent) => void;
}

/**
 * Content wrapper that renders Drawer or Dialog content.
 */
function ResponsiveDialogContent({
  children,
  className,
  onEscapeKeyDown,
  onPointerDownOutside,
}: ResponsiveDialogContentProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    return (
      <DrawerContent
        className={cn("max-h-[90vh]", className)}
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={onPointerDownOutside}
      >
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={className} onEscapeKeyDown={onEscapeKeyDown} onPointerDownOutside={onPointerDownOutside}>
      {children}
    </DialogContent>
  );
}

// ============================================================================
// Header
// ============================================================================

type ResponsiveDialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

function ResponsiveDialogHeader({ className, ...props }: ResponsiveDialogHeaderProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    return <DrawerHeader className={className} {...props} />;
  }

  return <DialogHeader className={className} {...props} />;
}

// ============================================================================
// Footer
// ============================================================================

type ResponsiveDialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

function ResponsiveDialogFooter({ className, ...props }: ResponsiveDialogFooterProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    // Na mobile przyciski zajmują po 50% szerokości
    return <DrawerFooter className={cn("flex-row gap-3 [&>*]:flex-1", className)} {...props} />;
  }

  return <DialogFooter className={className} {...props} />;
}

// ============================================================================
// Body
// ============================================================================

type ResponsiveDialogBodyProps = React.HTMLAttributes<HTMLDivElement>;

function ResponsiveDialogBody({ className, ...props }: ResponsiveDialogBodyProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    return <div className={cn("p-4 overflow-y-auto flex-1", className)} {...props} />;
  }

  return <DialogBody className={className} {...props} />;
}

// ============================================================================
// Title
// ============================================================================

interface ResponsiveDialogTitleProps extends React.ComponentPropsWithoutRef<"h2"> {
  children: React.ReactNode;
}

function ResponsiveDialogTitle({ className, ...props }: ResponsiveDialogTitleProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    return <DrawerTitle className={className} {...props} />;
  }

  return <DialogTitle className={className} {...props} />;
}

// ============================================================================
// Description
// ============================================================================

interface ResponsiveDialogDescriptionProps extends React.ComponentPropsWithoutRef<"p"> {
  children: React.ReactNode;
}

function ResponsiveDialogDescription({ className, ...props }: ResponsiveDialogDescriptionProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    return <DrawerDescription className={className} {...props} />;
  }

  return <DialogDescription className={className} {...props} />;
}

// ============================================================================
// Close
// ============================================================================

interface ResponsiveDialogCloseProps extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
}

function ResponsiveDialogClose({ asChild, ...props }: ResponsiveDialogCloseProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    return <DrawerClose asChild={asChild} {...props} />;
  }

  return <DialogClose asChild={asChild} {...props} />;
}

// ============================================================================
// Close Button (X icon)
// ============================================================================

interface ResponsiveDialogCloseButtonProps {
  disabled?: boolean;
  className?: string;
}

function ResponsiveDialogCloseButton({ disabled, className }: ResponsiveDialogCloseButtonProps) {
  const { isMobile } = useResponsiveDialogContext();

  // On mobile, drawer has gesture close - we can skip the button or keep it minimal
  if (isMobile) {
    return (
      <DrawerClose
        className={cn(
          "rounded-sm p-1.5 opacity-70 ring-offset-background transition-opacity",
          "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:pointer-events-none",
          className
        )}
        disabled={disabled}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        <span className="sr-only">Zamknij</span>
      </DrawerClose>
    );
  }

  return <DialogCloseButton disabled={disabled} className={className} />;
}

// ============================================================================
// Exports
// ============================================================================

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
  ResponsiveDialogCloseButton,
  useResponsiveDialogContext,
};
