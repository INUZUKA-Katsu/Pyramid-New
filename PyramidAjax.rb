#!/usr/bin/env ruby
# -*- coding: utf-8 -*-

#// 横浜市の人口ピラミッド ver2.10 2017.1.14  INUZUKA Katsu
require "json"
require "time"
require "cgi"
require "kconv"
require "fileutils"
require "net/https"
require 'open-uri'
require 'openssl'

#$KCODE = "utf-8"
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE
Encoding.default_external = "utf-8" if RUBY_VERSION[0]=="2"

JSONFile           = "/nenreibetsu/<ku><nengetsu>-j.txt"
JSONFile_SYORAI    = "/syoraisuikei/<nen>-suikei.txt"
JSONFile_KU_SYORAI = "/syoraisuikei/kubetsu/<ku>-<nen>-suikei.txt"
CSVFile            = "/nenreibetsu/<ku><nengetsu>.csv"
ShikuCSVFile       = "/e3yokohama<nengetsu>/e3<ku><nengetsu>.csv"
AyumiCSVFile       = "/ayumi/ayumi.csv"
ShiOptionFile      = "/nenreibetsu/shi-option.txt"
KuOptionFile       = "/nenreibetsu/ku-option.txt"
ChoOptionFile      = "/nenreibetsu/cho-option.txt"
AyumiOptionFile    = "/ayumi/ayumi-option.txt"
SyoraiOptionFile   = "/syoraisuikei/syorai-option.txt"
LocalDirShikuJson  = 'nenreibetsu/'

#Location0          = "http://archive.city.yokohama.lg.jp/ex/stat/jinko/age/new/age-j.html"
Location0          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/nenrei/juki/"
Location1          = "http://archive.city.yokohama.lg.jp/ex/stat/jinko/age/<nengetsu>/<ku>-j.html"
Location2          = "http://archive.city.yokohama.lg.jp/ex/stat/jinko/choage/<nengetsu>/csv/<ku><nengetsu>.csv"
#Location3          = "http://archive.city.yokohama.lg.jp/ex/stat/jinko/choage/mokuji/tsurumi.html"
Location3          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/"
#町丁別年齢別人口のインデックスのページ
Location4          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/index.html"
#町丁別年齢別人口のcsvファイルのurl
Location5          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/<gen>cho-nen.files/<ku><nengetsu>.csv" #<gen>:h31,r02,r03・・・
Location6          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/opendata/suikei03.files/e3yokohama<nengetsu>.zip"

def alert(s)
    str = "Content-Type: text/html\n\n"
    #print s.gsub(/Shift_JIS|shift_jis/u,"UTF-8")
    str << '<html>'
    str << '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>'
    str << s
    str << "</html>"
    ["text/html",str]
end

class String
  def to_utf8
    if RUBY_VERSION[0,3]=="1.8"
      self
    else
      self.force_encoding("utf-8")
    end
  end
end

class ChoMeiList
  attr_reader :cho_mei,:html
  def initialize(csv_data)
    csv=[]
    csv_data.each_line { |line|
      csv << line.split(",")[0]
    }
    cho_mei = csv.uniq.select{|ch| ch.size<30 and not ch.match("町名") and not ch.match("合計")}
    col_num=8 #町丁名リストの列数を指定する。
    if cho_mei.size%col_num==0
      num    = cho_mei.size/col_num
    else
      num    = cho_mei.size/col_num.to_i+1
    end
    html_a   = []
    cho_mei.each_with_index{|ch,i|
      html_a << "<div class=\"cho\">\n"        if i==0
      html_a << "</div><div class=\"cho\">\n"  if i>0 and i%num==0
      html_a << "  <li><input name=\"cho_list\" value=\"#{ch}\" type=\"checkbox\" id=\"cho#{i}\"><label for=\"cho#{i}\">#{ch}</label></li>\n"
    }
    html_a << "</div>"
    @html    = html_a.join
  end
end

class GetDATA
  attr_reader :json, :html_str, :csv, :shiku, :nenreibetsu, :json_error

  def initialize(ku,nengetsu,level,cho=nil)
    @ku            = ku
    @nengetsu      = nengetsu
    if nengetsu=="new" and level==:shiku_json
      ary = []
      Dir.glob(LocalDirShikuJson+"tsurumi*.txt").each do |f|
        if ans=f.match(/\d{4}/)
          ary << ans[0]
        end
      end
      @nengetsu = ary.select{|nengetsu| nengetsu.to_i<9001}.max
    else
      @nengetsu    = nengetsu
    end
    @cho           = cho
    @json_error    = nil
    case level
    when :shiku_json
      begin
      @json        = get_shiku_data()
      rescue => e
        alert(e.message)
      end
    when :syorai_json
      @json        = get_syorai_data()
    when :syorai_ku_json
      @json        = get_syorai_ku_data(@ku)
    when :cho_csv,:cho_csv_for_save
      @csv         = get_csv_of_cho(@ku,@nengetsu)
    when :cho_json
      @csv         = get_csv_of_cho(@ku,@nengetsu)
      @kijunbi     = kijunbi(nengetsu)
      begin
        @json      = make_json_from_csv(@csv,@kijunbi,@cho)
      rescue
      #文字コードエラーでJSONへの変換ができなかったときはCSVを返す.
        @json_error= true
      end
    when :ayumi_json
      @csv         = get_csv_of_ayumi()
      @kijunbi     = ayumi_kijunbi(nengetsu)
      @json        = make_json_from_ayumi_csv(@csv,@kijunbi,@nengetsu)
    when :cho_list
      @html_str    = get_newest_cho_list(@ku)
    when :shi_option
      @html_str    = get_shi_option()
    when :ku_option
      @html_str    = get_ku_option()
    when :cho_option
      @html_str    = get_cho_option()
    when :all_options
      @json        = get_all_options()
    end
  end

  #年月（ex."1909"）から元号年(ex."r01")を取得する
  def gennen(nengetsu)
    nen = nengetsu[0,2].to_i
    if nen<=19
      "h" + (nen+12).to_s
    elsif nen<=27
      "r" + (nen-18).to_s
    else
      "r" + (nen-18).to_s
    end
  end

  def web_location(syubetsu,nengetsu=@nengetsu)
    if syubetsu==:html
      Location1.gsub("<ku>",@ku).gsub("<nengetsu>",nengetsu)
    elsif syubetsu==:shiku_zip
      Location6.gsub("<nengetsu>",nengetsu)      
    elsif syubetsu==:csv
      if nengetsu >= "1809"
        if @ku=="age"
          shiku = 'yokohama'
        else
          shiku = @ku
        end
        Location5.gsub("<gen>",gennen(nengetsu)).gsub("<ku>",shiku).gsub("<nengetsu>",nengetsu)
      else
        Location2.gsub("<ku>",@ku).gsub("<nengetsu>",nengetsu)
      end
    end
  end

  def local_file(syubetsu,nengetsu=@nengetsu)
    case syubetsu
      when :json
        File.dirname(File.expand_path(__FILE__)) + JSONFile.sub("<ku>",@ku).sub("<nengetsu>",nengetsu)
      when :json_syorai
        nen = nengetsu[0,4]
        File.dirname(File.expand_path(__FILE__)) + JSONFile_SYORAI.sub("<nen>",nen)
      when :json_ku_syorai
        nen = nengetsu[0,4]
        File.dirname(File.expand_path(__FILE__)) + JSONFile_KU_SYORAI.sub("<ku>",@ku).sub("<nen>",nen)
      when :csv
        File.dirname(File.expand_path(__FILE__)) + CSVFile.sub("<ku>",@ku).sub("<nengetsu>",nengetsu)
      when :shiku_csv
        if @ku=="age"
          shiku = 'yokohama'
        else
          shiku = @ku
        end
        File.dirname(File.expand_path(__FILE__)) + ShikuCSVFile.sub("<ku>",shiku).gsub("<nengetsu>",nengetsu)
      when :ayumi_csv
        File.dirname(File.expand_path(__FILE__)) + AyumiCSVFile
      when :shi_option
        File.dirname(File.expand_path(__FILE__)) + ShiOptionFile
      when :ku_option
        File.dirname(File.expand_path(__FILE__)) + KuOptionFile
      when :cho_option
        File.dirname(File.expand_path(__FILE__)) + ChoOptionFile
      when :ayumi_option
        File.dirname(File.expand_path(__FILE__)) + AyumiOptionFile
      when :syorai_option
        File.dirname(File.expand_path(__FILE__)) + SyoraiOptionFile
    end
  end

  def get_shiku_data()
    if ku_not_exist = json_of_not_exist_ku()
      return ku_not_exist
    end
    json_file  = local_file(:json)
    json       = get_local(json_file)
    json
  end

  def modify_src(json)
    new_src = 'https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.files/0014_20180907.xls'
    json.sub(/http.*?xls/,new_src)
  end

  def get_syorai_data()
    json_file  = local_file(:json_syorai)
    json       = get_local(json_file)
    json       = modify_src(json)
    json
  end

  def get_syorai_ku_data(ku)
    json_file  = local_file(:json_ku_syorai)
    json       = get_local(json_file)
    json       = modify_src(json)
    return json
  end

  def json_of_not_exist_ku()
    if ["aoba","tsuzuki"].include?(@ku) and ["9301","9401"].include?(@nengetsu)
      data                  = Hash.new
      data["shiku"]         = to_kanji(@ku)
      data["not_exist"]     = data["shiku"]
      data["kijunbi"]       = kijunbi(@nengetsu)
      data["source_url"]    = ""
      data["kakusai_betsu"] = Array.new(101){["","0","0","0"]}.each_with_index{|sai,i| sai[0]=i.to_s}
      return JSON.generate(data)
    else
      return nil
    end
  end

  def get_all_options()
    ku_str  = get_ku_option()
    shi_str = get_shi_option()
    cho_str = get_cho_option()
    JSON.generate( {"ku_option"=>ku_str,"shi_option"=>shi_str,"cho_option"=>cho_str} )
  end

  def get_ku_option()
    file = local_file(:ku_option)
    get_local(file)
  end

  def get_shi_option()
    file = local_file(:shi_option)
    get_local(file)
  end

  def get_cho_option()
    file = local_file(:cho_option)
    get_local(file)
  end

  def get_local(file)
    return nil if not File.exist?(file)
    begin
      f   = open(file,"r")
      str = f.read
      f.close
      return str
    rescue
      return nil
    end
  end

  def save_local(file,str)
    File.open(file,"w") do |f|
      f.print str
    end
  end

  def kakusai_betsu(html)
      ary=[]
      tr = html.gsub(/\n/u,"").scan(/<tr.*?tr>/u)
      tr.each do |r|
        ary << r.gsub(/<tr.*?><t(d|h).*?>|<\/t(d|h)><\/tr>/u,"").split(/<\/td?h?><td?h?.*?>/u)
      end
      ary.select{|r| r[0].match(/^\d{1,3}$|総数|100歳以上/u)}
  end

  def get_csv_of_cho(ku,nengetsu)
    def gen(nengetsu)
      yy = nengetsu[0,2].to_i
      case yy
      when 0..19  ; "h"+(yy+12).to_s
      when 20..59 ; "r"+(yy-18).to_s
      when 60..88 ; "s"+(yy-25).to_s 
      when 89..99 ; "h"+(yy-88).to_s
      end
    end
    file = local_file(:csv)
    csv = get_local(file)  #存在しないときの戻り値は"nil".
    #p file + " => " + csv[0,200] if csv
    csv = csv.kconv(Kconv::UTF8,Kconv::SJIS) if csv and NKF.guess(csv).to_s=="Shift_JIS"
    if csv and csv.match(/(,\d+){102}/)
      csv
    else
      cho_nen_top = '/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/'
      csv_url     = "#{gen(nengetsu)}cho-nen.files/#{ku+nengetsu}.csv"
      csv = get_https_body(cho_nen_top+csv_url)
      csv = csv.kconv(Kconv::UTF8,Kconv::SJIS) if csv and NKF.guess(csv).to_s=="Shift_JIS"
      save_local(file,csv)
      csv
    end
  end

  def get_csv_of_ayumi()
    file = local_file(:ayumi_csv)
    csv=get_local(file)
    csv
  end

  def get_https_body(url)
    host = 'https://www.city.yokohama.lg.jp'
    uri   = URI.parse( host+url )
    https = Net::HTTP.new(uri.host,uri.port)
    https.use_ssl     = true
    https.verify_mode = OpenSSL::SSL::VERIFY_NONE
    response = https.get(uri.request_uri)
    #p response
    response.body
  end

  #最新の年月とcsvファイルを取得する.戻り値は町名リストのhtml文字列
  def get_newest_cho_list(ku)
    cho_nen_top = '/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/'

    top_page_html = get_https_body(cho_nen_top)
    
    #最新年の町丁別年齢別csvファイルが掲載されているページのhtmlを取得する.
    pattern = %r!<a href=.(/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/..cho-nen\.html).>!
    href    = top_page_html.match(/#{pattern}/)[1]
    newest_nen_page = get_https_body(href)
    
    #目当ての区のcsvファイルのurlを取得する.
    pattern1 = %r!href="(\w\d+cho-nen.files/#{ku}\d{4}.csv)"!
    href1    = newest_nen_page.match(/#{pattern1}/)[1]
    csv = get_https_body(cho_nen_top+href1).kconv(Kconv::UTF8,Kconv::SJIS)
    #puts csv
    return ChoMeiList.new(csv).html
  end

  def make_json_from_csv(csv,kijunbi,cho)
    csv=csv.to_utf8 if RUBY_VERSION[0]=="2"
    ary=[]
    csv.each_line do |line|
      l = line.chomp.split(",")
      ary << l if cho.include?(l[0]) or l[0]=="町名"
    end
    title     = ary[0].map{|c| c.match(/歳/) ? c.sub!(/歳.*/,"") : c }

    if ary.size > 1
      male      = ary_sum(ary.select{|l| l[2]=="男"})
      female    = ary_sum(ary.select{|l| l[2]=="女"})
      total     = ary_sum([male,female])

      exist_cho = ary.map{|l| l[0]}.uniq-["町名"]
      not_exist = cho - exist_cho
      j_ary=[]
      title.zip(total,male,female){|ti,to,m,f| j_ary<<[ti,to,m,f]}
      j_ary.slice!(0,3)
    elsif ary.size==1
      exist_cho = cho
      not_exist = cho
      j_ary     = title.map{|i| [i,"0","0","0"]}
      j_ary.slice!(0, 3)
    end
    data                  = Hash.new
    data["shiku"]         = exist_cho.join(",")
    data["kijunbi"]       = kijunbi
    data["source_url"]    = data_source(:csv)
    data["kakusai_betsu"] = j_ary

    data["not_exist"]     = not_exist.size>0 ? not_exist.join(",") : ""
    JSON.generate(data)
  end

  def make_json_from_ayumi_csv(csv,kijunbi,nengetsu)
    def keta_kugiri(num)
      num.gsub(/(\d)(?=(\d{3})+(?!\d))/, '\1,')
    end
    csv=csv.to_utf8 if RUBY_VERSION[0]=="2"
    ary=[]
    csv.each_line do |line|
      l = line.chomp.split(",")
      ary << l if l[0]=="年" or l[0]==nengetsu
    end
    title     = ary[0].map{|c| c.match(/歳/) ? c.sub!(/歳.*/,"") : c }
    total     = ary[1].map{|nin| keta_kugiri(nin)}
    male      = ary[2].map{|nin| keta_kugiri(nin)}
    female    = ary[3].map{|nin| keta_kugiri(nin)}
    j_ary=[]
    title.zip(total,male,female){|ti,to,m,f| j_ary<<[ti,to,m,f]}
    j_ary.slice!(0,2)

    data                  = Hash.new
    data["shiku"]         = "横浜市"
    data["kijunbi"]       = kijunbi
    data["source_url"]    = "http://www.city.yokohama.lg.jp/ex/stat/jinko/ayumi/data/04.xls"
    data["kakusai_betsu"] = j_ary
    JSON.generate(data)
  end

    #複数の町丁を選択したときに合計の各歳別人口配列を作成する。
  def ary_sum(ary)
    #alert "Here!"
    def plus(ary1,ary2)
      ary1.zip(ary2).map{|n1,n2| n1.to_i+n2.to_i}
    end
    syokichi = ary[0].map{|i| i=0}
    sum = ary.inject(syokichi) do |sum,item_ary|
      if item_ary[-1]=="100歳以上"
        sum=sum
      else
        sum=plus(sum,item_ary)
      end
    end
    sum.map{|n| n.to_s}
  end

  #"1609","9703"などyymm形式を平成x年x月x日に変換する。
  def kijunbi(nengetsu)
    if nengetsu[2,2]=="01"
      day="1"
    else
      day="30"
    end
    nen = nengetsu[0,2].to_i
    if nen<19
      "平成#{nen+12}年#{nengetsu[3,1]}月#{day}日現在"
    elsif nen==19
      "令和元年#{nengetsu[3,1]}月#{day}日現在"      
    elsif nen<50
      "令和#{nen-18}年#{nengetsu[3,1]}月#{day}日現在"
    else
      "平成#{nen-88}年#{nengetsu[3,1]}月#{day}日現在"
    end
  end

  def ayumi_kijunbi(nengetsu)
    if nengetsu.match(/昭和5[1-9]年$|昭和6\d年$|平成\d年$/)
      str = nengetsu.sub("年",'年1月1日現在')
    elsif nengetsu.match("国勢調査")
      str = nengetsu.sub("年国勢調査","年10月1日現在（国勢調査）")
    else
      str = nengetsu.sub("年","年10月1日現在")
    end
    add_seireki(str)
  end

  def add_seireki(nengetsu)
    nengetsu.sub(/(昭和|大正|平成|令和)(\d+)年/){
      kisu  = case $1
            when "大正" ; 1911
            when "昭和" ; 1925
            when "平成" ; 1988
            when "令和" ; 2018            
            end
      year = $2.to_i+kisu
      "#{$1+$2}年 (#{year}年)"
    }
  end

  def isAyumi()
    if @ku=="age" and @nengetsu.match(/年/)
      true
    else
      false
    end
  end

  def data_source(syubetsu)
    web_location(syubetsu)
  end

  def to_han(str)
    str.tr('０-９','0-9')
  end

  def to_kanji(kumei)
    h = { "tsurumi"=>"鶴見区" ,  "kanagawa"=>"神奈川区"  , "nishi" =>"西区"  ,  "naka"    =>"中区"  , "minami"  =>"南区"   ,
          "konan"  =>"港南区" ,  "hodogaya"=>"保土ケ谷区", "asahi" =>"旭区"   , "isogo"   =>"磯子区" , "kanazawa"=>"金沢区" ,
          "kohoku" =>"港北区" ,  "midori"  =>"緑区"     , "aoba"  =>"青葉区" , "tsuzuki" =>"都筑区" , "totsuka" =>"戸塚区"  ,
          "sakae"  =>"栄区"   ,  "izumi"   =>"泉区"     , "seya"  =>"瀬谷区" , "age"     =>"横浜市"  }
    h[kumei]
  end

  def get_kijunbi(html)
    html.match(/<title>.*?(平成\d+年\d+月\d+日現在).*?<\/title>/u)[1]
  end
end

#***********************************
#       ここから実行プロセス
#***********************************

#単体で動作テストする場合は # を削除する.
#mode = :test

#if defined?(mode) and mode == :test
  #shiku    = "tsurumi"
  #nengetsu = "1901"
  #level = :all_options
  #level    = :cho_list
  #level    = :all_options
  #cho      = [] #["相生町","赤門町","曙町","万代町","弁天通","千鳥町","千歳町","千代崎町","富士見町","福富町仲通","福富町西通","福富町東通","不老町","羽衣町","英町","花咲町","初音町","本郷町"]
#else
  #postデータを受け取って引き数をcgiオブジェクトに格納する。
  #cgi      = CGI.new
  #shiku    = cgi.params['ShikuName'][0]
  #nengetsu = cgi.params['Year'][0]
  #level    = cgi.params['Level'][0].to_sym
#end

def main(param)
  shiku    = param["ShikuName"]
  nengetsu = param["Year"]
  level    = param["Level"].to_sym
  if level == :cho_json
    cho    = param["Cho"]
  else
    cho    = nil
  end
  case level
  when :shiku_json
    if nengetsu.match(/年$/)
      level = :ayumi_json
    elsif nengetsu.match(/ft|syorai/)
      case shiku
      when "age" ; level = :syorai_json
      else       ; level = :syorai_ku_json
      end
    end
    nengetsu = "20"+nengetsu[0,2]+"ft" if nengetsu.match(/syorai/) #お化け対策
  when :shiku_option
    case shiku
    when "age" ; level = :shi_option
    else       ; level = :ku_option
    end
  when :all_options
    shiku = "tsurumi" unless shiku
  end
    
  begin
    obj = GetDATA.new(shiku,nengetsu,level,cho)
    case level
    when :shiku_json,:cho_json,:ayumi_json,:syorai_json,:syorai_ku_json,:all_options
      if obj.json_error
        ["text/plain;charset=utf-8", obj.csv]
      else
        ["text/json;charset=utf-8", obj.json]
      end
    when :cho_csv,:cho_csv_for_save
      ["text/plain;charset=utf-8", obj.csv]
    when :ku_option,:shi_option,:cho_option,:cho_list
      ["text/html;charset=utf-8", obj.html_str]
    end
  rescue => e
      alert(e.message + "<br>\n" + e.backtrace.join("<br>\n"))
  end
end