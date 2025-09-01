# 横浜市人口ピラミッドアプリ リファクタリング結果

## 変更概要

元々の`PyramidAjax.rb`（657行）を責務ごとに分割し、保守性とテスタビリティを向上させました。

## 新しいディレクトリ構造

```
lib/
├── config/
│   └── constants.rb          # 定数管理（URL、パス、区名マッピング等）
├── services/
│   ├── file_manager.rb       # ファイル操作（S3、ローカル）
│   ├── data_fetcher.rb       # データ取得（HTTP、CSV処理）
│   ├── data_converter.rb     # データ変換（CSV→JSON、基準日生成等）
│   └── s3_client.rb          # AWS S3クライアント
├── models/
│   ├── population_data.rb    # 人口データの統合管理
│   └── cho_mei_list.rb       # 町名リスト生成
└── pyramid_app.rb            # メインアプリケーション
```

## 主要クラスの責務

### PyramidApp
- HTTPリクエストの処理
- エラーハンドリング
- レスポンス生成

### PopulationData
- 各種データ取得の統合管理
- リクエストタイプに応じた処理の振り分け

### FileManager
- ローカルファイルとS3ファイルの統一的な操作
- ファイルパスの生成

### DataFetcher
- 横浜市サイトからのデータ取得
- CSV形式の文字コード変換
- 120歳以上データの100歳以上への集約

### DataConverter
- CSV→JSON変換
- 基準日文字列の生成
- 元号変換処理

### ChoMeiList
- 町名リストのHTML生成

## 改善点

1. **責務の分離**: 各クラスが単一の責務を持つように分割
2. **定数の外出し**: ハードコードされていた定数を`constants.rb`に集約
3. **エラーハンドリング**: より適切な例外処理を追加
4. **テスタビリティ**: 依存性の注入により単体テストが容易に
5. **可読性**: メソッドの分割により処理の流れが明確に

## 使用方法

### 新しい設定での起動
```bash
rackup config_new.ru
```

### 従来の設定での起動（バックアップ）
```bash
rackup config.ru
```

## 移行手順

1. 新しいコード構造で動作確認
2. 問題がなければ`config_new.ru`を`config.ru`にリネーム
3. 元のファイルは`backup/`フォルダに移動

## テスト

各クラスが独立してテスト可能になりました：

```ruby
# 例：DataConverter のテスト
converter = DataConverter.new
result = converter.csv_to_json(csv_data, kijunbi, cho_list)
```

## 注意事項

- S3クライアントとの接続設定は従来通り環境変数で管理
- 既存のデータファイル構造は変更なし
- フロントエンド（HTML/JavaScript）は変更不要
