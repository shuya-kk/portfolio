# Developer Portfolio

A modern, responsive portfolio website designed to showcase iOS applications and technical blog posts. Built with Astro and Tailwind CSS, featuring a stylish "2025 Web Design Trend" aesthetic.

**Deployment URL**: [https://daizu-mame-88.github.io/portfolio/](https://daizu-mame-88.github.io/portfolio/)

## 🚀 Features

-   **Modern Aesthetic**: Implements 2025 web design trends including:
    -   **Floating Navigation**: A sleek, pill-shaped navigation bar for easy access.
    -   **Bento Grid Layout**: Dynamic grid layout for showcasing applications.
    -   **Bold Typography**: High-contrast, impactful headings.
    -   **Micro-interactions**: Subtle hover effects and animations.
-   **Responsive Design**: Fully optimized for mobile, tablet, and desktop devices.
    -   *Note*: App screenshots on the homepage are hidden on mobile for a cleaner look.
-   **Content Management**:
    -   **Blog**: Powered by Astro Content Collections for type-safe Markdown management.
    -   **Apps**: Data-driven application listing sourced from JSON.
-   **Custom Design System**: Tailored Tailwind CSS configuration with a custom color palette and utility classes.

## 🛠️ Tech Stack

-   **Framework**: [Astro](https://astro.build/) (Static Site Generator)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Deployment**: GitHub Pages (via GitHub Actions)

## 📂 Project Structure

```text
/
├── public/             # Static assets
├── src/
│   ├── content/        # Blog posts (Markdown) and config
│   ├── data/           # Application data (JSON)
│   ├── pages/          # Application routes
│   │   ├── index.astro # Homepage
│   │   ├── apps/       # App list page
│   │   └── blog/       # Blog pages (List, Detail, Tags)
│   └── env.d.ts        # TypeScript environment definitions
├── tailwind.config.mjs # Tailwind CSS configuration
└── package.json        # Project dependencies and scripts
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
