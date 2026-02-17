# Shopee Data Tracker

Shopeeの商品データを自動収集してFirestoreに保存するChrome拡張機能

## セットアップ

### 1. Firebase設定ファイルの作成

```bash
cp config.example.js config.js
```

`config.js` を開き、Firebaseコンソールから取得した値を入力：

```js
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Chrome拡張を読み込む

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択

## ファイル構成

| ファイル | 説明 | Git管理 |
|---------|------|---------|
| `config.js` | Firebase設定（APIキー） | × gitignore |
| `config.example.js` | 設定テンプレート | ○ |
| `background.js` | Firestore保存処理 | ○ |
| `content.js` | データ抽出・UIボタン | ○ |
| `manifest.json` | 拡張機能設定 | ○ |
