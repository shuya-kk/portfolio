/** @type {import('tailwindcss').Config} */
export default {
    // Tailwindがスタイルをスキャンするファイルパスを指定
    content: [
        './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                // Dark Theme Palette
                'dark-bg': '#050505', // Almost black
                'dark-surface': '#121212', // Dark gray for cards
                'dark-border': '#2a2a2a',

                'neon-amber': '#f59e0b', // Main accent
                'neon-gold': '#fbbf24', // Highlight
                'neon-blue': '#3b82f6', // Secondary accent (optional)

                'text-main': '#e5e5e5',
                'text-muted': '#a3a3a3',
            },
            animation: {
                'fade-in': 'fadeIn 0.8s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
                'slide-in-right': 'slideInRight 0.5s ease-out forwards',
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
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)' },
                    '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(245, 158, 11, 0.4)' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                }
            },
            backgroundImage: {
                'grid-pattern': "linear-gradient(to right, #2a2a2a 1px, transparent 1px), linear-gradient(to bottom, #2a2a2a 1px, transparent 1px)",
                'radial-glow': "radial-gradient(circle at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)",
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}