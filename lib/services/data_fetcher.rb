# -*- coding: utf-8 -*-

require 'net/https'
require 'openssl'
require 'kconv'
require 'csv'
require 'nkf'
require_relative '../config/constants'

# データ取得を担当するクラス
class DataFetcher
  include PyramidConstants
  
  def initialize(file_manager)
    @file_manager = file_manager
    # SSL証明書の検証を無効化（横浜市サイトアクセス用）
    @ssl_verify_mode = OpenSSL::SSL::VERIFY_NONE
  end
  
  # HTTPSリクエストを実行
  def fetch_https_body(url)
    uri = URI.parse(SHI_HOST + url)
    https = Net::HTTP.new(uri.host, uri.port)
    https.use_ssl = true
    https.verify_mode = @ssl_verify_mode
    response = https.get(uri.request_uri)
    response.body
  rescue => e
    puts "Error fetching #{url}: #{e.message}"
    nil
  end
  
  # 町丁別CSVデータを取得
  def fetch_cho_csv(ku, nengetsu)
    file_path = @file_manager.local_file_path(:csv, ku, nengetsu)
    csv = @file_manager.read_file(file_path)
    
    # 文字コード変換
    csv = convert_encoding(csv) if csv
    
    if csv && csv.match(/(,\d+){102}/)
      # 120歳までのデータがある場合は100歳以上を合算
      summarize_over_100_years_old(csv)
    else
      # 市サイトから取得
      csv_url = build_csv_url(ku, nengetsu)
      csv = fetch_https_body(csv_url)
      csv = convert_encoding(csv) if csv
      csv = summarize_over_100_years_old(csv)
      @file_manager.save_file(file_path, csv) if csv
      csv
    end
  end
  
  # あゆみCSVデータを取得
  def fetch_ayumi_csv
    file_path = @file_manager.local_file_path(:ayumi_csv)
    @file_manager.read_file(file_path)
  end
  
  # 最新の町丁別リストを取得
  def fetch_newest_cho_list(ku)
    cho_nen_top = TOKEI_PORTAL + CHO_TOP + '/'
    top_page_html = fetch_https_body(cho_nen_top)
    return nil unless top_page_html
    
    # 最新年のページを取得
    pattern = %r!<a href=.*?(#{CHO_TOP}/..cho-nen\.html).>!
    href = top_page_html.match(/#{pattern}/)&.[](1)
    return nil unless href
    
    newest_nen_page = fetch_https_body(TOKEI_PORTAL + href)
    return nil unless newest_nen_page
    
    # 目当ての区のCSVファイルのURLを取得
    pattern1 = %r!href="(r\d\d?cho-nen.files/#{ku}(\d\d)(\d\d).csv)"!
    ans = newest_nen_page.match(/#{pattern1}/)
    return nil unless ans
    
    href1 = ans[1]
    yymm = ans[2] + ans[3]
    
    # 3月のデータの場合は前年9月に差し替え
    if ans[3] == '03'
      yymm = "#{(ans[2].to_i - 1).to_s}09"
      href1 = href1.sub(/\d\d?/, (ans[2].to_i - 19).to_s).sub(/\d{4}/, yymm)
    end
    
    # CSVを取得
    file_path = @file_manager.local_file_path(:csv, ku, yymm)
    csv = @file_manager.read_file(file_path)
    
    unless csv
      url = cho_nen_top + href1
      csv = fetch_https_body(url)
      csv = convert_encoding(csv) if csv
      @file_manager.save_file(file_path, csv) if csv
    end
    
    csv
  end
  
  private
  
  # 文字コード変換
  def convert_encoding(csv)
    return csv unless csv
    return csv.kconv(Kconv::UTF8, Kconv::SJIS) if NKF.guess(csv).to_s == "Shift_JIS"
    csv
  end
  
  # 100歳以上のデータを合算
  def summarize_over_100_years_old(cho_csv)
    return cho_csv unless cho_csv
    
    csv_array = CSV.parse(cho_csv)
    sp = csv_array[0]&.index("101歳")
    return cho_csv unless sp
    
    csv_array.map! do |line|
      sum = line.slice((sp-1)..-1).inject(0) { |sum, nin| sum + nin.to_i }
      new_line = line.slice(0..sp-1)
      
      if new_line[-1] == "100歳"
        new_line[-1] = "100歳以上"
      else
        new_line[-1] = sum
      end
      
      new_line.to_csv
    end
    
    csv_array.join
  rescue => e
    puts "Error in summarize_over_100_years_old: #{e.message}"
    cho_csv
  end
  
  # CSV URL を構築
  def build_csv_url(ku, nengetsu)
    TOKEI_PORTAL + 
      CHO_CSV.sub("<gen>", get_era_abbreviation(nengetsu))
             .sub("<ku>", ku)
             .sub("<nengetsu>", nengetsu[2,4])
  end
  
  # 元号省略形を取得
  def get_era_abbreviation(nengetsu)
    yyyy = nengetsu[0,4].to_i
    
    case yyyy
    when 2020..2999 then "r#{yyyy - 2018}"
    when 1989..2019 then "h#{yyyy - 1988}"
    when 1926..1988 then "s#{yyyy - 1925}"
    else "h#{yyyy - 1988}"
    end
  end
end
