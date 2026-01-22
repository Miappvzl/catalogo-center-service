"use client";
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export default function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, isInView, value]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        // Formato Venezuela: 1.234,56
        ref.current.textContent = Intl.NumberFormat("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(latest);
      }
    });
  }, [springValue]);

  return <span ref={ref} className="font-mono tabular-nums tracking-tight" />;
}