# -*- coding: utf-8 -*-

require_relative '../config/constants'

# ファイル管理を担当するクラス
class FileManager
  include PyramidConstants
  
  attr_reader :s3_client
  
  def initialize(s3_client = nil)
    @s3_client = s3_client
    @root_dir = File.dirname(File.expand_path(__FILE__ + "/../.."))
  end
  
  # ローカルファイルのパスを取得
  def local_file_path(file_type, ku = nil, nengetsu = nil)
    case file_type
    when :json
      JSON_FILE_S3.sub("<ku>", ku).sub("<nengetsu>", nengetsu[2,4])
    when :json_kujuki
      nen = nengetsu[2,4]
      JSON_FILE_KUJUKI_S3.sub("<ku>", ku).sub("<nen>", nen)
    when :json_syorai
      nen = nengetsu[0,4]
      @root_dir + JSON_FILE_SYORAI.sub("<nen>", nen)
    when :json_ku_syorai
      nen = nengetsu[0,4]
      @root_dir + JSON_FILE_KU_SYORAI.sub("<ku>", ku).sub("<nen>", nen)
    when :csv
      CSV_FILE_S3.sub("<ku>", ku).sub("<nengetsu>", nengetsu[2,4])
    when :shiku_csv
      shiku = ku == "age" ? 'yokohama' : ku
      @root_dir + SHIKU_CSV_FILE.sub("<ku>", shiku).gsub("<nengetsu>", nengetsu[2,4])
    when :ayumi_csv
      @root_dir + AYUMI_CSV_FILE
    when :ayumi_ku_json
      @root_dir + AYUMI_KU_FILE.sub("<ku>", ku).sub("<nengetsu>", nengetsu)
    when :shi_option
      SHI_OPTION_FILE_S3
    when :ku_option
      #KU_OPTION_FILE_S3  開発中は暫定ファイルを使用
      @root_dir + KU_OPTION_FILE
    when :cho_option
      CHO_OPTION_FILE_S3
    when :ayumi_option
      AYUMI_OPTION_FILE_S3
    when :syorai_option
      SYORAI_OPTION_FILE_S3
    when :kujuki_option
      KU_JUKI_OPTION_FILE_S3
    else
      raise ArgumentError, "Unknown file type: #{file_type.to_s}"
    end
  end
  
  # ファイルを読み込み
  def read_file(file_path)
    @s3_client = S3Client.new if @s3_client.nil?
    if file_path.start_with?('Pyramid') && @s3_client&.exist?(file_path)
      
      puts
      puts "s3_client.read_file: #{file_path}"
      puts
      
      @s3_client.read(file_path)
    elsif File.exist?(file_path)
      puts "read_file: "+file_path
      File.read(file_path)
    else
      nil
    end
  end
  
  # ファイルに保存
  def save_file(file_path, content)
    @s3_client = S3Client.new if @s3_client.nil?
    if file_path.start_with?('Pyramid') && @s3_client
      @s3_client.write(file_path, content)
    else
      File.write(file_path, content)
    end
  end
  
  # ファイルの存在チェック
  def file_exists?(file_path)
    @s3_client = S3Client.new if @s3_client.nil?
    if file_path.start_with?('Pyramid') && @s3_client
      @s3_client.exist?(file_path)
    else
      File.exist?(file_path)
    end
  end

  def get_file_list(file_type,shiku=nil)
    @s3_client = S3Client.new if @s3_client.nil?
    res = nil
    case file_type
    when :shiku_json
      dir = File.dirname(JSON_FILE_S3)
      list = @s3_client.get_list(dir).select { |f| f.match(/#{shiku}\d+\-j\.txt/) }
      list1 = list.select { |f| f.match(/9\d{3}-j\.txt/) }.sort
      res =list1 + (list - list1).sort #nengetuの古い順
    when :ayumi_json
      res= [ @root_dir + AYUMI_CSV_FILE ]
    when :ayumi_ku_json
      res=Dir.glob(File.dirname(@root_dir + AYUMI_KU_FILE) + "/#{shiku}*-5g.txt")
      puts res
    when :syorai_json
      res=Dir.glob(File.dirname(@root_dir + JSON_FILE_SYORAI) + "/*suikei.txt")
    when :syorai_ku_json
      res=Dir.glob(File.dirname(@root_dir + JSON_FILE_KU_SYORAI) + "/#{shiku}-*-suikei.txt")
    when :cho_json
      dir = File.dirname(CSV_FILE_S3)
      list = @s3_client.get_list(dir).select { |f| f.match(/#{shiku}\d{4}\.csv/) }
      list1 = list.select { |f| f.match(/9\d{3}\.csv/) }.sort
      res =list1 + (list - list1).sort #nengetuの古い順
    end
    res
  end

  # 市区名等から人口ピラミッドの元になる人口データの全ファイルリストを取得する
  def get_all_file_list(shiku,cho=nil)
    res = nil
    if shiku == "age"
      file_types = [:ayumi_json, :shiku_json, :syorai_json]
    elsif cho==nil
      file_types = [:ayumi_json, :shiku_json,:syorai_ku_json]
    else
      file_types = [:cho_json]
    end
    files = []
    years = nil
    file_types.each do |file_type|
      unless cho
        list = get_file_list(file_type,shiku)
        years = list.map{|f| "20"+f[/\d{2}(?=\d{2})/]} if file_type==:shiku_json
        if [:syorai_json,:syorai_ku_json].include?(file_type)
          list.delete_if do |f|
             years.include?(f[/\d{4}(?=-suikei)/])
          end
        end
        files << list
      else
        list = get_file_list(file_type,shiku)
        files << list
      end
    end
    files.flatten
  end
end


