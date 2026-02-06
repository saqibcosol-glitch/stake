import React from 'react';

const phases = [
    {
        phase: "Phase 1",
        title: "The Genesis Console (Infrastructure)",
        items: [
            { icon: "✅", text: <><strong>Platform Launch:</strong> Deployment of <code>www.createonsol.com</code> and the central dashboard.</> },
            { icon: "🛠️", text: <><strong>Meme Coin Foundry:</strong> Release of the No-Code <strong>Meme Coin</strong> & SPL Token Minter with automated metadata binding.</> },
            { icon: "🔐", text: <><strong>Rug-Proof Standards:</strong> Integration of &quot;Revoke Mint&quot; and &quot;Freeze Authority&quot; tools to enforce safety and trust.</> },
            { icon: "📂", text: <><strong>IPFS Sovereignty:</strong> Decentralized, immutable storage for all project assets via Pinata.</> },
        ],
        color: "from-blue-500 to-cyan-400"
    },
    {
        phase: "Phase 2",
        title: "The Economic Engine ($COSOL)",
        items: [
            { icon: "🚀", text: <><strong>$COSOL Fair Launch:</strong> Public listing on Raydium/Jupiter to establish market value.</> },
            { icon: "⛏️", text: <><strong>&quot;CPU&quot; Mining:</strong> Launch of the <strong>Staking DApp</strong> (<code>stake.createonsol.com</code>) allowing users to lock tokens for yield.</> },
            { icon: "⏳", text: <><strong>Time-Weighted Multipliers:</strong> Smart contract logic that rewards long-term holders with higher APY.</> },
            { icon: "💰", text: <><strong>Strategic Buyback & Allocation:</strong> 50% of platform fees are automated to buy back $COSOL and channel funds directly into <strong>Staking Rewards</strong> and <strong>Marketing Operations</strong>.</> },
        ],
        color: "from-green-400 to-emerald-600"
    },
    {
        phase: "Phase 3",
        title: "The Viral Layer (On-Chain MLM)",
        items: [
            { icon: "🔗", text: <><strong>Dual-Matrix Architecture:</strong> Activation of the <strong>X4</strong> (6-user cycle) and <strong>Triple X</strong> (14-user cycle) automated referral models.</> },
            { icon: "🤝", text: <><strong>Dynamic Commission Splits:</strong> Earn <strong>100%</strong> on direct X4 slots and a programmed <strong>30%/70%</strong> reward split from network depth (Line 2 & Line 3).</> },
            { icon: "🔄", text: <><strong>Auto-Recycle Protocol:</strong> Upon filling a matrix, the cycle automatically resets and re-subscribes, creating an infinite earning loop.</> },
            { icon: "💸", text: <><strong>Trustless Instant Payouts:</strong> Zero-latency commission transfers directly to user wallets via smart contract.</> },
            { icon: "📈", text: <><strong>12-Level Growth System:</strong> A visual dashboard tracking team turnover and unlocking higher earning tiers through level upgrades.</> },
        ],
        color: "from-purple-500 to-pink-500"
    },
    {
        phase: "Phase 4",
        title: "Ecosystem Expansion (The PvP Arena)",
        items: [
            { icon: "⚔️", text: <><strong>The Binary Conflict Protocol:</strong> Launch of the &quot;PvP Launchpad&quot; where two tokens (e.g., Red vs. Blue) deploy simultaneously in a <strong>Liquidity Race</strong>.</> },
            { icon: "📊", text: <><strong>Visual Volume Pressure:</strong> Replacing standard charts with a <strong>Real-Time Battle UI</strong> (Health Bars), powered by high-velocity RPCs (Helius) for sub-second updates.</> },
            { icon: "🏆", text: <><strong>The Winner-Take-All Smart Contract:</strong> The first token to hit the <strong>$70k Hard Cap</strong> automatically triggers a Raydium migration with a &quot;Liquidity Injection Bonus&quot; (The Winner&apos;s Pot).</> },
            { icon: "☠️", text: <><strong>The Mercy Mechanism:</strong> Automated refund logic (Safe Mode) or liquidity absorption (Risk Mode) for the losing token, ensuring a transparent outcome for all participants.</> },
        ],
        color: "from-red-500 to-orange-500",
        highlight: true
    },
];

const Roadmap = () => {
    return (
        <section className="relative py-20 px-4 overflow-hidden" id="roadmap">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-solana-dark opacity-90"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>

            <div className="relative max-w-7xl mx-auto z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-solana-teal to-solana-purple mb-4">
                        The CreateOnSol Master Plan
                    </h2>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                        Architecture for the Next Generation of Decentralized Finance.
                    </p>
                </div>

                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-0.5 md:w-1 h-full bg-gradient-to-b from-solana-purple via-solana-teal to-solana-purple opacity-30 rounded-full"></div>

                    <div className="space-y-8 md:space-y-0">
                        {phases.map((phase, index) => (
                            <div key={index} className={`relative flex flex-col md:flex-row items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''} ${index > 0 ? 'md:-mt-32' : ''}`}>

                                {/* Timeline Dot */}
                                <div className="absolute left-4 md:left-1/2 transform -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-solana-dark border-2 border-solana-teal z-10 flex items-center justify-center shadow-[0_0_15px_rgba(20,241,149,0.5)]">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
                                </div>

                                {/* Content Side */}
                                <div className="w-full md:w-1/2 pl-12 pr-4 md:px-8">
                                    <div
                                        tabIndex={0}
                                        className={`group relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:transform hover:scale-105 hover:border-white/20 hover:shadow-[0_0_30px_rgba(153,69,255,0.15)] focus:outline-none focus:ring-2 focus:ring-solana-teal focus:ring-offset-2 focus:ring-offset-solana-dark ${phase.highlight ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}
                                    >
                                        {/* Gradient Border Overlay on Hover */}
                                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${phase.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`}></div>

                                        <div className="relative z-10">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 bg-gradient-to-r ${phase.color} text-white shadow-sm`}>
                                                {phase.phase}
                                            </span>
                                            <h3 className="text-xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-white group-hover:to-white">
                                                {phase.title}
                                            </h3>

                                            <ul className="space-y-3">
                                                {phase.items.map((item, i) => (
                                                    <li key={i} className="flex items-start text-gray-300 text-sm">
                                                        <span className="mr-2 text-lg select-none filter drop-shadow-md">{item.icon}</span>
                                                        <span>{item.text}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Empty Side for alignment */}
                                <div className="w-full md:w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Roadmap;
