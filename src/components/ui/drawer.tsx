"use client";

import React from "react";

type Props = React.PropsWithChildren<{
  className?: string;
}>;

function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

export function Drawer({ children, className }: Props) {
  return <div className={cn("zoo-drawer", className)}>{children}</div>;
}

export function DrawerContent({ children, className }: Props) {
  return <div className={cn("zoo-drawer-content", className)}>{children}</div>;
}

export function DrawerTitle({ children, className }: Props) {
  return <h2 className={cn("zoo-drawer-title", className)}>{children}</h2>;
}

export function DrawerClose({ children, className }: Props) {
  return (
    <button type="button" className={cn("zoo-drawer-close", className)}>
      {children ?? "Close"}
    </button>
  );
}

export default Drawer;
