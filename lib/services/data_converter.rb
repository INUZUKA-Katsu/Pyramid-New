# -*- coding: utf-8 -*-

require 'json'
require_relative '../config/constants'

# データ変換を担当するクラス
class DataConverter
  include PyramidConstants
  
  def initialize
  end
  
  # CSVからJSONに変換
  def csv_to_json(csv, kijunbi, cho_list, ku = nil)
    puts "csv_to_json開始: csv=#{csv}, kijunbi=#{kijunbi}, cho_list=#{cho_list}, ku=#{ku}"
    return nil unless csv
    
    # cho_listが文字列の場合は配列に変換
    if cho_list.is_a?(String)
      begin
        cho_list = JSON.parse(cho_list)
        puts "cho_listを配列に変換: #{cho_list}"
      rescue JSON::ParserError => e
        puts "cho_listのJSON解析エラー: #{e.message}"
        cho_list = [cho_list] # フォールバック: 単一要素の配列にする
      end
    end
    
    csv = csv.force_encoding("utf-8") if RUBY_VERSION[0] == "2"
    ary = []
    hitoku = false
    
    # CSVデータを解析
    csv.each_line do |line|
      l = line.chomp.split(",")
      if cho_list.include?(l[0]) || l[0] == "町名"
        hitoku = true if l.include?("X")
        ary << l
      end
    end
    
    return build_empty_json(cho_list, kijunbi) if ary.size <= 1
    
    p "csv_to_json: step1"

    # データを集計
    title = ary[0].map { |c| c.match(/歳/) ? c.sub(/歳.*/, "") : c }
    male = sum_arrays(ary.select { |l| l[2] == "男" })
    female = sum_arrays(ary.select { |l| l[2] == "女" })
    total = sum_arrays([male, female])
    
    exist_cho = ary.map { |l| l[0] }.uniq - ["町名"]
    not_exist = cho_list - exist_cho
    
    # JSON配列を構築
    j_ary = []
    title.zip(total, male, female) { |ti, to, m, f| j_ary << [ti, to, m, f] }
    j_ary.slice!(0, 3) # 最初の3要素を削除
    
    p "csv_to_json: step2"
    build_json_data(exist_cho, kijunbi, j_ary, not_exist, hitoku, ku)
  end
  
  # あゆみCSVからJSONに変換
  def ayumi_csv_to_json(csv, kijunbi, nengetsu)
    return nil unless csv
    
    csv = csv.force_encoding("utf-8") if RUBY_VERSION[0] == "2"
    ary = []
    
    csv.each_line do |line|
      l = line.chomp.split(",")
      ary << l if l[0] == "年" || l[0] == get_era_year(nengetsu)
    end
    
    return nil if ary.size < 4
    
    title = ary[0].map { |c| c.match(/歳/) ? c.sub(/歳.*/, "") : c }
    total = ary[1].map { |nin| format_number_with_commas(nin) }
    male = ary[2].map { |nin| format_number_with_commas(nin) }
    female = ary[3].map { |nin| format_number_with_commas(nin) }
    
    j_ary = []
    title.zip(total, male, female) { |ti, to, m, f| j_ary << [ti, to, m, f] }
    j_ary.slice!(0, 2)
    
    {
      "shiku" => "横浜市",
      "kijunbi" => kijunbi,
      "source_url" => "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/choki.files/4.xlsx",
      "kakusai_betsu" => j_ary
    }.to_json
  end
  
  # 基準日を生成
  def generate_kijunbi(nengetsu)
    day = (nengetsu[4,2] == "01" || nengetsu[4,2] == "10") ? "1" : "30"
    "#{get_era_full_name(nengetsu)}#{nengetsu[4,2].to_i}月#{day}日現在"
  end
  
  # あゆみ用基準日を生成
  def generate_ayumi_kijunbi(nengetsu)
    if nengetsu[0,4].to_i <= 1975 || nengetsu[4,2] == "10"
      "#{get_era_year(nengetsu)}年10月1日現在"
    else
      "#{get_era_year(nengetsu)}年1月1日現在"
    end
  end
  
  # 区名を漢字に変換
  def ku_to_kanji(kumei)
    KU_NAME_MAP[kumei] || kumei
  end
  
  private
  
  # 配列を合計
  def sum_arrays(arrays)
    return arrays[0].map { |i| "0" } if arrays.empty?
    
    initial = arrays[0].map { |i| 0 }
    sum = arrays.inject(initial) do |sum, item_ary|
      next sum if item_ary[-1] == "100歳以上"
      sum.zip(item_ary).map { |s, i| s + i.to_i }
    end
    
    sum.map(&:to_s)
  end
  
  # 空のJSONデータを構築
  def build_empty_json(cho_list, kijunbi)
    # cho_listが文字列の場合は配列に変換
    if cho_list.is_a?(String)
      begin
        cho_list = JSON.parse(cho_list)
      rescue JSON::ParserError => e
        puts "build_empty_json: cho_listのJSON解析エラー: #{e.message}"
        cho_list = [cho_list] # フォールバック: 単一要素の配列にする
      end
    end
    
    title = ["年齢"] + (0..100).to_a.map(&:to_s) + ["100歳以上"]
    j_ary = title.map { |i| [i, "0", "0", "0"] }
    j_ary.slice!(0, 3)
    
    build_json_data(cho_list, kijunbi, j_ary, cho_list, false)
  end
  
  # JSONデータを構築
  def build_json_data(exist_cho, kijunbi, j_ary, not_exist = [], hitoku = false, ku = nil)
    data = {}
    data["shiku"] = exist_cho.join(",")
    data["kijunbi"] = kijunbi
    data["source_url"] = ku ? build_source_url(ku) : ""
    data["kakusai_betsu"] = j_ary
    data["not_exist"] = not_exist.size > 0 ? not_exist.join(",") : ""
    data["hitoku"] = hitoku
    
    JSON.generate(data)
  end
  
  # ソースURLを構築
  def build_source_url(ku)
    # 実装時に適切なURLを設定
    SHI_HOST + "/example/source/url"
  end
  
  # 数値にカンマを追加
  def format_number_with_commas(num)
    num.gsub(/(\d)(?=(\d{3})+(?!\d))/, '\1,')
  end
  
  # 元号の年を取得
  def get_era_year(nengetsu)
    yyyy = nengetsu[0,4].to_i
    
    case yyyy
    when 2020..2999 then "令和#{yyyy - 2018}年"
    when 2019 then nengetsu[4,2].to_i == 1 ? "平成31年" : "令和元年"
    when 1990..2018 then "平成#{yyyy - 1988}年"
    when 1989 then nengetsu[4,2].to_i == 1 ? "昭和64年" : "平成元年"
    when 1926..1988 then "昭和#{yyyy - 1925}年"
    when 1912..1925 then "大正#{yyyy - 1911}年"
    else "#{yyyy}年"
    end
  end
  
  # 元号のフルネームを取得
  def get_era_full_name(nengetsu)
    get_era_year(nengetsu)
  end
end

