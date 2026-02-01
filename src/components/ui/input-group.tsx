import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="input-group"
    className={cn(
      "flex w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30",
      "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-[3px]",
      "has-[input:disabled]:opacity-50 has-[input:disabled]:cursor-not-allowed",
      className,
    )}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    data-slot="input-group-input"
    className={cn(
      "flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground disabled:pointer-events-none md:text-sm min-w-0",
      className,
    )}
    {...props}
  />
));
InputGroupInput.displayName = "InputGroupInput";

const inputGroupAddonVariants = cva(
  "flex items-center justify-center text-muted-foreground shrink-0",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3",
        "inline-end": "order-last pr-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> &
    VariantProps<typeof inputGroupAddonVariants>
>(({ className, align, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="input-group-addon"
    className={cn(inputGroupAddonVariants({ align }), className)}
    {...props}
  />
));
InputGroupAddon.displayName = "InputGroupAddon";

const inputGroupButtonVariants = cva(
  "inline-flex items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-7 w-7",
        sm: "h-6 w-6",
        xs: "h-5 w-5",
        "icon-xs": "h-5 w-5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

interface InputGroupButtonProps
  extends
    React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof inputGroupButtonVariants> {
  asChild?: boolean;
}

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  InputGroupButtonProps
>(({ className, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type="button"
      data-slot="input-group-button"
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
});
InputGroupButton.displayName = "InputGroupButton";

export {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
  inputGroupAddonVariants,
  inputGroupButtonVariants,
};
