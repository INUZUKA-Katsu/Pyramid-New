#coding:utf-8
require "time"
require "cgi"
require "kconv"
require "fileutils"
require "net/https"
require 'open-uri'
require 'openssl'
require 'roo'
require 'json'

Dir.chdir(__dir__)

RShiku = {"age"=>"横浜市", "tsurumi"=>"鶴見区", "kanagawa"=>"神奈川区", "nishi"=>"西区", "naka"=>"中区", "minami"=>"南区", "konan"=>"港南区", "hodogaya"=>"保土ケ谷区", "asahi"=>"旭区", "isogo"=>"磯子区", "kanazawa"=>"金沢区", "kohoku"=>"港北区", "midori"=>"緑区", "aoba"=>"青葉区", "tsuzuki"=>"都筑区", "totsuka"=>"戸塚区", "sakae"=>"栄区", "izumi"=>"泉区", "seya"=>"瀬谷区"}
ShiKu = {"横浜市"=>0, "鶴見区"=>1, "神奈川区"=>2, "西区"=>3, "中区"=>4, "南区"=>5, "港南区"=>6, "保土ケ谷区"=>7, "旭区"=>8, "磯子区"=>9, "金沢区"=>10, "港北区"=>11, "緑区"=>12, "青葉区"=>13, "都筑区"=>14, "戸塚区"=>15, "栄区"=>16, "泉区"=>17, "瀬谷区"=>18}

Site = 'https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/'
#市区別年齢別人口（推計人口）のインデックスのページ
Parent_url_shiku = 'jinko/nenrei/suikei.html'
Child_url_shiku  = 'jinko/nenrei/suikei.files/'

#町丁別年齢別人口のインデックスのページ
Parent_url_cho   = 'jinko/chocho/nenrei/index.html'
#p URI(Site).merge(Parent_url_shiku)
Local_excel_shiku = 'excel/'
Local_json_shiku  = 'nenreibetsu/'

Location0          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/nenrei/juki/"
Location3          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/"
#町丁別年齢別人口のcsvファイルのurl
Location5          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/<gen>cho-nen.files/<ku><nengetsu>.csv" #<gen>:h31,r02,r03・・・

class Integer
  def to_str_add_cumma
    self.to_s.reverse.gsub( /\d{3}(?=\d)/, '\0,').reverse
  end
end
class String
  def to_str_add_cumma
    self
  end
end


  #市区年齢別推計人口のexcelファイルのリストを返す。
  #戻り値：uriオブジェクトの配列
  def get_url_list_shiku()
    uri  = URI(Site).merge(Parent_url_shiku)
    html = uri.read
    list = html.scan(/<a class="xls" href="(.*hyo22\.xlsx)">/).flatten
    list.map{|file| uri.merge(file)}
  end
  #list = get_url_list_shiku()
  
  #uriリストのうち、ローカルにダウンロード済みでないもののリストを返す。
  def select_not_downloaded(list,dest_folder)
    downloaded = list.select{|uri| 
      local = File.join( dest_folder , File.basename(uri.path))
      File.exist?(local) and
      URI.open(uri).last_modified.localtime < File.stat(local).mtime.localtime
    }
    list - downloaded
  end
  #p select_not_downloaded(get_url_list_shiku(),"./excel")

  def download(uri,dest_folder)
    dest_file = File.join( dest_folder , File.basename(uri.path) )
    open(dest_file, "w+b") do |dest|
      dest.write(uri.read)
    end
  end
  #list = get_url_list_shiku()
  #download(list[1],'./excel')

  def download_by_list(uri_list,dest_folder)
    uri_list.each do |uri|
      download(uri,dest_folder)
    end
  end
  #list     = get_url_list_shiku()
  #download_by_list(list,'./excel')

  def not_made_json_shiku
    ary = []
    nen = Dir.glob(File.join(Local_excel_shiku,"*.xlsx")).map{|f| f.match(/\d{2}/)[0]}.sort
    nen.each do |yy|
      RShiku.keys.each do |ku|
        json = ku + yy + '01-j.txt'
        unless File.exist? File.join(Local_json_shiku, json)
          ary << [ku, yy+'_hyo22.xlsx', json]
        end
      end
    end
    ary
  end
  #p not_made_json_shiku

  def is_old_json_shiku
    ary = []
    nen = Dir.glob(File.join(Local_excel_shiku,"*.xlsx")).map{|f| f.match(/\d{2}/)[0]}.sort
    nen.each do |yy|
      excel = yy+'_hyo22.xlsx'
      excel_modified = File.stat(File.join( Local_excel_shiku, excel) ).mtime
      RShiku.keys.each do |ku|
        json = ku+yy+'01-j.txt'
        json_modified = File.stat(File.join( Local_json_shiku, json) ).mtime
        if json_modified < excel_modified
          ary << [ku, yy+'_hyo22.xlsx', json]
        end
      end
    end
    ary    
  end
  #p is_old_json_shiku

  def save_json_from_excel_hyo22(ary)
    ku,xlsx_file,json = ary
    local = File.join( Local_excel_shiku, xlsx_file )
    xlsx  = Roo::Excelx.new( local )
    sheet = xlsx.sheet(ShiKu[RShiku[ku]])
    first = sheet.first_row
    last  = sheet.last_row
    kijunbi = nil
    ary1  = []
    ary2  = [] 
    (first..last).each do |r|
       kijunbi ||= sheet.row(r).find{|c| c!=nil and c.match(/日現在/)}
       d1 = sheet.row(r)[0..3]
       if d1[0]
         if d1[0].class==Integer
           ary1 << d1
         elsif d1[0].match(/総[　 ]*数/)
          d1[0] = '総数'
           ary1 << d1
         end
       end
       d2 = sheet.row(r)[4..7]
       if d2[0]
         if d2[0].class==Integer
           ary2 << d2
         elsif d2[0].match(/100[　 ]*歳[　 ]*以[　 ]*上|年[　 ]*齢[　 ]*不[　 ]*詳$/)
           d2[0] = 100 if d2[0][0,3]=='100'
           ary2 << d2
         end
       end
    end
    remote        = Site+Child_url_shiku+xlsx_file
    ary = ary1 + ary2
    ary.map! do |a|
      a.map!{|d| d ? d.to_str_add_cumma : d}
    end
    hs = {}
    hs['last_modified'] = URI(remote).open.last_modified.localtime
    hs['kijunbi']       = kijunbi.tr('０-９','0-9')
    hs['shiku']         = RShiku[ku]
    hs['source_url']    = remote
    hs['kakusai_betsu'] = ary
    File.write(File.join(Local_json_shiku, json), JSON.generate(hs))
  end
  #print get_array_from_excel_hyo22('hodogaya', '19_hyo22.xlsx','hodogaya1901-j.txt')

  #ローカルにない市区年齢別人口のexcelファイルをダウンロードする.
  # 1. ポータルサイトぼファイル一覧を取得し、
  portal_site_shiku_excel_list = get_url_list_shiku()
  # 2. そのうちローカルにないものをリストアップする。
  need_to_download_shiku_excel_file = select_not_downloaded( portal_site_shiku_excel_list, Local_excel_shiku )
  # 3. リストアップしたファイルをダウンロードする。
  download_by_list( need_to_download_shiku_excel_file , Local_excel_shiku )

  #ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する
  p "ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する"
  list = not_made_json_shiku
  list.each do |ary|
    p ary
    save_json_from_excel_hyo22(ary)
  end
  #ローカルのexcelとjsonを比較し、excelの方が新しいときjsonを作成し、上書き保存する
  p "excelの方が新しいので、jsonを作成し、上書き保存する"
  list = is_old_json_shiku
  list.each do |ary|
    p ary
    save_json_from_excel_hyo22(ary)
  end
