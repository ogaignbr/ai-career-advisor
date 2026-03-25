# Claude Code デザイン指示書

## HTMLとUIデザインのルール

### 必ず使うもの
- **Tailwind CSS** — CDN経由またはnpm経由でスタイリング
- **Google Fonts** — Noto Sans JP（日本語）＋ 英字は個性的なフォントを選ぶ
- **shadcn/ui** または **Radix UI** — コンポーネントが必要な場合

### デザイン原則
- generic（ありきたり）なAI生成デザインは絶対に避ける
- Inter / Roboto / Arial などの使い古されたフォントは使わない
- 紫グラデーション on 白背景 のような「よくある配色」は使わない
- 明確なコンセプトを持ち、それを徹底して実装する

### ビジュアル品質
- タイポグラフィ：見出し用とボディ用のフォントを使い分ける
- カラー：CSS変数で一貫性を保つ。支配色＋シャープなアクセントカラー
- アニメーション：マイクロインタラクション（ホバー、フェードイン）を使う
- レイアウト：非対称、オーバーラップ、余白の使い方で印象を出す
- 背景：solid colorではなく、グラデーション・テクスチャ・幾何学パターンで奥行きを出す

### コードのルール
- HTML単体の場合：`<link>`でTailwind CDNとGoogle Fontsを読み込む
- ReactやNextの場合：Tailwindをnpmでインストール
- CSS変数で色・フォントを管理する
- レスポンシブデザイン必須（モバイルファースト）
- アクセシビリティ：適切なaria属性、alt属性を付ける

### HTMLテンプレートの基本構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ページタイトル</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-primary: #1a1a2e;
      --color-accent: #e94560;
      --font-heading: 'Playfair Display', serif;
      --font-body: 'Noto Sans JP', sans-serif;
    }
    body { font-family: var(--font-body); }
    h1, h2, h3 { font-family: var(--font-heading); }
  </style>
</head>
<body>
  <!-- コンテンツ -->
</body>
</html>
```

## Claudeへの追加指示

- コンポーネントを作るときは必ずTypeScriptで書く
- ファイルを変更したら必ず変更内容を説明する
- 1回のタスクで複数ファイルを変更する場合は、最初に変更計画を説明する
- デザインの判断をするときは、理由も一緒に説明する
- HTMLページを作るときは、必ずブラウザで見て確認できるよう完全なファイルとして出力する
