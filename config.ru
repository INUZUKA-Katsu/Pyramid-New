require 'cgi'
require 'uri'
require 'json'
require_relative 'lib/pyramid_app'
require_relative 'lib/reverse_proxy_middleware'

Encoding.default_external = "utf-8"
#p ENV["DROPBOX_ACCESS_TOKEN"]

use ReverseProxy, "https://mcc-choir-938712885657.asia-northeast1.run.app"

# 静的ファイルの配信設定
use Rack::Static, :urls => ['/index.html','/js','/css','/image','/tmp'], :root => '.'
use Rack::Static, :urls => {'/'=>'index.html'}, :root => '.'

# メインアプリケーションを実行
run PyramidApp.new
