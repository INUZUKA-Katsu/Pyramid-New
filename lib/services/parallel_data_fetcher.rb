# -*- coding: utf-8 -*-

require 'json'
require_relative '../models/population_data'

# 並列データ取得を担当するクラス
class ParallelDataFetcher
  def initialize(s3_client)
    @s3_client = s3_client
  end
  
  # 複数年のデータを並列で取得
  def fetch_batch_years(shiku, year_with_level, cho_selection = nil)
    puts "ParallelDataFetcher: 開始 - shiku=#{shiku}, year_with_level=#{year_with_level}, cho_selection=#{cho_selection}"
    
    results = []
    mutex = Mutex.new
    errors = []
    
    # スレッドプールで並列処理
    threads = year_with_level.map do |year_with_level|
      Thread.new do
        begin
          year = year_with_level[:year]
          level = year_with_level[:level]
          
          # 年次の処理を修正
          nengetsu = process_year_for_request(year)
          puts "Thread: #{year} -> nengetsu: #{nengetsu} のデータ取得開始"
          
          data = PopulationData.new(shiku, nengetsu, level, cho_selection, @s3_client, :is_batch)
          
          mutex.synchronize do
            results << {
              year: year,
              data: JSON.parse(data.json),  # JSON文字列をオブジェクトに変換して保存
              success: true
            }
            puts "Thread: #{year} のデータ取得完了"
          end
          
        rescue => e
          puts "Thread: #{year} のデータ取得エラー: #{e.message}"
          mutex.synchronize do
            errors << { year: year, error: e.message }
            results << {
              year: year,
              data: nil,
              success: false,
              error: e.message
            }
          end
        end
      end
    end
    
    # 全スレッドの完了を待つ
    threads.each(&:join)
    
    puts "ParallelDataFetcher: 完了 - 成功: #{results.count { |r| r[:success] }}, エラー: #{errors.size}"
    
    # エラーがあった場合はログ出力
    if errors.any?
      puts "エラー詳細:"
      errors.each { |e| puts "  #{e[:year]}: #{e[:error]}" }
    end
    
    # ハッシュ形式で返す（year => data）
    results_hash = {}
    results.each do |result|
      results_hash[result[:year]] = {
        data: result[:data],
        success: result[:success],
        error: result[:error]
      }
    end
    results_hash
  end
  
  # 年次をリクエスト用に処理
  def process_year_for_request(year)
    puts "process_year_for_request: 入力年次=#{year}"
    
    case year
    when "new"
      # "new"の場合はそのまま渡す（PopulationDataで最新年次を取得）
      puts "process_year_for_request: 'new'をそのまま返す"
      "new"
    when /^\d{4}ft$/
      # 将来推計年次（例：2025ft）の場合はそのまま
      puts "process_year_for_request: 将来推計年次=#{year}"
      year
    when /^\d{6}$/
      # 6桁の年次（例：202101）の場合はそのまま
      puts "process_year_for_request: 6桁年次=#{year}"
      year
    when /^\d{6}01$/
      # 8桁の年次（例：20210101）の場合はそのまま
      puts "process_year_for_request: 8桁年次=#{year}"
      year
    when /^\d{6}09$/
      # 8桁の年次（例：20210909）の場合はそのまま
      puts "process_year_for_request: 8桁年次=#{year}"
      year
    else
      # その他の場合は01を付加（従来の動作）
      nengetsu = "#{year}01"
      puts "process_year_for_request: その他年次=#{year} -> #{nengetsu}"
      nengetsu
    end
  end

  # 単一年のデータを取得（テスト用）
  def fetch_single_year(shiku, year, level = :shiku_json)
    puts "SingleDataFetcher: #{year} のデータ取得開始"
    
    begin
      nengetsu = process_year_for_request(year)
      # levelを文字列からシンボルに変換
      level_symbol = level.is_a?(String) ? level.to_sym : level
      data = PopulationData.new(shiku, nengetsu, level_symbol, nil, @s3_client)
      
      {
        year: year,
        data: JSON.parse(data.json),  # JSON文字列をオブジェクトに変換して保存
        success: true
      }
    rescue => e
      puts "SingleDataFetcher: #{year} のデータ取得エラー: #{e.message}"
      {
        year: year,
        data: nil,
        success: false,
        error: e.message
      }
    end
  end
  
  # 利用可能な年次リストを取得
  def get_available_years(shiku)
    puts "利用可能な年次リストを取得中: #{shiku}"
    
    # 現在は固定の年次リストを返す（後でS3から動的に取得するように拡張可能）
    available_years = []
    
    # 2021年から1990年まで（実際のデータに合わせて調整）
    (1990..2021).each do |year|
      available_years << "#{year}01"
    end
    
    puts "利用可能年次: #{available_years.size}年"
    available_years
  end
end

