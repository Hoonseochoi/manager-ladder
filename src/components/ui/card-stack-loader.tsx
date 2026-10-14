"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Shield, Layers, RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoaderCard = {
    id: number | string;
    title: string;
    code: string;
    color: string;
    icon: LucideIcon;
};

// --- Card Data Config ---
const CARDS: LoaderCard[] = [
    { id: 1, title: "INITIALIZE", code: "SYS_01", color: "bg-amber-300", icon: Sparkles },
    { id: 2, title: "AUTHENTICATE", code: "SYS_02", color: "bg-cyan-300", icon: Shield },
    { id: 3, title: "PROCESSING", code: "SYS_03", color: "bg-rose-300", icon: Zap },
    { id: 4, title: "SYNCHRONIZE", code: "SYS_04", color: "bg-emerald-300", icon: Layers },
];

export type CardLoaderProps = {
    /** Cards in the deck. Defaults to the SYS_01..04 deck. */
    cards?: LoaderCard[];
    /** Header badge text. */
    badge?: React.ReactNode;
    /** Footer label (left) and status chip (right). */
    footerLabel?: React.ReactNode;
    footerStatus?: React.ReactNode;
    /** Milliseconds between card cycles. */
    interval?: number;
    /** Extra classes for the outer wrapper (default fills the screen). */
    className?: string;
};

export default function CardLoader({
    cards = CARDS,
    badge = "LOADING...",
    footerLabel = "DECK_CYCLE",
    footerStatus = "ACTIVE",
    interval = 1800,
    className,
}: CardLoaderProps) {
    const [activeDeck, setActiveDeck] = useState(cards);

    // Cycle the top card to the bottom of the stack infinitely
    const cycleCard = useCallback(() => {
        setActiveDeck((prev) => {
            const [topCard, ...rest] = prev;
            return [...rest, topCard];
        });
    }, []);

    useEffect(() => {
        const timer = setInterval(cycleCard, interval);
        return () => clearInterval(timer);
    }, [cycleCard, interval]);

    return (
        <div className={cn("flex items-center justify-center min-h-screen p-4 font-mono select-none", className)}>
            {/* COMPACT LOADER CONTAINER */}
            <div className="w-80 border-[3.5px] border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-5">

                {/* HEADER BAR */}
                <div className="flex items-center justify-between border-b-[3px] border-black pb-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 border border-black" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-black" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400 border border-black" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest bg-black text-white px-2 py-0.5 uppercase">
                        {badge}
                    </span>
                </div>

                {/* CARD STACK STAGING STAGE */}
                <div className="relative h-44 w-full flex items-center justify-center bg-zinc-900 border-[3px] border-black overflow-hidden shadow-[inset_0px_3px_8px_rgba(0,0,0,0.4)]">

                    {/* Subtle Grid Pattern Overlay */}
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage:
                                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                            backgroundSize: "12px 12px",
                        }}
                    />

                    {/* ANIMATED CARD STACK */}
                    <div className="relative w-36 h-32 flex items-center justify-center">
                        <AnimatePresence mode="popLayout">
                            {activeDeck.map((card, index) => {
                                const depthOffset = activeDeck.length - 1 - index;
                                const Icon = card.icon;

                                return (
                                    <motion.div
                                        key={card.id}
                                        layout
                                        initial={{
                                            x: -120,
                                            y: -10,
                                            rotate: -15,
                                            opacity: 0,
                                            scale: 0.85,
                                        }}
                                        animate={{
                                            x: depthOffset * -4,
                                            y: depthOffset * -4,
                                            rotate: (index % 2 === 0 ? 1 : -1) * (depthOffset * 2),
                                            scale: 1 - depthOffset * 0.04,
                                            opacity: 1,
                                        }}
                                        exit={{
                                            x: 120,
                                            y: 10,
                                            rotate: 15,
                                            opacity: 0,
                                            scale: 0.85,
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 24,
                                        }}
                                        style={{ zIndex: index }}
                                        className={`absolute inset-0 border-[3px] border-black p-3 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${card.color}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black bg-black text-white px-1 py-0.5">
                                                {card.code}
                                            </span>
                                            <Icon size={14} className="stroke-[2.5]" />
                                        </div>

                                        <div className="my-auto">
                                            <h4 className="text-sm font-black uppercase leading-tight">
                                                {card.title}
                                            </h4>
                                        </div>

                                        <div className="text-[8px] font-black border-t-2 border-black pt-1 flex justify-between items-center">
                                            <span>STATUS</span>
                                            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* FOOTER STATUS */}
                <div className="flex items-center justify-between text-xs font-black bg-zinc-100 p-2.5 border-[2.5px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2">
                        <RefreshCw size={12} className="animate-spin text-black" />
                        <span className="text-[10px] tracking-wider uppercase">{footerLabel}</span>
                    </div>
                    <span className="text-[10px] bg-black text-yellow-300 px-1.5 py-0.5">
                        {footerStatus}
                    </span>
                </div>

            </div>
        </div>
    );
}
