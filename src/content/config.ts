import { defineCollection, z } from 'astro:content';

// 'blog'という名前のコレクション（ブログ投稿）を定義します
const blogCollection = defineCollection({
    // スキーマ（投稿のフロントマターの型定義）
    schema: z.object({
        title: z.string(), // 必須: 記事のタイトル
        pubDate: z.date(), // 必須: 公開日 (Date型を要求)
        description: z.string(), // 必須: 記事の概要
        author: z.string().default('Developer'), // オプション: 著者名（名前非公開のためデフォルト値を設定）
        tags: z.array(z.string()).optional(), // オプション: タグ
    }),
});

// コレクションをエクスポート
export const collections = {
    blog: blogCollection,
};