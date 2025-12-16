/** @type {import('tailwindcss').Config} */
export default {
    // Tailwindがスタイルをスキャンするファイルパスを指定
    content: [
        './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Zen Kaku Gothic New"', '"Noto Sans JP"', 'sans-serif'],
                serif: ['"Noto Serif JP"', 'serif'],
            },
            colors: {
                // Light Wafu Theme Palette
                'wafu-bg': '#fdfbf7',     // Warm Washi White (Background)
                'wafu-paper': '#f4f1ea',  // Slightly Darker Washi (Cards/Surfaces)

                'wafu-text': '#2b2b2b',   // Sumi (Ink) - Main Text
                'wafu-text-muted': '#595959', // Light Sumi - Muted Text

                'wafu-accent': '#be3144', // Enji (Dark Red) - Primary Accent
                'wafu-accent-sub': '#6c8c6e', // Uguisu (Green) - Secondary Accent

                // Retain generic names for compatibility but map to new palette
                'text-main': '#2b2b2b',
                'text-muted': '#595959',
            },
            animation: {
                'fade-in': 'fadeIn 1s ease-out forwards',
                'fade-in-up': 'fadeInUp 1s ease-out forwards',
                'float': 'float 8s ease-in-out infinite',
                'pulse-slow': 'pulseGlow 4s ease-in-out infinite',
                'slide-in-right': 'slideInRight 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
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
                    '50%': { transform: 'translateY(-10px)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(191, 152, 72, 0.1)' }, // Soft Gold Glow
                    '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(191, 152, 72, 0.2)' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                }
            },
            backgroundImage: {
                'washi-pattern': "url('/patterns/washi.png')", // Placeholder for noise/paper texture if needed
                'radial-glow': "radial-gradient(circle at center, rgba(30, 41, 59, 0.8) 0%, transparent 70%)",
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}