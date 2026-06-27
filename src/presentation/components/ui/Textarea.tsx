import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg border bg-card px-3 py-2 text-foreground outline-none transition placeholder:text-muted focus:ring-2",
          invalid
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-border focus:border-brand-500 focus:ring-brand-200",
          className,
        )}
        {...props}
      />
    );
  },
);
