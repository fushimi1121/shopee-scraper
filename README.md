# Shopee Data Tracker

Shopeeの商品データをブラウザ内IndexedDBに保存し、CSV出力するChrome拡張機能。

## 機能

- **GET**: 現在ページの商品を取得してIndexedDBに保存
  - 全件レンダリングのため自動スクロール → DOM抽出 → IndexedDB保存
- **DL**: 蓄積したデータをCSV出力（出力後、DBを自動削除）
- **BACK / NEXT**: ページネーション（Shopeeの前へ・次へボタンに連動）

## 対応ページ

### 1. カテゴリ一覧ページ
```
https://shopee.sg/Main-cat.11111111
https://shopee.sg/Sub-cat.11111111.12345678
```

### 2. 検索ページ
```
https://shopee.sg/search?keyword=key%20words
```

## データ構造

### カテゴリページのデータ

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | number | 商品ID |
| name | string | 商品名 |
| name_ja | string | 日本語訳（現在は空） |
| main_category | string | メインカテゴリ |
| sub_category | string \| null | サブカテゴリ（ない場合はnull） |
| url | string | 商品URL |
| img_src | string | 商品画像URL |
| discount_rate | string \| null | 割引率（例: "-44%"。割引なしはnull） |
| display_order | number | 表示順 |
| price | string | 価格 |
| sold_count | number | 販売数 |
| timestamp | string | 取得日時（JST・ISO風） |

### 検索ページのデータ

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | number | 商品ID |
| name | string | 商品名 |
| name_ja | string | 日本語訳（現在は空） |
| keywords | string | 検索キーワード（スペース区切り） |
| url | string | 商品URL |
| img_src | string | 商品画像URL |
| discount_rate | string \| null | 割引率（割引なしはnull） |
| display_order | number | 表示順 |
| price | string | 価格 |
| sold_count | number | 販売数 |
| timestamp | string | 取得日時（JST・ISO風） |
| shipping_aria | string \| null | 発送元（例: "Mainland China"） |

## CSVソート順

### カテゴリページ
1. main_category（昇順）
2. sub_category（昇順、nullは最後）
3. display_order（昇順）

### 検索ページ
1. keywords（昇順）
2. display_order（昇順）

カテゴリデータと検索データが混在している場合、DLで**カテゴリ用CSV**と**検索用CSV**の2ファイルが順にダウンロードされます。

## セットアップ

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択

## ファイル構成

| ファイル | 説明 |
|---------|------|
| `content.js` | データ抽出・IndexedDB保存・CSV出力・フローティングボタン |
| `constants.js` | 定数（DB名・CSVヘッダ・UI・スクロールなど） |
| `categories.js` | メインカテゴリID→スラッグ名マッピング |
| `selectors.js` | DOMセレクタ（Shopee一覧ページの構造に依存） |
| `manifest.json` | 拡張機能設定（Manifest V3） |
| `popup.html` / `popup.js` | ポップアップUI |
| `loading.gif` | GET中のアニメーション |

## 注意事項

- データはブラウザ内IndexedDBに保存されます
- DLボタン押下でCSV出力後、DBは自動削除されます
- カテゴリページまたは検索ページ以外ではGETボタンがエラーになります
- ShopeeのHTML構造変更時は `selectors.js` のセレクタを修正してください
