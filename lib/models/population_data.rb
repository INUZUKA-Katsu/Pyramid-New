# -*- coding: utf-8 -*-

require 'json'
require_relative '../config/constants'
require_relative '../services/file_manager'
require_relative '../services/data_fetcher'
require_relative '../services/data_converter'

# 人口データを管理するクラス
class PopulationData
  include PyramidConstants
  
  attr_reader :json, :html_str, :csv, :json_error
  
  def initialize(ku, nengetsu, level, cho = nil, s3_client = nil, is_batch = nil)

    puts "PopulationData開始"
    puts "PopulationData: ku=#{ku}, nengetsu=#{nengetsu}, level=#{level}, cho=#{cho}"

    @ku = ku
    @level = level
    @cho = cho
    @json_error = nil
    
    @file_manager = FileManager.new(s3_client)
    p :step1
    @data_fetcher = DataFetcher.new(@file_manager)
    p :step2
    @data_converter = DataConverter.new
    p :step3
    # file_managerが初期化された後にnengetsuを処理
    @nengetsu = process_nengetsu(nengetsu, level)
    p :step4
    process_request(is_batch)
  end
  
  private
  
  # 年月の処理
  def process_nengetsu(nengetsu, level)
    if nengetsu == "new" && level == :shiku_json
      puts "Processing 'new' nengetsu for level: #{level}" # デバッグ用
      begin
        result = get_latest_nengetsu
        #puts "Processed nengetsu: #{result}" # デバッグ用
        result
      rescue => e
        puts "Error in process_nengetsu: #{e.message}"
        puts "Backtrace: #{e.backtrace.first(5).join("\n")}"
        "202104" # フォールバック値
      end
    else
      nengetsu
    end
  end
  
  # 最新の年月を取得
  def get_latest_nengetsu
    puts "get_latest_nengetsu called, s3_client: #{@file_manager.s3_client ? 'present' : 'nil'}"
    return "202104" unless @file_manager.s3_client
    
    begin
      puts "Getting file list from S3..."
      file_list = @file_manager.s3_client.get_list(DIR_SHIKU_JSON_S3)
      puts "File list retrieved, count: #{file_list.size}"
      
      ary = []
      file_list.select { |f| f.match(/tsurumi.*txt/) }
               .each do |f|
        #puts "Processing file: #{f}"
        # ファイル名から4桁の年を抽出（例：tsurumi2101-j.txt -> 2101）
        if ans = f.match(/tsurumi(\d{4})-j\.txt/)
          ary << ans[1]
          puts "Found year: #{ans[1]}"
        end
      end
      
      puts "Years found: #{ary}"
      # 9001未満の年を選択（元のロジックに合わせる）
      yymm = ary.select { |yymm| yymm.to_i < 9001 }.max
      result = yymm ? "20#{yymm}" : "202104"
      puts "Latest nengetsu found: #{result}" # デバッグ用
      result
    rescue => e
      puts "Error in get_latest_nengetsu: #{e.message}" # デバッグ用
      puts "Backtrace: #{e.backtrace.first(10).join("\n")}"
      "202104"
    end
  end
  
  # リクエストを処理
  def process_request(is_batch)
    p "process_request開始"
    p @level
    case @level
    when :shiku_json
      @json = process_shiku_data(is_batch)
    when :syorai_json
      @json = process_syorai_data
    when :syorai_ku_json
      @json = process_syorai_ku_data
    when :cho_csv, :cho_csv_for_save
      @csv = @data_fetcher.fetch_cho_csv(@ku, @nengetsu)
    when :cho_json
      process_cho_json
    when :kujuki_json
      @json = process_kujuki_data
    when :ayumi_json
      @json = process_ayumi_json
    when :ayumi_ku_json
      @json = process_ayumi_ku_json
    when :cho_list
      @html_str = process_cho_list
    when :shi_option, :ku_option, :cho_option, :kujuki_option
      @html_str = process_option
    when :all_options
      @json = process_all_options
    end
  end
  
  # 市区データを処理(:shiku_jsonの場合)
  def process_shiku_data(is_batch)
    puts "Processing shiku data for ku: #{@ku}, nengetsu: #{@nengetsu}" # デバッグ用
    
    # 青葉区・都筑区の非存在期間チェック
    # バッチリクエスト(=アニメーション)の場合は非存在期間に199501を加える。
    # 199501は分区直後のため２区を合わせたデータとなっているため.
    if is_batch
      non_existent_range = ["199301", "199401", "199501"]
    else
      non_existent_range = ["199301", "199401"]
    end
    p "☆☆☆process_shiku_data☆☆☆"
    p is_batch
    p non_existent_range
    if ["aoba", "tsuzuki"].include?(@ku) && non_existent_range.include?(@nengetsu)
      return generate_non_existent_data
    end
    
    # 9月データの場合は翌年1月を使用
    target_nengetsu = @nengetsu[4,2] == "09" ? post_3month(@nengetsu) : @nengetsu
    puts "Target nengetsu: #{target_nengetsu}" # デバッグ用
    
    json_file = @file_manager.local_file_path(:json, @ku, target_nengetsu)
    puts "Looking for JSON file: #{json_file}" # デバッグ用
    json = @file_manager.read_file(json_file)
    
    unless json
      puts "JSON not found, trying previous year" # デバッグ用
      # 前年のデータを試行
      prev_nengetsu = pre_nen(target_nengetsu)
      json_file = @file_manager.local_file_path(:json, @ku, prev_nengetsu)
      json = @file_manager.read_file(json_file)
      
      unless json
        puts "Previous year JSON not found, trying latest" # デバッグ用
        # 最新データを取得
        latest_nengetsu = get_latest_nengetsu
        json_file = @file_manager.local_file_path(:json, @ku, latest_nengetsu)
        json = @file_manager.read_file(json_file)
      end
    end
    
    puts "Final JSON result: #{json ? 'found' : 'not found'}" # デバッグ用
    json
  end
  
  # 町丁JSONデータを処理
  def process_cho_json
    puts "process_cho_json開始: @ku=#{@ku}, @nengetsu=#{@nengetsu}, @cho=#{@cho}"
    @csv = @data_fetcher.fetch_cho_csv(@ku, @nengetsu)
    puts "CSV取得完了: #{@csv ? '成功' : '失敗'}"
    kijunbi = @data_converter.generate_kijunbi(@nengetsu)
    puts "kijunbi生成: #{kijunbi}"
    
    begin
      puts "csv_to_json呼び出し: cho=#{@cho}, ku=#{@ku}"
      @json = @data_converter.csv_to_json(@csv, kijunbi, @cho, @ku)
      puts "JSON変換完了: #{@json ? '成功' : '失敗'}"
    rescue => e
      puts "Error in CSV to JSON conversion: #{e.message}"
      puts "Backtrace: #{e.backtrace.first(5).join("\n")}"
      @json_error = true
    end
  end
  
  # あゆみJSONデータを処理
  def process_ayumi_json
    @csv = @data_fetcher.fetch_ayumi_csv
    kijunbi = @data_converter.generate_ayumi_kijunbi(@nengetsu)
    @data_converter.ayumi_csv_to_json(@csv, kijunbi, @nengetsu)
  end

  # あゆみ区別JSONデータを処理
  def process_ayumi_ku_json
    
    # 非存在期間チェック
    oldest_stat_nengetsu = {
      "aoba" => "199501",
      "izumi" => "199010",
      "kohoku" => "194010",
      "konan" => "197010",
      "midori" => "197010",
      "minami" => "195010",
      "naka" => "197010",
      "nishi" => "195010",
      "sakae" => "199010",
      "seya" => "197010",
      "totsuka" => "194010",
      "tsuzuki" => "199501"
    }
    if oldest_stat_nengetsu.keys.include?(@ku) && @nengetsu < oldest_stat_nengetsu[@ku]
      return generate_non_existent_data
    end
    puts "fetch_ayumi_ku_json呼出し: @ku=#{@ku}, @nengetsu=#{@nengetsu}"
    @data_fetcher.fetch_ayumi_ku_json(@ku, @nengetsu)
  end
  
  # 町丁リストを処理
  def process_cho_list
    csv = @data_fetcher.fetch_newest_cho_list(@ku)
    return "" unless csv
    
    require_relative 'cho_mei_list'
    ChoMeiList.new(csv).html
  end
  
  # 将来推計データを処理
  def process_syorai_data
    json_file = @file_manager.local_file_path(:json_syorai, nil, @nengetsu)
    json = @file_manager.read_file(json_file)
    modify_source_url(json) if json
  end
  
  # 区別将来推計データを処理
  def process_syorai_ku_data
    json_file = @file_manager.local_file_path(:json_ku_syorai, @ku, @nengetsu)
    json = @file_manager.read_file(json_file)
    modify_source_url(json) if json
  end
  
  # 住基人口データを処理
  def process_kujuki_data
    json_file = @file_manager.local_file_path(:json_kujuki, @ku, @nengetsu)
    @file_manager.read_file(json_file)
  end
  
  # オプションデータを処理
  def process_option
    case @level
    when :shi_option
      file_path = @file_manager.local_file_path(:shi_option)
    when :ku_option
      file_path = @file_manager.local_file_path(:ku_option)
    when :cho_option
      file_path = @file_manager.local_file_path(:cho_option)
    when :kujuki_option
      file_path = @file_manager.local_file_path(:kujuki_option)
    end
    
    @file_manager.read_file(file_path)
  end
  
  # 全オプションデータを処理
  def process_all_options
    p "process_all_options開始"
    ku_str = @file_manager.read_file(@file_manager.local_file_path(:ku_option))

    p "process_all_options ku_option"
    p @file_manager.local_file_path(:ku_option)
    p File.exist?(@file_manager.local_file_path(:ku_option))

    shi_str = @file_manager.read_file(@file_manager.local_file_path(:shi_option))
    cho_str = @file_manager.read_file(@file_manager.local_file_path(:cho_option))
    kujuki_str = @file_manager.read_file(@file_manager.local_file_path(:kujuki_option))
    p "process_all_options終了"
    puts ku_str[0,40]
    {
      "ku_option" => ku_str,
      "shi_option" => shi_str,
      "cho_option" => cho_str,
      "kujuki_option" => kujuki_str
    }.to_json
  end
  
  # 非存在データを生成
  def generate_non_existent_data
    data = {}
    data["shiku"] = @data_converter.ku_to_kanji(@ku)
    data["not_exist"] = data["shiku"]
    data["kijunbi"] = @data_converter.generate_kijunbi(@nengetsu)
    data["source_url"] = ""
    data["kakusai_betsu"] = Array.new(101) { ["", "0", "0", "0"] }
                                 .each_with_index { |sai, i| sai[0] = i.to_s }
    
    JSON.generate(data)
  end
  
  # ソースURLを修正
  def modify_source_url(json)
    return json unless json
    
    new_src = 'https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.files/0014_20180907.xls'
    json.sub(/http.*?xls/, new_src)
  end
  
  # 年月計算ヘルパー
  def pre_nen(nengetsu)
    "#{nengetsu[0,4].to_i - 1}#{nengetsu[4,2]}"
  end
  
  def post_3month(nengetsu)
    "#{nengetsu[0,4].to_i + 1}01"
  end
end
