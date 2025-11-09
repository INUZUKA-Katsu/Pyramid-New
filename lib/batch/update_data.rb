#coding:utf-8

require "time"
require "cgi"
require "kconv"
require "fileutils"
require "net/ftp"
require "net/https"
require 'net/smtp'
require 'open-uri'
require 'openssl'
require 'json'
require 'logger'

require 'roo'
require 'mechanize'
require 'mail'

require_relative '../services/s3_client'
require_relative './get_from_portal_site'
require_relative './make_shiku_option'
require_relative './make_cho_option'

Dir.chdir(__dir__)

S3=S3Client.new

RShiku = {"age"=>"横浜市", "tsurumi"=>"鶴見区", "kanagawa"=>"神奈川区", "nishi"=>"西区", "naka"=>"中区", "minami"=>"南区", "konan"=>"港南区", "hodogaya"=>"保土ケ谷区", "asahi"=>"旭区", "isogo"=>"磯子区", "kanazawa"=>"金沢区", "kohoku"=>"港北区", "midori"=>"緑区", "aoba"=>"青葉区", "tsuzuki"=>"都筑区", "totsuka"=>"戸塚区", "sakae"=>"栄区", "izumi"=>"泉区", "seya"=>"瀬谷区"}
ShiKu = {"横浜市"=>0, "鶴見区"=>1, "神奈川区"=>2, "西区"=>3, "中区"=>4, "南区"=>5, "港南区"=>6, "保土ケ谷区"=>7, "旭区"=>8, "磯子区"=>9, "金沢区"=>10, "港北区"=>11, "緑区"=>12, "青葉区"=>13, "都筑区"=>14, "戸塚区"=>15, "栄区"=>16, "泉区"=>17, "瀬谷区"=>18}

Site = 'https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/'
#市区別年齢別人口（推計人口）のインデックスのページ
Parent_url_shiku = 'jinko/nenrei/suikei.html'
Child_url_shiku  = 'suikei.files/'

#町丁別年齢別人口のインデックスのページ
Parent_url_cho   = "jinko/chocho/nenrei/"
Child_url_cho    = '<gen>cho-nen.files/<ku><nengetsu>.csv'

#市区別年齢別人口（住基人口）のインデックスページ
Parent_url_shikujuki = "jinko/nenrei/juki/"

#ローカルフォルダ
AWS_excel_shiku = 'Pyramid/excel/'
AWS_json_shiku  = 'Pyramid/nenreibetsu/'
AWS_csv_cho     = 'Pyramid/nenreibetsu/'

#オプションファイル
AWS_shi_option    = "Pyramid/option/shi-option.txt"
AWS_ku_option     = "Pyramid/option/ku-option.txt"
AWS_ayumi_option  = "Pyramid/option/ayumi-option.txt"
AWS_syorai_option = "Pyramid/option/syorai-option.txt"
AWS_cho_option    = "Pyramid/option/cho-option.txt"
AWS_kujuki_option = "Pyramid/option/kujuki-option.txt"

#AWSのファイルリスト
AWS_excel_list = 'Pyramid/excel/excel_list.json'
AWS_txt_list   = 'Pyramid/nenreibetsu/txt_list.json'
AWS_csv_list   = 'Pyramid/nenreibetsu/csv_list.json'

#データが更新される1月と10月以外の月は直ちに終了する。
unless Time.now.month == 1 or Time.now.month == 10
  puts "1月と10月以外の月はここでプログラムを終了します。"
  exit
end
##奇数の日は直ちに終了する。
if Time.now.day % 2 == 1
  puts "奇数の日はここでプログラムを終了します。" 
  exit
end
$logger = Logger.new(STDOUT)

  #********************************
  #                               *
  # 1 推計人口の新データ確認、更新処理  *
  #                               *
  #********************************
  shiku_update = false

  #ローカルにない市区年齢別人口のexcelファイルをダウンロードする.
  # 1. ポータルサイトの"hyo22.xlsxファイルのurlの一覧を取得し、
  portal_site_shiku_excel_list = get_url_list_shiku()

  # 2 AWS S3に保存されているexcelと市区のjsonファイルのリストを取得する.
  s3_excel_hash = JSON.parse(S3.read(AWS_excel_list))
  s3_txt_hash   = JSON.parse(S3.read(AWS_txt_list))

  # 3. ポータルサイトのファイル一覧のうちAWS S3にないものをリストアップする。戻り値はuriの配列。
  need_to_download_shiku_excel_list = select_not_downloaded( portal_site_shiku_excel_list, s3_excel_hash )
  #puts need_to_download_shiku_excel_list
  
  # 4. リストアップしたファイルをダウンロードする。また、AWSのexcelファイルリストを更新する。
  if need_to_download_shiku_excel_list.size>0
    p '市サイトからダウンロードする.=>'+need_to_download_shiku_excel_list.to_s
    download_by_list( need_to_download_shiku_excel_list , AWS_excel_shiku )
    update_s3_excel_hash(s3_excel_hash,need_to_download_shiku_excel_list)
  else
    p '新しいExcelファイルはありませんでした。'
  end
  #ここまでOK(2022.5.3)

  # 5. ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する。
  p "ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する"
  list1 = not_made_json_shiku( s3_excel_hash, s3_txt_hash )
  if list1.size>0
    list1.each do |ary|
      s3_txt_hash = save_json_from_excel_hyo22( ary, AWS_json_shiku, s3_txt_hash )
    end
    S3.write( AWS_txt_list, JSON.generate(s3_txt_hash) )
    shiku_update = true
  else
    p "不足しているjsonはありませんでした."
  end

  # 6. ローカルのexcelとjsonを比較し、excelの方が新しいときjsonを作成し、上書き保存する。
  p "excelとjsonのmtimeを比較し、excelの方が新しいとき、jsonを再作成し、上書き保存する"
  list2 = is_old_json_shiku( s3_excel_hash )
  p "list2"
  p list2.to_s
  puts
  p "AWS_json_shiku"
  p AWS_json_shiku.to_s
  puts
  p "s3_txt_hash"
  p s3_txt_hash.to_s
  if list2.size>0
    list2.each do |ary|
      s3_txt_hash = save_json_from_excel_hyo22( ary, AWS_json_shiku , s3_txt_hash )
    end
    S3.write( AWS_txt_list, JSON.generate(s3_txt_hash) )    
    shiku_update = true
  else
    p "excelよりmtimeの古いjsonはありませんでした。"
  end
  p "人口データUpdate終了。"
  
  #************************************
  #                                   *
  # 2 区町丁別年齢別CSVファイル取得・更新   *
  #                                   *
  #************************************

  site_csv_list = get_csv_url_list
  aws_csv_list  = get_aws_csv_list
  new_csv_list  = get_rack_or_old( site_csv_list, aws_csv_list )
  
  if new_csv_list.size>0
    new_csv_list.keys.each do |url|
      p url
      dest_file = new_csv_list[url]
      dest_contents = URI.parse(url).read.toutf8
      p dest_file
      p dest_contents[0,50]
      puts
      S3.write(dest_file, dest_contents)
      aws_csv_list[ File.basename(dest_file) ] = Time.now.floor.localtime.to_s
    end
    S3.write( AWS_csv_list, JSON.generate(aws_csv_list))
    cho_update = true
  else
    cho_update = false
  end

  #********************************
  #                               *
  # 3 市区オプションファイル更新処理   *
  #                               *
  #********************************
  
  if shiku_update
    S3.write( AWS_shi_option, make_shiku_option("age") )
    S3.write( AWS_ku_option, make_shiku_option("tsurumi") )
  end
  
  #********************************
  #                               *
  # 4 町丁オプションファイル更新処理   *
  #                               *
  #********************************

  if cho_update
    if not S3.exist?(AWS_cho_option) or S3.last_modified(AWS_cho_option).to_date<(Date.today-1)
      p :made_new_option
      puts make_cho_option.split("\n")
    else
      p :existed_option
      puts S3.read(AWS_cho_option).split("\n")
    end
  
    if not S3.exist?(AWS_kujuki_option) or S3.last_modified(AWS_kujuki_option).to_date<(Date.today-1)
      p :made_new_option
      puts make_kujuki_option.split("\n")
    else
      p :existed_option
      puts S3.read(AWS_kujuki_option).split("\n")
    end
  end


