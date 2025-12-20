/** @type {import('tailwindcss').Config} */
export default {
    // Tailwindがスタイルをスキャンするファイルパスを指定
    content: [
        './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "Noto Sans JP", "sans-serif"],
            },
            colors: {
                primary: "rgb(var(--color-primary) / <alpha-value>)",
                secondary: "rgb(var(--color-secondary) / <alpha-value>)",
                accent: "rgb(var(--color-accent) / <alpha-value>)",
                surface: "rgb(var(--color-surface) / <alpha-value>)",
                background: "rgb(var(--color-background) / <alpha-value>)",
                border: "rgb(var(--color-border) / <alpha-value>)",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out forwards",
                "fade-in-up": "fadeInUp 0.5s ease-out forwards",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
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