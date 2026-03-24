"use client";

import { useEffect, useState } from "react";
import { maskUsername } from "@/lib/utils/masking";

export default function LiveTicker() {
    const [trades, setTrades] = useState<any[]>([]);

    useEffect(() => {
        const fetchTicker = async () => {
            try {
                const res = await fetch('/api/user/leaderboard');
                const result = await res.json();
                if (result.success && result.data.recentTrades) {
                    setTrades(result.data.recentTrades);
                }
            } catch (error) {
                console.error("Ticker fetch error:", error);
            }
        };
        fetchTicker();
        const interval = setInterval(fetchTicker, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    if (trades.length === 0) return null;

    return (
        <div className="ticker-wrap">
            <div className="ticker">
                {trades.concat(trades).map((trade, i) => (
                    <div key={`${trade.id}-${i}`} className="ticker__item">
                        <span className="ticker__user">@{maskUsername(trade.user.username)}</span>
                        <span> just cleared a </span>
                        <span className="ticker__value">{trade.currency} {trade.faceValue} {trade.cardBrand}</span>
                        <span> trade! 🔥</span>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .ticker-wrap {
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                    height: 2.5rem;
                    background-color: rgba(0, 0, 0, 0.85);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    border-top: 1px solid var(--primary);
                    backdrop-filter: blur(5px);
                    flex-shrink: 0;
                }
                .ticker {
                    display: inline-block;
                    height: 2.5rem;
                    line-height: 2.5rem;
                    white-space: nowrap;
                    padding-right: 100%;
                    box-sizing: content-box;
                    animation: scroll 60s linear infinite;
                }
                .ticker__item {
                    display: inline-block;
                    padding: 0 2rem;
                    font-size: 0.85rem;
                    font-weight: 500;
                }
                .ticker__user {
                    color: var(--primary);
                    font-weight: 700;
                }
                .ticker__value {
                    font-weight: 700;
                    color: #4ade80;
                }
                @keyframes scroll {
                    0% { transform: translate3d(0, 0, 0); }
                    100% { transform: translate3d(-50%, 0, 0); }
                }
            `}</style>
        </div>
    );
}
