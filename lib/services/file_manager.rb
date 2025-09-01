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
    when :shi_option
      SHI_OPTION_FILE_S3
    when :ku_option
      KU_OPTION_FILE_S3
    when :cho_option
      CHO_OPTION_FILE_S3
    when :ayumi_option
      AYUMI_OPTION_FILE_S3
    when :syorai_option
      SYORAI_OPTION_FILE_S3
    when :kujuki_option
      KU_JUKI_OPTION_FILE_S3
    else
      raise ArgumentError, "Unknown file type: #{file_type}"
    end
  end
  
  # ファイルを読み込み
  def read_file(file_path)
    if file_path.start_with?('Pyramid') && @s3_client&.exist?(file_path)
      @s3_client.read(file_path)
    elsif File.exist?(file_path)
      File.read(file_path)
    else
      nil
    end
  end
  
  # ファイルに保存
  def save_file(file_path, content)
    if file_path.start_with?('Pyramid') && @s3_client
      @s3_client.write(file_path, content)
    else
      File.write(file_path, content)
    end
  end
  
  # ファイルの存在チェック
  def file_exists?(file_path)
    if file_path.start_with?('Pyramid') && @s3_client
      @s3_client.exist?(file_path)
    else
      File.exist?(file_path)
    end
  end
end
