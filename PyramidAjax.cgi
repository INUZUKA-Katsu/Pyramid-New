#!/usr/bin/ruby -Ku
# -*- coding: utf-8 -*-

#// 横浜市の人口ピラミッド ver2.10 2017.1.14  INUZUKA Katsu
require "time"
require "cgi"
require "kconv"
require "fileutils"
require "net/https"
require 'open-uri'
require 'openssl'

$KCODE = "utf-8"
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE
#Encoding.default_external = "utf-8" if RUBY_VERSION[0]=="2"

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
#Location0          = "http://archive.city.yokohama.lg.jp/ex/stat/jinko/age/new/age-j.html"
Location0 = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/nenrei/juki/"
Location1 = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/nenrei/suikei.html"
Location2 = "http://archive.city.yokohama.lg.jp/ex/stat/jinko/choage/<nengetsu>/csv/<ku><nengetsu>.csv"
#Location3          = "http://archive.city.yokohama.lg.jp/ex/stat/jinko/choage/mokuji/tsurumi.html"
Location3          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/"
#町丁別年齢別人口のインデックスのページ
Location4          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/index.html"
#町丁別年齢別人口のcsvファイルのurl
Location5          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/<gen>cho-nen.files/<ku><nengetsu>.csv" #<gen>:h31,r02,r03・・・
Location6          = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/opendata/suikei03.files/e3yokohama<nengetsu>.zip"

def alert(s)
    print "Content-Type: text/html\n\n"
    #print s.gsub(/Shift_JIS|shift_jis/u,"UTF-8")
    print '<html>'
    print '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>'
    print s
    print "</html>"
    exit
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

module JSON
#配列限定、年齢別人口統計限定の簡易処理
  def self.generate(arg)
    if arg.class==Array
      j="[" + arg.map{|item| self.quote(item)}.join(",") + "]"
    elsif arg.class==Hash
      j="{" + arg.keys.map{|k| self.quote(k)+":"+self.quote(arg[k])}.join(",") + "}"
    end
    j
  end
  def self.load(json)
    eval(json.gsub(/":"/,'"=>"'))
  end
  def self.quote(item)
    case
    when item.class==String
      "\"#{item.gsub(/\//,'\/').gsub(/"/,'\"').gsub(/\n/,'\\n')}\""
    when item.class==Fixnum
      "#{item}"
    when item.class==Array, item.class==Hash
      "#{generate(item)}"
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
  attr_reader :json, :html_str, :csv, :shiku, :nenreibetsu

  def initialize(ku,nengetsu,level,cho=nil)
    @ku            = ku
    @nengetsu      = nengetsu
    if nengetsu=="new" and level==:shiku_json
      @nengetsu    = "2001"   #暫定的処置
    else
      @nengetsu    = nengetsu
    end
    @cho           = cho
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
      @csv         = get_csv_of_cho()
    when :cho_json
      @csv         = get_csv_of_cho()
      @kijunbi     = kijunbi(nengetsu)
      begin
        @json      = make_json_from_csv(@csv,@kijunbi,@cho)
      rescue
      #文字コードエラーでJSONへの変換ができなかったときはCSVを返す.
        @json      = @csv
      end
    when :ayumi_json
      @csv         = get_csv_of_ayumi()
      @kijunbi     = ayumi_kijunbi(nengetsu)
      @json        = make_json_from_ayumi_csv(@csv,@kijunbi,@nengetsu)
    when :cho_list
      @html_str    = get_newest_cho_list()
    when :shi_option
      @html_str    = get_shi_option()
    when :ku_option
      @html_str    = get_ku_option()
    when :cho_option
      @html_str    = get_cho_option()
    when :all_options
      @json        = get_and_save_all_options()
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
    ku_not_exist = json_of_not_exist_ku()
    return ku_not_exist if ku_not_exist

    json_file  = local_file(:json)
    json       = get_local(json_file)

    location   = web_location(:html)
    location2  = web_location(:shiku_zip) #オープンデータのzipファイル

    @time = ""
    if @nengetsu<="1901" or @nengetsu>"7501"
      @time = last_modified(location)
    else
      @time = last_modified(location2)
    end
    #alert time.class.to_s
    #alert (Time.parse(last_modified_of_json(json)).strftime("%Y-%m-%d, %H:%M") == time.strftime("%Y-%m-%d, %H:%M")).to_s
    #alert (Time.parse(last_modified_of_json(json)) == time).to_s
    #alert (last_modified_of_json(json).class and Time.parse(last_modified_of_json(json)) == time).to_s
    #alert (json != nil and last_modified_of_json(json)==@time).to_s
    if json != nil and last_modified_of_json(json) == @time
      #alert("Here 1")
      return json
    elsif @nengetsu<="1901" or @nengetsu>"7501"
      #alert("Here 2")
      html     = get_network_file(location, limit = 10)
      html2    = to_han(html).sub("100歳以上","100").gsub(/総(¥s|　)*数/,"総数").gsub(/<\/?strong>/,"").gsub(/<\/?b>/,"")
      data     = Hash.new
      data["last_modified"] = @time.to_s
      data["shiku"]         = to_kanji(@ku)
      data["kijunbi"]       = get_kijunbi(html2)
      data["source_url"]    = data_source(:html)
      data["kakusai_betsu"] = kakusai_betsu(html2)
      json                  = JSON.generate(data)
      begin
        save_local(json_file,json)
      ensure
        return json
      end
    else
      #alert("Here 3")
      csv_file = local_file(:shiku_csv)
      csv      = get_local(csv_file)
      ary      = csv.split("\n").map!{|l| l.strip.split(",")}
      ary.shift
      shiku   = ary[1][2]
      d       = ary[1][0].split("-")
      kijunbi = "令和#{(d[0].to_i-2018)}年#{d[1].to_i}月#{d[2].to_i}日現在"
      kakusai = ary.map{|i| [i[3],i[4],i[5],i[6]]}

      location = web_location(:shiku_zip) 
      @time     = last_modified(location).getlocal
      source   = location + "(" + local_file(:shiku_csv).sub(/.*\//,"") + ")"

      data = Hash.new
      data["last_modified"] = @time.to_s
      data["shiku"]         = shiku
      data["kijunbi"]       = kijunbi
      data["source_url"]    = source
      data["kakusai_betsu"] = kakusai
      json                  = JSON.generate(data)
      begin
        save_local(json_file,json)
      ensure
        return json
      end
    end
  end

  def modify_src(json)
    new_src = 'https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.files/0014_20180907.xls'
    json.sub(/http.*?xls/,new_src)
  end

  def get_syorai_data()
    json_file  = local_file(:json_syorai)
    json       = get_local(json_file)
    json       = modify_src(json)
    return json
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

  #年月日コンボボックスのoption(選択肢)を作成しサーバに保存する.
  def get_and_save_all_options()
    def ku_option()
      html  = get_network_file(Location0)
      ary   = html.scan(/<a href="\/city-info\/yokohamashi\/tokei-chosa\/portal\/jinko\/nenrei\/juki\/\w\d\d?nen\.html">.*?年\(\d\d(\d\d)\).*?<\/a>/).flatten.map{|yy| yy+"01"}
      ary.map!{|nengetsu| "#{" "*18}<option value=\"#{nengetsu}\">#{kijunbi(nengetsu)}</option>"}
      ary.shift  #2019.3.14 付け焼き刃の応急措置
      ary.unshift("#{" "*18}<option value=\"new\" selected>　　 最新</option>").join("\n")
    end
    def syorai_option(ku_str)
      newest_year = (ku_str.scan(/\d{2}01/).select{|y| y.match(/[^9]\d01/)}.max[0,2].to_i+2001)
      data        = get_local(local_file(:syorai_option)).to_utf8
      data.split("\n").map{|l| " "*18+l}.select{|l| y=l.match(/\d{4}/) and y[0].to_i>newest_year}.join("\n")
    end
    def ayumi_option()
      file  = local_file(:ayumi_option)
      get_local(file).to_utf8
    end
    def cho_option_new()
      if 1==1 #緊急避難 
        get_cho_option()
      else
        html  = get_network_file(Location4)
        ary   = html.scan(/\w\d\dcho-nen\.html.*?>.*?町丁別年齢別人口/).map{|l| l.match(/\d{4}/)[0][2,2]+"09"}
        ary.shift unless url_exist?(web_location(:csv,ary[0]))
        ary.map!{|nengetsu| "<option value=\"#{nengetsu}\">#{kijunbi(nengetsu)}</option>"}
        "#{" "*18}"+ary.join("\n#{" "*18}")
      end
    end
    def cho_option()
      html  = get_network_file(Location3)
      ary   = html.scan(/<a href="\/city-info\/yokohamashi\/tokei-chosa\/portal\/jinko\/chocho\/nenrei\/\w\d\d?cho-nen\.html">.*?年[\s|　]?\(\d\d(\d\d)\).*?<\/a>
/).flatten
      ary.map!{|yy| yy+"09"}
      ary.map!{|nengetsu| "<option value=\"#{nengetsu}\">#{kijunbi(nengetsu)}</option>"}
      newest = html.match(/<a href="\/city-info\/yokohamashi\/tokei-chosa\/portal\/jinko\/chocho\/nenrei\/(\w\d\d?cho-nen\.html)">.*?<\/a>/)[1]
      html2  = get_network_file(Location3+newest)
      unless html2.match(/<a.*?href="\w\d\d?cho-nen\.files\/tsurumi\d\d09\.csv">/)
        ary.shift
      end
      "#{" "*18}"+ary.join("\n#{" "*18}")
    end

    base    = ku_option()                        #以下3行 2018.4.7
    ku_str  = syorai_option(base) + "\n" + base
    shi_str = ku_str + "\n" + ayumi_option()
    cho_str = cho_option()
    save_local( local_file(:ku_option), ku_str  )
    save_local( local_file(:shi_option),shi_str )
    save_local( local_file(:cho_option),cho_str )
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

  def get_csv_of_cho()
    file = local_file(:csv)
    csv = get_local(file) #存在しないときの戻り値は"nil".
    if csv and csv.match(/(,\d+){102}/) and 1==0
      csv
    else
      location = web_location(:csv)
      csv = get_network_file(location, limit = 10)
      save_local(file,csv)
      csv
    end
  end

  def get_csv_of_ayumi()
    file = local_file(:ayumi_csv)
    csv=get_local(file)
    csv
  end

  #最新の年月とcsvファイルを取得する.戻り値は町名リストのhtml文字列
  def get_newest_cho_list()
    day = Time.now
    y   = day.year-2000
    m   = day.month
    ary=["#{y}09", "#{y}03", "#{y-1}09", "#{y-1}03"]

    response = nil
    ary.each do |nengetsu|
      uri=URI.parse(web_location(:csv,nengetsu))
      https = Net::HTTP.new(uri.host,uri.port)
      https.use_ssl = true
      https.verify_mode = OpenSSL::SSL::VERIFY_NONE
      begin
        https.start{
          response = https.get(uri.request_uri)
          csv = response.body.kconv(Kconv::UTF8,Kconv::SJIS)
          if csv.match(/100歳以上/m)
            return ChoMeiList.new(csv).html
            break
          end
        }
      rescue
      end
    end
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

  def last_modified_of_json(json)
    if json.match(/last_modified/)
      Time.parse(json.match(/last_modified":"(.*?)"/)[1])
    else
      Time.parse(json.match(/\["(.*?)"/)[1])
    end
    #begin
    #  data = JSON.load(json)
    #  if data.class==Hash
    #    if data.keys[0].class==Symbol
    #      data[:last_modified]
    #    else
    #      data["last_modified"]
    #    end
    #  else
    #    data[0]
    #  end
    #rescue => e
    #  alert e.message
    #end
  end

  def last_modified(location)
    #戻り値はTimeクラス
    #uri=URI.parse(location)
    #response = nil
    #Net::HTTP.start(uri.host, 80) {|http|
    #  response = http.head(uri.request_uri)
    #}
    #response['last-modified']
    #alert(uri.to_s)
    #uri.open().last_modified
    open(location).last_modified
  end

  def get_network_file(location, limit = 10)
  # *****  httpsに対応 *****
    raise ArgumentError, 'too many HTTP redirects' if limit == 0
    if location[0,6]=="https:"
      https = true
    end
    uri = URI.parse(location)
    begin
      http = Net::HTTP.new(uri.host,uri.port)
      if location[0,6]=="https:"
        http.use_ssl = true
        http.verify_mode = OpenSSL::SSL::VERIFY_NONE
      end
      http.start do
        response = http.get(uri.request_uri)
        case response
        when Net::HTTPSuccess
          if https ==true  and location[-3,3] != "csv"  #リニューアルサイトの文字コードはCSVファイルを除きUTF8になった.
            return response.body.force_encoding("utf-8")
          else
            return response.body.kconv(Kconv::UTF8,Kconv::SJIS)
          end
          #return Uconv.sjistou8(response.body)
        when Net::HTTPRedirection
          location = response['location']
          warn "redirected to #{location}"
          get_network_file(location, limit - 1)
        else
          puts [uri.to_s, response.value].join(" : ")
          nil
        end
      end
    rescue => e
      puts [uri.to_s, e.class, e].join(" : ")
      nil
    end
  end

  def url_exist?(url, limit = 10)
    if limit == 0
      return false
    end
    begin
      response = Net::HTTP.get_response(URI.parse(url))
    rescue
      return false
    else
      case response
      when Net::HTTPSuccess
        return true
      when Net::HTTPRedirection
        url_request(response['location'], limit - 1)
      else
        return false
      end
    end
  end

  def to_han(str)
      h ={ "０"=>"0", "１"=>"1", "２"=>"2", "３"=>"3", "４"=>"4", "５"=>"5", "６"=>"6", "７"=>"7", "８"=>"8", "９"=>"9" }
      str.gsub(/[０-９]/){h[$&]}
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
mode = :test

if defined?(mode) and mode == :test
  shiku    = "tsurumi"
  nengetsu = "1801"
  #level = :all_options
  #level    = :cho_list
  #level    = :all_options
  level = :cho_csv
  cho      = ["馬場一丁目","馬場二丁目"]
else
  #postデータを受け取って引き数をcgiオブジェクトに格納する。
  cgi      = CGI.new
  shiku    = cgi.params['ShikuName'][0]
  nengetsu = cgi.params['Year'][0]
  level    = cgi.params['Level'][0].to_sym
  if level == :cho_json
    cho = eval(cgi.params['Cho'][0])
  else
    cho= nil
  end
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
  else       ; leval = :ku_option
  end
when :all_options
  shiku = "tsurumi" unless shiku
end

begin
  obj = GetDATA.new(shiku,nengetsu,level,cho)
  print "Content-Type: text/html\n\n"
  print case level
        when :shiku_json,:cho_json,:ayumi_json,:syorai_json,:syorai_ku_json,:all_options
          obj.json
        when :cho_csv,:cho_csv_for_save
          obj.csv
        when :ku_option,:shi_option,:cho_option,:cho_list
          obj.html_str
        end
rescue => e
  alert e.message + "<br>\n" + e.backtrace.join("<br>\n")
end
