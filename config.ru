require 'cgi'
require 'uri'
require 'json'
require_relative 'lib/pyramid_app'

Encoding.default_external = "utf-8"

# 静的ファイルの配信設定
use Rack::Static, :urls => ['/index.html','/nagareyama.html','/js','/css','/image','/mcc/img','/tmp'], :root => '.'
use Rack::Static, :urls => {'/'=>'index.html'}, :root => '.'

# メインアプリケーションを実行
run PyramidApp.new
