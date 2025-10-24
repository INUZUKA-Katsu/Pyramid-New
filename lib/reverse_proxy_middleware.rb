require 'rack'
require 'net/http'
require 'uri'

class ReverseProxy
  def initialize(app, backend_host)
    @app = app
    @backend_uri = URI(backend_host)
  end

  def call(env)
    req = Rack::Request.new(env)

    # proxy対象パス
    if req.path.match(/christmas|easter|other|\/mcc|\/img|choir\.css|get_mp3\.js|svgPiano\.js|howler\.core\.js|get_information\.js/)
      if req.path.match(/christmas|easter|other/)
        # 転送先URLを組み立てる
        backend_url = @backend_uri + req.fullpath[/\/(christmas|easter|other)\/.*/]
      
      elsif req.path.start_with?('/mcc')
        backend_url = @backend_uri + req.fullpath.sub("/mcc", "")
        puts "リバースプロキシ: backend_url: #{backend_url}"

      elsif req.path.match(/^\/img|choir\.css|get_mp3\.js|svgPiano\.js|howler\.core\.js|get_information\.js/)
        backend_url = @backend_uri + req.fullpath
      end

      # HTTPリクエストを作成し転送
      backend_req = Net::HTTP.const_get(req.request_method.capitalize).new(backend_url)
      copy_headers(req, backend_req)
      backend_req.body = req.body.read
      puts "リバースプロキシ: backend_req.body: #{backend_req.body}"

      http = Net::HTTP.new(@backend_uri.host, @backend_uri.port)
      http.use_ssl = @backend_uri.scheme == 'https'

      backend_resp = http.request(backend_req)

      # Rack形式でレスポンスを返す
      headers = {}
      backend_resp.each_header { |k,v| headers[k] = v }
      [backend_resp.code.to_i, headers, [backend_resp.body]]
    else
      # 他は元のRackアプリに処理を委譲
      @app.call(env)
    end
  end

  private

  def copy_headers(req, backend_req)
    # オリジナルのHTTPヘッダーをコピー（必要に応じて調整）
    req.env.each do |key, value|
      if key.start_with?('HTTP_')
        header_name = key[5..-1].split('_').map(&:capitalize).join('-')
        backend_req[header_name] = value unless ['Host', 'Content-Length'].include?(header_name)
      end
    end
  end
end