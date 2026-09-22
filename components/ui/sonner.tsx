"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      className="toaster group"
      position="top-center"
      gap={10}
      visibleToasts={3}
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-primary" aria-hidden />
        ),
        info: (
          <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
        ),
        error: (
          <OctagonXIcon className="size-4 text-destructive" aria-hidden />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title: "cn-toast-title",
          description: "cn-toast-description",
          icon: "cn-toast-icon",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
