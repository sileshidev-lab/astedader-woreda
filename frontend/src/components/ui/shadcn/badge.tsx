import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring/35",
  {
    variants: {
      variant: {
        default:
          "border-primary/15 bg-primary/10 text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        success:
          "border-success/20 bg-success/10 text-success",
        warning:
          "border-warning/25 bg-warning/10 text-warning",
        muted: "border-border bg-muted text-muted-foreground",
        solid:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/92",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
