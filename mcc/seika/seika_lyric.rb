
require 'json'
require 'open-uri'
require 'zlib'
require 'stringio'
require 'fileutils'

Encoding.default_external = "utf-8"

SEIKA_TITLE_HASH =JSON.parse(File.read(__dir__+'/聖歌タイトル検索リスト.json'))
SEIKA_NUM_HASH   =JSON.parse(File.read(__dir__+'/聖歌番号検索リスト(聖歌総合版編).json'))
SEIKA_NUM_HASH2  =JSON.parse(File.read(__dir__+'/聖歌番号検索リスト(聖歌編).json'))
SEIKA_NUM_HASH3  =JSON.parse(File.read(__dir__+'/聖歌番号検索リスト(新聖歌編).json'))
TITLE_LIST       =SEIKA_TITLE_HASH.keys
NUM_LIST         =SEIKA_NUM_HASH.keys
NUM_LIST2        =SEIKA_NUM_HASH2.keys
NUM_LIST3        =SEIKA_NUM_HASH3.keys
HYOKIYURE_FILE   =__dir__+'/表記揺れ語句リスト.txt'
HYOKIYURE_TMP    =Dir.pwd+'/tmp/mcc/表記揺れ語句リスト.txt'
FileUtils.cp(HYOKIYURE_FILE,HYOKIYURE_TMP)

#***** NumSearch　聖歌番号による検索 *****
#戻り値は [[title1、cgi_key1],[title2、cgi_key2]・・・]
def search_title_and_cgi_key(key_num,priority)
  key_num.tr!('０-９','0-9')
  res=[]
  num_list=[NUM_LIST,NUM_LIST2,NUM_LIST3]
  num_hash=[SEIKA_NUM_HASH,SEIKA_NUM_HASH2,SEIKA_NUM_HASH3] 
  
  priority=="priority" ? n=0 : n=2
  (0..n).each do |i|
    num=num_list[i].find{|j| j==key_num }
    res << num_hash[i][num] if num
  end
  res
end

#***** TitleSearch　聖歌のタイトルによる検索 *****
def search_title(key_word)
  reg=get_expand_reg(key_word)
  TITLE_LIST.select{|t| t.match(/#{reg}/)}
end

def search_title_by_cgi_key(cgi_key)
  SEIKA_TITLE_HASH.each_pair do |title,cgi_key_ary|
    if cgi_key_ary.find{|item| item==cgi_key}
      return title
    end
  end
end

#*****　LyricSearch　歌詞に含まれる語句による検索 ******
def search_lyric(key_word)
  def file_include(str,reg)
    ans=str.match(/#{reg}/)
    if ans
      ans[0].gsub(/^./,'　\0')
    else
      nil
    end
  end
  def separate_title_and_lyric_from_lyric_text(str)
    ans=str.match(/(^.*『.*』.*$)\n(^\s*$\n){,2}((^.*$\n?)+)/)
    title,lyric = ans[1],ans[3]
    [title,lyric]
  end
  reg = "(^.+\n){,1}^.*" + get_expand_reg(key_word) + ".*$\n?(^.+$\n?){,1}"
  #puts "reg => " + reg.gsub(/\n/,"¥n")
  res = {}
  files = Dir.glob("#{__dir__}/lyric_files/*.txt")
  #Herokuのリソースエラーにならないようにスレッド数を200に制限.
  n = (files.size/200.0).ceil
  n.times do |i|
    thread = []
    st = i*200
    files[st,200].each do |file_path|
      #p file_path
      thread << Thread.new do
        begin
          str = File.read(file_path)
        rescue
          p file_name + "の読み込みエラー"
          str = " "
        end
        title,lyric = separate_title_and_lyric_from_lyric_text(str)
        matched_range = file_include(lyric,reg)
        if matched_range
          cgi_key = File.basename(file_path).sub(".txt",":1")
          res[title]=[matched_range,cgi_key]
        end
      end
    end
    thread.each(&:join)
  end
  res
end
#p search_lyric("ちしおしたたる")

# ********* メインプログラム ******************
# ********* (config.ruからここに来る。)********
def get_lyric_by_ajax(param)
  request=param.values[0]
  mode=param.keys[0]
  priority=param['priority'] #聖歌(総合版)を優先するか.優先がデフォルト.

  if mode=='cgi_key'
    cgi_key=request
    return {'lyric'=>get_lyric_from_local(cgi_key)}
  
  elsif mode=='NumSearch'
    def add_book_name(num,title,cgi_key)
      return "聖歌(総合版)#{num}番 #{title}" if cgi_key.include? 'SOUGOU'
      return "新聖歌#{num}番 #{title}" if cgi_key.include? 'SHIN'
      "聖歌#{num}番 #{title}"
    end
    num=request
    found_num_ary=search_title_and_cgi_key(num,priority)
    if found_num_ary.size==1
      cgi_key = found_num_ary[0][1]
      return {'lyric'=>get_lyric_from_local(cgi_key)}
    elsif found_num_ary.size>1
      sections=[]
      key_index={}
      found_num_ary.each{|ary|
         title, cgi_key = ary
         front_part_of_lyric = get_front_part_of_lyric(cgi_key,'indent')
         sections << front_part_of_lyric.sub(/『.*』/, '\0　'+select_button(cgi_key)).gsub(/\n{2,}/,"\n")
      }
      sorted_sections = sort_by_book_name(sections).
                           map.with_index(1){|section,i| i.to_s + " " + section}
      str=sorted_sections.join("\n")
      return {'title_list'=>[str,found_num_ary.size]}
    else
      if priority=='priority'
        return {'err_message'=>"聖歌(総合版)に該当の番号の聖歌はありません。"}
      else
        return {'err_message'=>"該当の番号の聖歌はありません。"}
      end
    end
  
  elsif mode=='TitleSearch'
    found_title_ary=search_title(request)
    if found_title_ary.size==1
      title    = found_title_ary[0]
      cgi_keys = title_to_cgi_keys(title,priority)
      if cgi_keys.size==1
        return {'lyric'=>get_lyric_from_local(cgi_keys[0])}
      end
    end
    if found_title_ary.size > 0
      lyric_num=0
      chapter=[]
      found_title_ary.each_with_index{|title,i| 
        cgi_keys = title_to_cgi_keys(title,'non_priority')
        sections=[]
        cgi_keys.each do |cgi_key|
          front_part_of_lyric = get_front_part_of_lyric(cgi_key,'indent')
          sections << front_part_of_lyric.sub(/^.*((総合聖歌|聖歌|新聖歌).+)『.+$\n/, '\1　'+select_button(cgi_key))
          lyric_num+=1
        end
        sorted_sections = sort_by_book_name(sections).
                         map.with_index(1){|s,i| s.sub(/総合聖歌|聖歌|新聖歌/, '&nbsp('+i.to_s+')　\0')}.
                         map{|s| "<p class='section'>"+s+"</p>"}
        chapter << "<p class='chapter'>"+(i+1).to_s+" "+title +"</p>"+ sorted_sections.join() 
      }
      title_num = found_title_ary.size      
      return {'title_and_part_of_liric_list'=>[ chapter.join().gsub(/\n{2,}/,"\n"),title_num,lyric_num]}
    else
      return {'err_message'=>"該当するタイトルはありません。"}
    end
  
  elsif mode=='LyricSearch'
    found_hash = search_lyric(request)
    if found_hash.size==1
      cgi_key = found_hash.values[0][1]
      return {'lyric'=>get_lyric_from_local(cgi_key)}
    elsif found_hash.size>1
      sections=[]
      sorted_title_array = sort_by_book_name(found_hash.keys)
      sorted_title_array.each_with_index{|title,i| 
         matched_range = found_hash[title][0]
         cgi_key       = found_hash[title][1]
         sections << (i+1).to_s + " " + title + select_button(cgi_key) + "\n" + matched_range
      }
      str= sections.map{|str| "<p class='section'>"+str+"</p>"}.join()
      return {'matched_range_list'=>[str,found_hash.size]}
    else
      return {'err_message'=>"該当するタイトルはありません。"}
    end
  end
end

#******* メソッド ********
def title_to_cgi_keys(title,priority)
  cgi_keys=SEIKA_TITLE_HASH[title]
  cgi_key=cgi_keys.find{|k| k.match(/SOUGOU/)}
  if priority == "priority" and cgi_key
    return [cgi_key]
  else
    return cgi_keys
  end
end
def get_expand_reg(search_key_word)
  reg_str=search_key_word
  hyokiyure_array = File.read(HYOKIYURE_TMP).sub(/\n[\n\s　]*$/m,"").split("\n")
  p hyokiyure_array
  hyokiyure_array.each do |item|
    reg_str.gsub!(/#{item}/,"(#{item})")
  end
  p "reg_str => " + reg_str
  reg_str
end
def get_lyric_from_local(cgi_key)
  path = "#{__dir__}/lyric_files/#{cgi_key.sub(/:\d+/,"")}.txt"
  File.read(path)  
end
def get_front_part_of_lyric(cgi_key,indent)
  lyric      = get_lyric_from_local(cgi_key)
  front_part = lyric.match(/(^.*$\n?){,6}/)[0]
  p :front_part
  puts front_part
  puts
  if indent=='indent'
    front_part.gsub!(/^./, '　\0')
  end
  front_part
end
def sort_by_book_name(lyric_array)
  lyric_array.sort_by do |str|
    title = str.match(/聖歌総合版|聖歌\(総合版\)|聖歌|新聖歌/)[0]
    num1 = ["聖歌総合版","聖歌(総合版)","聖歌","新聖歌"].index(title).to_s
    num2 = ("000"+str.match(/\d+/)[0])[-4,4]
    num1+num2
  end
end
def select_button(cgi_key)
  "　<input type='button' name='#{cgi_key}' value='選択' onClick='disp_lyric(this)'>" 
end


#***********************************************************************************
__END__
以下は、現在の経常動作には不要なので凍結する。
#***********************************************************************************


#**********  lifebread.infoサイトから全データを一括取得してローカルに保存する  ***********
def save_all_lyric
  cgi_keys=SEIKA_TITLE_HASH.values.flatten.sort.each do |cgi_key|
    title=search_title_by_cgi_key(cgi_key)
    lyric=get_lyric_from_web(cgi_key,title)
    file_name=cgi_key.sub(/:\d+/,"")+".txt"
    File.write("#{__dir__}/lyric_files/#{file_name}" , lyric)
    puts file_name
  end
end
#save_all_lyric

#**********  lifebread.infoサイトにアクセスして処理するためのメソッド（今は不使用） ************
def get_lyric_from_web(cgi_key,title)
  url=get_url(cgi_key)
  str=get_html(url)
  lyric=get_lyric_from_html(str).sub(/.*『#{title}』.*/){|w| w+"\n"}
  url_ary=get_url_after_no2(str)
  if url_ary.size>0
    lyric_after_no2_ary=get_lyric_array(url_ary,title)
    lyric=lyric+lyric_after_no2_ary.join
  end
  return lyric
end

def get_url(cgi_key)
  "http://lifebread.info/cgi-bin/hymn22.cgi?BOOKNO=" + cgi_key + "&TS=7&BS=7&FS=5"
end

def get_html(url)
  #p url
  uri=URI.parse(url)
  response = uri.open("Accept-Encoding" => "gzip").read
  if response.start_with?("\x1F\x8B".b) # Gzipのマジックナンバー
    response = Zlib::GzipReader.new(StringIO.new(response)).read.encode("utf-8","sjis")
  end
  response
end

def get_lyric_from_html(html_str)
  # Gzipで圧縮されている場合は解凍
  lyric=html_str.gsub(/<p>|<br>/i,"\n").
           gsub(/<a.*?>.*?<\/a>|<title>.*?<\/title>|<.*?>|<!--.*?-->|\[\d\]/m,"").
           gsub(/\n(\s|　)+/,"\n").
           gsub(/\n\n+/m,"\n")
  lyric
end

def get_url_after_no2(html_str)
  #2番以降の歌詞ページのurlの配列を返す。歌詞が１番しかないときはカラの配列を返す。
  html_str.scan(/<a .*?href="(.*?)".*?>\[\d\]<\/a>/).flatten
end

def get_lyric_array(url_ary,title)
  lyric_ary=[]
  url_ary.each do |url|
    lyric=get_lyric_from_html(get_html(url))    
    lyric_ary << lyric.sub(/.*『#{title}』.*/,"")
  end
  lyric_ary
end


#**********   ターミナル実行用（lifebread.infoサイトにアクセスして処理）  ************
def display_lyric_on_terminal
  res=get_title_on_terminal
  if res.class==Array
    title,cgi_key = res
  else
    title=res
    cgi_key=get_cgi_key_on_terminal(title)
  end
  url=get_url(cgi_key)
  str=get_html(url)
  lyric_no1=get_lyric_from_html(str).sub(/.*『#{title}』.*/){|w| w+"\n"}
  lyric=lyric_no1
  
  url_ary=get_url_after_no2(str)
  if url_ary.size>0
    lyric_after_no2_ary=get_lyric_array(url_ary,title)
    lyric=lyric+lyric_after_no2_ary.join
  end
  puts lyric
end
#display_lyric_on_terminal

def get_title_on_terminal
  #番号で検索したときの戻り値は、[該当タイトル,cgi検索キー]の配列
  #タイトル又はその一部で検索したときの戻り値は、該当タイトル
  print "聖歌の番号、タイトル又はタイトルの一部を入力してください。> "
  key_word=gets.chomp
  if num_search?(key_word)
    res=search_title_and_cgi_key(key_word)
    if res.size>0
      return res
    else
      puts "聖歌（総合版）に該当の番号の聖歌はありません。"
      return nil
    end
  else
    found_title_ary=search_title(key_word)
    if found_title_ary.size==0
      puts "該当するタイトルはありません。"
      return nil
    elsif found_title_ary.size==1
      title = found_title_ary[0]
    else
      puts "次の中から目的のタイトルを選び、その番号を入力してください。"
      puts
      found_title_ary.each_with_index{|title,i| 
        puts (i+1).to_s+" "+title
      }
      puts
      print "番号を入力 > "
      num=gets.tr('０-９','0-9').to_i
      if num<1 or num>found_title_ary.size
        puts "リスト外の番号が入力されました。"
        return nil
      else
        title = found_title_ary[num-1]
      end
    end
    return title
  end
end

def get_cgi_key_on_terminal(title)
  if title
    cgi_keys=SEIKA_TITLE_HASH[title]
    cgi_key=cgi_keys.find{|k| k.match(/SOUGOU/)}
    if cgi_key
      res=cgi_key
    elsif cgi_keys.size==1
      if cgi_keys[0][0,4]=="SEIKA"
        puts "聖歌に該当タイトルがありました。"
      else
        puts "新聖歌に該当タイトルがありました。"
      end
      res=cgi_keys[0]
    else
      puts
      puts "聖歌と新聖歌に該当タイトルがあります。"
      print "どちらを表示しますか？聖歌=>1,新聖歌=>2を入力してください。> "
      puts
      num=gets.tr('０-９','0-9').to_i-1
      res=cgi_keys[num]
    end
  end
  res
end

def num_search?(key_word)
  key_word.match(/^[0-9０-９]+$/)
end

