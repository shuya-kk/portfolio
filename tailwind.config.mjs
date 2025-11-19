/** @type {import('tailwindcss').Config} */
export default {
    // Tailwindがスタイルをスキャンするファイルパスを指定
    content: [
        './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    ],
    theme: {
        extend: {
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
        colors: {
            'custom-bg': '#f9f4ef',
            'custom-headline': '#020826',
            'custom-paragraph': '#716040',
            'custom-button': '#8c7851',
            'custom-button-text': '#fffffe',
            'custom-stroke': '#020826',
            'custom-main': '#fffffe',
            'custom-highlight': '#8c7851',
            'custom-secondary': '#eaddcf',
            'custom-tertiary': '#f25042',
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}