# 開発者ポートフォリオ

iOSアプリケーションや技術ブログ記事を紹介するために設計された、モダンでレスポンシブなポートフォリオウェブサイトです。AstroとTailwind CSSを使用して構築されており、スタイリッシュな「2025年のWebデザインのトレンド」を取り入れています。

**デプロイURL**: [https://shuya-kk.github.io/portfolio/](https://shuya-kk.github.io/portfolio/)

## 🚀 特徴

-   **モダンな美学**: 以下のような2025年のWebデザインのトレンドを実装しています。
    -   **フローティングナビゲーション**: アクセスしやすい、洗練されたピル型（カプセル型）のナビゲーションバー。
    -   **Bento（弁当箱）グリッドレイアウト**: アプリケーションを紹介するための動的なグリッドレイアウト。
    -   **大胆なタイポグラフィ**: コントラストが高く、インパクトのある見出し。
    -   **マイクロインタラクション**: 繊細なホバー効果とアニメーション。
-   **レスポンシブデザイン**: モバイル、タブレット、デスクトップデバイスに完全最適化されています。
    -   *注記*: すっきりとした見た目にするため、モバイル版ではトップページのアプリスクリーンショットを非表示にしています。
-   **コンテンツ管理**:
    -   **ブログ**: Astro Content Collectionsを使用した、型安全なMarkdown管理。
    -   **アプリ**: JSONからソースを取得するデータ駆動型のアプリケーションリスト。
-   **カスタムデザインシステム**: カスタムカラーパレットとユーティリティクラスを含む、調整されたTailwind CSS設定。

## 🛠️ 技術スタック

-   **フレームワーク**: [Astro](https://astro.build/) (静的サイトジェネレーター)
-   **スタイリング**: [Tailwind CSS](https://tailwindcss.com/)
-   **言語**: [TypeScript](https://www.typescriptlang.org/)
-   **デプロイ**: GitHub Pages (GitHub Actions経由)

## 📂 プロジェクト構成

```text
/
├── public/             # 静的アセット
├── src/
│   ├── content/        # ブログ記事 (Markdown) と設定
│   ├── data/           # アプリケーションデータ (JSON)
│   ├── pages/          # アプリケーションルート
│   │   ├── index.astro # ホームページ（トップページ）
│   │   ├── apps/       # アプリ一覧ページ
│   │   └── blog/       # ブログページ（一覧、詳細、タグ）
│   └── env.d.ts        # TypeScript環境定義
├── tailwind.config.mjs # Tailwind CSS設定
└── package.json        # プロジェクトの依存関係とスクリプト
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
