import { motion, AnimatePresence } from "framer-motion";

interface TypingIndicatorProps {
  text: string | null;
}

export function TypingIndicator({ text }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 px-4 py-1.5"
        >
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground italic">{text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
