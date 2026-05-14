# ホーム画面テンプレート - Claude指示プロンプト

以下のプロンプトをClaudeに入力すると、杜の都工房HPのホーム画面と同じレイアウト・構造・エフェクトのページが生成されます。
色合い・画像・テキストは案件に合わせて変更してください。

---

## プロンプト（ここからコピーして使用）

```
以下の仕様に従って、React + Tailwind CSS v4 のホーム画面コンポーネントを作成してください。
技術スタック：React (JSX)、Tailwind CSS v4（@theme でカスタムカラー定義）、Vite。
全体はモバイルファースト（max-width: 390px 想定）のアプリ風UIです。

---

### 1. 全体構造

最外殻のラッパー：
- `<section>` タグ
- クラス: `mx-auto flex min-h-screen w-full flex-col bg-transparent px-2 pt-2 pb-[5.25rem]`
- pb-[5.25rem] は下部タブバーの高さ分の余白

内側カード（白いカードコンテナ）：
- `<div>` タグ
- クラス: `rounded-lg border border-bluegray-100 bg-white px-0 pb-2.5 pt-2 shadow-[0_6px_18px_rgba(0,0,0,0.06)]`
- この中にすべてのコンテンツが入る

背景色（App.jsx側）：
- ホーム画面のページ全体を包む div に `bg-[#0b0c0c]` を指定（カードの外側がダーク背景になる）

---

### 2. ヘッダー部（ロゴ + SNS + ハンバーガーメニュー）

配置: `flex items-start justify-between gap-2 px-2.5 mb-1.5`

#### 左側：ロゴ + テキスト
- `<a>` タグ、`flex items-center gap-1.5 no-underline`
- ロゴ画像: `h-[58px] w-[58px] object-contain`
- テキスト2行:
  - 1行目: `font-serif text-[15px] leading-tight font-semibold tracking-[0.03em] text-bluegray-800`
  - 2行目: `font-serif text-[14px] leading-tight font-semibold tracking-[0.06em] text-mint-500`（ブランドカラー）

#### 右側：アイコンボタン群
- `relative flex items-center gap-0.5 text-bluegray-700`
- SNSアイコンボタン x2: `rounded-md p-1.5 transition hover:bg-bluegray-50`、アイコンサイズ `h-6 w-6`
  - LINEアイコンはブランドカラー: `text-mint-500 hover:bg-mint-50`
- ハンバーガーメニューボタン:
  - `rounded-md p-1.5 transition`
  - 開いた状態: `bg-mint-50 text-mint-500`
  - 閉じた状態: `hover:bg-bluegray-50`

#### ドロップダウンメニュー（ハンバーガー展開時）
- `absolute right-0 top-[42px] z-40 w-[170px] overflow-hidden rounded-lg border border-bluegray-100 bg-white shadow-[0_14px_30px_rgba(10,30,18,0.18)]`
- 各メニュー項目:
  - `flex items-center gap-2 border-b border-bluegray-50 px-3 py-2.5 text-bluegray-700 no-underline transition last:border-b-0 hover:bg-mint-50 hover:text-mint-500`
  - アイコン `h-4 w-4` + テキスト `font-serif text-[12px] font-semibold tracking-[0.04em]`
- メニュー外クリックで閉じる（useEffect + mousedown/touchstart リスナー）

---

### 3. お知らせバー

配置: `mx-2.5 mb-1.5`
スタイル: `flex items-center gap-1.5 rounded-md border border-mint-100 bg-mint-50 px-1.5 py-1.5`

- バッジ: `inline-flex items-center gap-1 rounded-md bg-metallic-green px-1.5 py-1 text-[9px] font-bold text-white`
  - ベルアイコン `h-3 w-3` + 「お知らせ」テキスト
  - `bg-metallic-green` は CSS で定義: `background: linear-gradient(135deg, #145a32 0%, #1e8449 30%, #2ecc71 60%, #1e8449 100%)`
- テキスト: `truncate font-serif text-[10px] font-medium tracking-[0.02em] text-mint-600`
- 右矢印アイコン: `h-3 w-3 text-mint-500`

---

### 4. ヘッダー画像

- `mb-2.5` で下余白
- `<img>` タグ: `block h-auto w-full aspect-square object-cover`
- アスペクト比は正方形（aspect-square）。必要に応じて変更可

---

### 5. 3カードグリッド

配置: `mb-1.5 grid grid-cols-3 gap-1.5 px-2.5`

各カード:
- `<a>` タグ
- クラス: `home-neon-card rounded-md border border-bluegray-100 bg-white p-0.5 text-center no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`
- カード画像: `mb-0.5 aspect-square w-full rounded-md border border-bluegray-200 object-cover`、`loading="lazy"`
- タイトル: `font-serif text-[10px] font-semibold tracking-[0.03em] text-bluegray-800`
- 説明: `text-[8.5px] leading-tight text-bluegray-500`

#### カードのネオンエフェクト（CSS）
```css
@keyframes home-card-neon-blink {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba(34, 197, 94, 0.2),
      0 0 8px rgba(45, 212, 191, 0.18),
      0 2px 8px rgba(0, 0, 0, 0.08);
  }
  45% {
    box-shadow:
      0 0 0 1px rgba(34, 197, 94, 0.45),
      0 0 16px rgba(45, 212, 191, 0.35),
      0 0 24px rgba(16, 185, 129, 0.22),
      0 4px 12px rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(34, 197, 94, 0.08),
      0 0 4px rgba(45, 212, 191, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.home-neon-card {
  position: relative;
  animation: home-card-neon-blink 2.1s ease-in-out infinite;
}
```
色を変更する場合は rgba の値を変更してください（例：ピンク系なら `rgba(236, 72, 153, ...)` に差し替え）。

---

### 6. CTAボタン

配置: `relative mt-2.5 px-2.5`

ボタン（`<a>` タグ）:
- クラス: `cta-glint flex items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(145deg,#1b6f43_0%,#2ea565_45%,#165937_100%)] px-3 py-2.5 font-serif text-[17px] font-semibold tracking-[0.1em] text-white no-underline shadow-[0_14px_24px_rgba(10,30,18,0.4),inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-6px_12px_rgba(0,0,0,0.22)] ring-1 ring-white/25 transition-transform hover:-translate-y-0.5`
- アイコン `h-5 w-5` + テキスト

#### CTAグリントエフェクト（CSS）
```css
@keyframes glint-sweep {
  0% { transform: translateX(-130%) skewX(-20deg); opacity: 0; }
  18% { opacity: 0.85; }
  30% { transform: translateX(130%) skewX(-20deg); opacity: 0; }
  100% { transform: translateX(130%) skewX(-20deg); opacity: 0; }
}

.cta-glint {
  position: relative;
  overflow: hidden;
}

.cta-glint::after {
  content: '';
  position: absolute;
  inset: -2px;
  width: 38%;
  background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%);
  animation: glint-sweep 3.8s ease-in-out infinite;
  pointer-events: none;
}
```
光の筋が左から右へ周期的にスイープするエフェクト。色はグラデーションで変更可。

---

### 7. 下部タブバー（別コンポーネント: AppBottomTabs）

- `<nav>` タグ、`position: fixed`、画面下部に固定
- クラス: `fixed bottom-0 left-1/2 z-50 flex w-[min(390px,calc(100%-12px))] -translate-x-1/2 items-center justify-between rounded-t-lg border border-mint-100 bg-white px-1.5 py-1.5 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]`
- タブ5つ（ホーム、自己紹介、プラン、ブログ、問い合わせ）
- 各タブ:
  - `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-0.5 no-underline transition`
  - アクティブ時: `text-mint-500`
  - 非アクティブ時: `text-bluegray-500 hover:bg-mint-50`
  - アイコン `h-6 w-6` + ラベル `truncate font-serif text-[9px] font-medium tracking-[0.02em]`
- props で `page` を受け取り、現在のページをハイライト

---

### 8. Tailwind CSS カスタムテーマ（@theme）

index.css の `@theme` ブロックで以下のカラーを定義：

```css
@theme {
  --font-sans: 'Inter', 'Noto Sans JP', system-ui, sans-serif;
  --font-serif: 'Noto Serif JP', 'Georgia', serif;
  --color-mint-50: #f0fdf4;
  --color-mint-100: #dcfce7;
  --color-mint-200: #86efac;
  --color-mint-300: #4ade80;
  --color-mint-400: #22c55e;
  --color-mint-500: #16a34a;
  --color-mint-600: #15803d;
  --color-bluegray-50: #f5f5f5;
  --color-bluegray-100: #e5e5e5;
  --color-bluegray-200: #cccccc;
  --color-bluegray-300: #a3a3a3;
  --color-bluegray-400: #737373;
  --color-bluegray-500: #525252;
  --color-bluegray-600: #404040;
  --color-bluegray-700: #262626;
  --color-bluegray-800: #171717;
  --color-bluegray-900: #0a0a0a;
}
```

色合いを変える場合はこのテーマカラーを一括変更してください。

---

### 9. SVGアイコン

アイコンは独自SVGコンポーネントで統一：
- 共通設定: `fill="none"`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth: 1.5`, `strokeLinecap: "round"`, `strokeLinejoin: "round"`
- className prop でサイズ制御（例: `h-6 w-6`）
- 必要なアイコン: Home, User, Document, Note, Calendar, Instagram, LINE, Menu, Bell, ChevronRight

---

### 10. レイアウト要素の並び順（上から下）

1. ロゴ + SNSアイコン + ハンバーガーメニュー（ヘッダー）
2. お知らせバー（ベルアイコン + テキスト + 右矢印）
3. ヘッダー画像（正方形、幅100%）
4. 3カードグリッド（画像 + タイトル + 説明、ネオンエフェクト付き）
5. CTAボタン（グラデーション背景 + グリントエフェクト）
6. 下部タブバー（固定位置、5タブ）

---

### 11. インタラクション・エフェクトまとめ

| 要素 | エフェクト | 詳細 |
|------|-----------|------|
| カード | ネオン点滅 | `home-card-neon-blink` 2.1s infinite。box-shadowが緑色に明滅 |
| カード | ホバー浮き上がり | `hover:-translate-y-0.5 hover:shadow-md` |
| CTAボタン | グリントスイープ | `glint-sweep` 3.8s infinite。白い光の筋が左から右へ流れる |
| CTAボタン | ホバー浮き上がり | `hover:-translate-y-0.5` |
| CTAボタン | 立体感シャドウ | 複数レイヤーの box-shadow + inset shadow + ring |
| ハンバーガー | トグルカラー | 開閉で bg-mint-50 / text-mint-500 に切り替え |
| メニュー項目 | ホバー色変化 | `hover:bg-mint-50 hover:text-mint-500` |
| SNSボタン | ホバー背景 | `hover:bg-bluegray-50`（LINEは `hover:bg-mint-50`） |
| タブ | アクティブ色 | 現在ページは `text-mint-500`、他は `text-bluegray-500` |

---

### 使い方

上記の仕様に従ってコンポーネントを作成してください。
変更が必要な部分：
- ロゴ画像パス・ブランド名テキスト
- ヘッダー画像パス
- 3カードの画像・タイトル・説明・リンク先
- CTAボタンのテキスト・リンク先
- お知らせバーのテキスト
- タブのラベル・アイコン・リンク先
- 色を変える場合は @theme のカラー定義と CSS エフェクトの rgba 値を一括変更
```

---

## 補足：色を変更する場合のチェックリスト

1. `@theme` の `--color-mint-*` 系をすべて新しいブランドカラーに変更
2. `bg-metallic-green` の CSS グラデーションを変更
3. CTAボタンの `bg-[linear-gradient(...)]` を変更
4. ネオンエフェクト（`home-card-neon-blink`）の rgba 値を変更
5. グリントエフェクトは白い光なので基本そのまま使える
6. お知らせバーの `border-mint-100 bg-mint-50` 等を新カラーに変更
