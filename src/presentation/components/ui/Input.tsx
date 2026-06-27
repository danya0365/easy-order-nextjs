import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
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
});
