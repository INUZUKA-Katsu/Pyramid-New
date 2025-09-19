# -*- coding: utf-8 -*-

require 'rack'
require 'cgi'
require 'json'
require_relative 'models/population_data'
require_relative 'services/s3_client'
require_relative 'services/parallel_data_fetcher'

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
      if path == '/' || path == '/api/batch-years' || path == '/api/test'
        # リクエストタイプに応じた処理
        puts "Content-Type: #{req.content_type}"
        puts "Path: #{path}"
        if req.content_type&.include?('application/json')
          begin
            body = req.body.read
            puts "JSON body: #{body}"
            param = JSON.parse(body)
            puts "Parsed JSON: #{param}"
          rescue JSON::ParserError => e
            puts "JSON parse error: #{e.message}"
            param = {}
          end
        else
          param = req.params
          puts "Form params type: #{param.class}"
          puts "Form params: #{param.inspect}"
          
          # req.paramsが文字列の場合の処理
          if param.is_a?(String)
            puts "WARNING: req.params is a string: #{param}"
            # 文字列をハッシュに変換
            param = parse_string_params(param)
            puts "Converted to hash: #{param.inspect}"
          end
          
          # フォームデータでJSONが送信された場合の処理
          if param['years'] && param['years'].is_a?(String)
            begin
              param['years'] = JSON.parse(param['years'])
              puts "Parsed years from form: #{param['years']}"
            rescue JSON::ParserError => e
              puts "Form JSON parse error: #{e.message}"
              puts "Raw years value: #{param['years']}"
            end
          end
          
          puts "Final param: #{param.inspect}"
        end
      
        # バッチAPIの処理
        if path == '/api/batch-years'
          begin
            response_data = process_batch_years_request(param)
            if response_data && response_data.is_a?(Array) && response_data.length >= 2
              header["content-type"] = response_data[0]
              response = response_data[1]
            else
              puts "バッチリクエスト処理で無効なレスポンス: #{response_data.inspect}"
              header["content-type"] = 'text/plain;charset=utf-8'
              response = "Internal server error: Invalid response format"
            end
          rescue => e
            puts "バッチリクエスト処理でエラー: #{e.message}"
            puts "Backtrace: #{e.backtrace.first(5).join("\n")}"
            header["content-type"] = 'text/plain;charset=utf-8'
            response = "Internal server error: #{e.message}"
          end
        
        elsif path == '/api/test'
          # テスト用エンドポイント
          puts "テストエンドポイント呼び出し"
          header["content-type"] = 'text/json;charset=utf-8'
          response = { message: "API test successful", timestamp: Time.now.to_s }.to_json
          puts "テストレスポンス生成: #{response}"
        
        else
          header["content-type"] = 'text/json;charset=utf-8'
          response = param.to_json
        end

      elsif path == '/PyramidAjax.cgi'
        # 既存のメインリクエスト処理
        param = req.params
        puts req.params.to_s
        response_data = process_main_request(param)

        header["content-type"] = response_data[0]
        response = response_data[1]
      end
      
      move_temp_files if req.url.match(/localhost/)
    
    elsif path == '/exist.cgi'
      header["content-type"] = 'text/plain'
      response = File.exist?('.' + CGI.unescape(req.query_string)) ? 'true' : 'nil'
    
    elsif path.match(/\/[^\/]*(sample|demo|test).*\.html/)
      header["content-type"] = 'text/html'
      if path.match(/svg_zoomsample/)
        path=File.join(File.dirname(__FILE__), '../js', path)
        response = File.read(path)
      else
        path=File.join(File.dirname(__FILE__),'..', path)
        response = File.read(path)
      end
    elsif path.match(/\/mcc/)
      return [301, {'Location' => 'https://mcc-choir-938712885657.asia-northeast1.run.app' + path}, []]
    else
      return [404, {}, ["Not Found"]]
    end
    
    # レスポンスがnilの場合はデフォルト値を設定
    response = "No response generated" if response.nil?

    puts "最終レスポンス: #{response.class} - #{response.to_s[0..100]}"
    puts "ヘッダー: #{header.inspect}"
    #puts "レスポンス配列: #{[response].inspect}"
    [200, header, [response]]
  rescue => e
    puts "エラー発生: #{e.message}"
    puts "Backtrace: #{e.backtrace.first(5).join("\n")}"
    error_response = generate_error_response(e)
    [500, {"content-type" => "text/html"}, [error_response]]
  end
  
  private

  # 文字列形式のパラメータをハッシュに変換
  def parse_string_params(param_string)
    result = {}
    
    # "k=>v" 形式の文字列を解析
    if param_string.include?('=>')
      pairs = param_string.split(/[&,]/)
      pairs.each do |pair|
        if pair.include?('=>')
          key, value = pair.split('=>', 2)
          key = key.strip
          value = value.strip
          result[key] = value
        end
      end
    end
    
    result
  end

  def process_main_request(param)
    puts "process_main_request開始"
    p param

    shiku = param["ShikuName"]
    nengetsu = param["Year"]
    level = param["Level"]&.to_sym
    
    puts "process_main_request:step1"
    puts "Processing request: shiku=#{shiku}, nengetsu=#{nengetsu}, level=#{level}"
    puts "process_main_request:step2"
    return generate_error_response("Invalid parameters") unless level
    puts "process_main_request:step3"
    # レベルに応じた処理
    p "previous adjust_level => #{level}"
    level = adjust_level(level, shiku, nengetsu)
    p "after adjust_level => #{level}"
    cho = (level == :cho_json) ? JSON.parse(param["Cho"]) : nil
    puts "process_main_request:step4"
    # データを取得
    begin
      puts "PopulationData.new開始"
      obj = PopulationData.new(shiku, nengetsu, level, cho, @s3_client)
      puts "process_main_request:step5"
      p obj
      # レスポンスを生成
      generate_response(obj, level)
    rescue => e
      puts "Error in process_main_request: #{e.message}"
      puts "Backtrace: #{e.backtrace.first(10).join("\n")}"
      generate_error_response(e)
    end
  end
  
  def adjust_level(level, shiku, nengetsu)
    p "adjust_level開始"
    p level
    case level
    when :shiku_json
      p nengetsu[0,4]
      if nengetsu != "new" && nengetsu[0,4] <= "1992" 
        if shiku == "age"
          :ayumi_json
        else
          :ayumi_ku_json
        end
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
  
  # 配列で受け取ったデータをオブジェクト（ハッシュ）に変換する
  def get_object_pyramid_data(pyramid_data)
    puts "get_object_pyramid_data開始"
  
    if pyramid_data.is_a?(Array)
      puts "get_object_pyramid_data rout1"
  
      shiku       = pyramid_data[1]
      kijunbi     = pyramid_data[2]
      source_url  = pyramid_data[3]
      kakusai_betsu = pyramid_data.select { |e| e.is_a?(Array) }
  
      {
        shiku: shiku,
        kijunbi: kijunbi,
        source_url: source_url,
        kakusai_betsu: kakusai_betsu
      }
    else
      puts "get_object_pyramid_data rout2"
      pyramid_data
    end
  end

  def generate_response(obj, level)
    case level
    when :shiku_json, :cho_json, :kujuki_json, :ayumi_json, :ayumi_ku_json, :syorai_json, :syorai_ku_json, :all_options
      if obj.json_error
        ["text/plain;charset=utf-8", obj.csv || "CSV data not available"]
      else
        p "generate_response"
        p obj.json
        ["text/json;charset=utf-8", obj.json || "{}"]
      end
    when :cho_csv, :cho_csv_for_save
      ["text/plain;charset=utf-8", obj.csv || "CSV data not available"]
    when :ku_option, :shi_option, :cho_option, :cho_list
      ["text/html;charset=utf-8", obj.html_str || "HTML data not available"]
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
  
  # バッチ年次データ取得リクエストを処理
  def process_batch_years_request(param)
    puts "process_batch_years_request開始"
    puts "受信パラメータ: #{param.inspect}"
    
    # パラメータの取得と検証
    shiku = param["shiku"]
    years = param["years"]
    level = param["level"]
    
    puts "バッチリクエスト: shiku=#{shiku}, years=#{years}, level=#{level}"
    
    # パラメータの検証
    unless shiku && years && level
      puts "パラメータ不足エラー"
      return generate_error_response("Missing required parameters: shiku and years and level")
    end
    
    # yearsが文字列の場合は配列に変換
    if years.is_a?(String)
      begin
        years = JSON.parse(years)
        puts "years文字列を配列に変換: #{years}"
      rescue JSON::ParserError => e
        puts "JSON解析エラー: #{e.message}"
        return generate_error_response("Invalid years format")
      end
    end
    
    unless years.is_a?(Array) && years.any?
      puts "years配列検証エラー"
      return generate_error_response("Years must be a non-empty array")
    end
    
    # 町丁別モードの場合は選択された町丁の情報を取得
    cho_selection = nil
    if level == 'cho_json'
      cho_selection = param["cho"]
      puts "町丁別モード: 選択された町丁=#{cho_selection}"
    end
    
    # 並列データ取得を実行
    begin
      puts "ParallelDataFetcher初期化開始"
      fetcher = ParallelDataFetcher.new(@s3_client)
      puts "並列データ取得開始"
      year_with_level = years.map do |year|
        puts
        puts "before adjust_level => #{level}, #{shiku}, #{year}"
        adjusted_level = adjust_level(level&.to_sym, shiku, year)
        puts "after adjust_level => #{adjusted_level}"
        puts
         {year: year, level: adjusted_level}
      end
      results = fetcher.fetch_batch_years(shiku, year_with_level, cho_selection)

      p "process_batch_years_request:results"
      #p results
      
      puts "並列データ取得完了: #{results.keys.size}件"
      
      # レスポンスを生成
      response_data = {
        success: true,
        shiku: shiku,
        requested_years: years,
        results: results,
        summary: {
          total_requested: years.size,
          successful: results.values.count { |r| r[:success] },
          failed: results.values.count { |r| !r[:success] }
        }
      }
      
      puts "バッチリクエスト完了: 成功=#{response_data[:summary][:successful]}, 失敗=#{response_data[:summary][:failed]}"
      
      json_response = response_data.to_json
      puts "JSONレスポンス生成完了: #{json_response.length}文字"
      
      ["text/json;charset=utf-8", json_response]
      
    rescue => e
      puts "バッチリクエストエラー: #{e.message}"
      puts "Backtrace: #{e.backtrace.first(10).join("\n")}"
      generate_error_response(e)
    end
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
