# -*- coding: utf-8 -*-

require 'rack'
require 'cgi'
require 'json'
require_relative 'models/population_data'
require_relative 'services/s3_client'

# リファクタリング後のメインアプリケーションクラス
class PyramidApp
  def initialize
    @s3_client = S3Client.new
  end
  
  def call(env)
    req = Rack::Request.new(env)
    path = CGI.unescape(req.path)
    header = {}
    
    if req.post?
      param = req.params
      response_data = process_main_request(param)
      header["content-type"] = response_data[0]
      response = response_data[1]
      move_temp_files if req.url.match(/localhost/)
    elsif path == '/exist.cgi'
      header["content-type"] = 'text/plain'
      response = File.exist?('.' + CGI.unescape(req.query_string)) ? 'true' : 'nil'
    elsif path.match(/\/[^\/]*(sample|demo).*\.html/)
      header["content-type"] = 'text/html'
      if path.match(/sample/)
        path=File.join(File.dirname(__FILE__), '../js', path)
        response = File.read(path)
      else
        path=File.join(File.dirname(__FILE__),'..', path)
        response = File.read(path)
      end
    else
      return [404, {}, ["Not Found"]]
    end
    
    [200, header, [response]]
  rescue => e
    error_response = generate_error_response(e)
    [500, {"content-type" => "text/html"}, [error_response]]
  end
  
  private
  
  def process_main_request(param)
    shiku = param["ShikuName"]
    nengetsu = param["Year"]
    level = param["Level"]&.to_sym
    
    puts "Processing request: shiku=#{shiku}, nengetsu=#{nengetsu}, level=#{level}"
    
    return generate_error_response("Invalid parameters") unless level
    
    # レベルに応じた処理
    level = adjust_level(level, shiku, nengetsu)
    cho = (level == :cho_json) ? JSON.parse(param["Cho"]) : nil
    
    # データを取得
    begin
      obj = PopulationData.new(shiku, nengetsu, level, cho, @s3_client)
      # レスポンスを生成
      generate_response(obj, level)
    rescue => e
      puts "Error in process_main_request: #{e.message}"
      puts "Backtrace: #{e.backtrace.first(10).join("\n")}"
      generate_error_response(e)
    end
  end
  
  def adjust_level(level, shiku, nengetsu)
    case level
    when :shiku_json
      if nengetsu != "new" && nengetsu[0,4] <= "1992"
        :ayumi_json
      elsif nengetsu.match(/ft|syorai/)
        shiku == "age" ? :syorai_json : :syorai_ku_json
      else
        level
      end
    when :shiku_option
      shiku == "age" ? :shi_option : :ku_option
    else
      level
    end
  end
  
  def generate_response(obj, level)
    case level
    when :shiku_json, :cho_json, :kujuki_json, :ayumi_json, :syorai_json, :syorai_ku_json, :all_options
      if obj.json_error
        ["text/plain;charset=utf-8", obj.csv]
      else
        ["text/json;charset=utf-8", obj.json]
      end
    when :cho_csv, :cho_csv_for_save
      ["text/plain;charset=utf-8", obj.csv]
    when :ku_option, :shi_option, :cho_option, :cho_list
      ["text/html;charset=utf-8", obj.html_str]
    else
      ["text/plain", "Unknown level: #{level}"]
    end
  end
  
  def generate_error_response(error)
    message = error.is_a?(Exception) ? error.message : error.to_s
    backtrace = error.respond_to?(:backtrace) ? error.backtrace.join("<br>\n") : ""
    
    <<~HTML
      <html>
      <head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
      <body>
        <h1>Error</h1>
        <p>#{message}</p>
        <pre>#{backtrace}</pre>
      </body>
      </html>
    HTML
  end
  
  def move_temp_files
    src = "#{__dir__}/../tmp/nenreibetsu"
    dest = "#{__dir__}/../nenreibetsu"
    
    if Dir.exist?(src)
      require 'fileutils'
      FileUtils.mv(Dir.glob("#{src}/*"), dest) if Dir.exist?(dest)
    end
  rescue => e
    puts "Error moving temp files: #{e.message}"
  end
end
