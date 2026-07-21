import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  hover = true,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={
        hover
          ? { y: -3, transition: { type: "spring", stiffness: 300, damping: 22 } }
          : undefined
      }
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-5",
        glow && "red-glow",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(400px_circle_at_var(--x,50%)_0%,rgba(255,26,26,0.08),transparent_60%)]" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
