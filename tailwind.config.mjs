/** @type {import('tailwindcss').Config} */
export default {
    // Tailwindがスタイルをスキャンするファイルパスを指定
    content: [
        './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Zen Kaku Gothic New"', 'Inter', 'sans-serif'],
                serif: ['"Noto Serif JP"', 'serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                // Premium Sumi & Gold Palette
                'zen-bg': '#fcfaf2',      // Warm Washi White
                'zen-ink': '#1a1a1c',     // Deep Sumi Ink
                'zen-dim': '#4a4a4c',     // Muted Ink
                'zen-border': '#d1cdc0',  // Faded washi border
                'zen-gold': '#c5a059',    // Antique Gold
                'zen-indigo': '#2d3a4b',  // Muted Aizome Indigo
                'zen-accent': '#c5a059',  // Alias for Gold

                // Legacy alias
                'glass-bg': '#fcfaf2',
                'text-bright': '#1a1a1c',
                'text-dim': '#4a4a4c',
            },
            animation: {
                'fade-in': 'fadeIn 1s ease-out forwards',
                'fade-in-up': 'fadeInUp 1s ease-out forwards',
                'pulse-slow': 'pulseGlow 8s ease-in-out infinite',
                'orbit': 'orbit 25s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
                    '50%': { opacity: '0.7', transform: 'scale(1.15)' },
                },
                orbit: {
                    'from': { transform: 'rotate(0deg) translateX(100px) rotate(0deg)' },
                    'to': { transform: '360deg) translateX(100px) rotate(-360deg)' },
                }
            },
            backgroundImage: {
                'mesh-gradient': "radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 55%), radial-gradient(at 100% 0%, rgba(6, 182, 212, 0.15) 0px, transparent 55%), radial-gradient(at 100% 100%, rgba(244, 63, 94, 0.1) 0px, transparent 55%), radial-gradient(at 0% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 55%)",
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}