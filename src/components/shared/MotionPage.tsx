import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

/** Reusable page entrance animation powered by framer-motion.
 *  Replaces Tailwind CSS `animate-in fade-in slide-in-from-bottom-4 duration-700`
 *  with GPU-accelerated, spring-based animations. */

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      staggerChildren: 0.08,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

interface MotionPageProps extends HTMLMotionProps<"div"> {
  className?: string;
  children: React.ReactNode;
}

/** Wrap your page root `<div>` with `<MotionPage>` for smooth entrance animations. */
export const MotionPage = forwardRef<HTMLDivElement, MotionPageProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionPage.displayName = "MotionPage";

/** Wrap child sections inside `<MotionPage>` for staggered entrance. */
export const MotionSection = forwardRef<HTMLDivElement, MotionPageProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={childVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionSection.displayName = "MotionSection";

export { motion, pageVariants, childVariants };
