require 'cgi'
require 'uri'
require 'json'
require_relative 'lib/pyramid_app'
require_relative 'lib/reverse_proxy_middleware'

<<<<<<< HEAD
Encoding.default_external = "utf-8"

use ReverseProxy, "https://mcc-choir-938712885657.asia-northeast1.run.app"
=======
class PyramidApp
  # callメソッドはenvを受け取り、3つの値(StatusCode, Headers, Body)を配列として返す
  def call(env)
  	req = Rack::Request.new(env)
    str,type = nil,nil
  	if req.post?
  	  param = req.POST()
      ans   = main(param)
      type  = ans[0]
      str   = ans[1]
    else
      case req.path()
      when'/mcc','/mcc/','/mcc/index.html'
        str  = File.read('./mcc/index.html')
        type = 'text/html'
      when '/joho','/joho/','/joho/index.html'
        str  = File.read('./joho/index.html')
        type = 'text/html'        
      end
    end
    [ 200, { "Content-Type" => type }, [str] ]
  end
end

use Rack::Static, :urls => ['/index.html','/index2.html','/js','/css','/image','/mcc/img','/mcc/mp3'], :root => '.'
use Rack::Static, :urls => {'/'=>'index.html'}, :root => '.'
>>>>>>> e5c0ebc (LacoocanのMCCクワイアーページと答申検索ページを移行.)

# 静的ファイルの配信設定
use Rack::Static, :urls => ['/index.html','/js','/css','/image','/tmp'], :root => '.'
use Rack::Static, :urls => {'/'=>'index.html'}, :root => '.'

# メインアプリケーションを実行
run PyramidApp.new
