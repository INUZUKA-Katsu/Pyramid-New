# ワーカー数（プロセス数）
workers Integer(ENV['WEB_CONCURRENCY'] || 1) # 環境変数でスケーラビリティを確保

# スレッド数（1ワーカーごとのスレッド数）
threads 5, 5

# ポート番号（ローカルでは9292を指定）
bind "tcp://0.0.0.0:#{ENV.fetch('PORT') { 9292 }}"

# 環境（デフォルトをdevelopmentに）
environment ENV.fetch("RACK_ENV") { "development" }

# config.ruを明示的に指定
# rackup DefaultRackup # Herokuでconfig.ruを確実に読み込む

# プリロード（アプリをワーカー起動前にロード）
preload_app!
