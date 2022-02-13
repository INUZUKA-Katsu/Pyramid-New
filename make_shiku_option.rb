
def get_ggemd(yyyymm)
  yyyy = yyyymm[0,4].to_i
  m    = yyyymm[4,2].to_i
  str = case yyyy
        when 2020..2999 ; "令和"+(yyyy-2018).to_s
        when 2019       ; "令和1"  if m>=5
                          "平成31" if m<5
        when 1990..2018 ; "平成"+(yyyy-1988).to_s
        end + "年"+m.to_s+"月1日現在"
  str = str+'(国勢調査)' if m==10
  str
end

def make_shiku_option(shiku)
  yyyy_ary = []
  option_ary = []
  #  Dir.glob("/Users/inuzuka0601/Sites/Stat/nenreibetsu/age*-j.txt").
  #puts S3.get_list("Pyramid/nenreibetsu/").select{|f| f.match(/#{shiku}\d{4}/) and f[-6,6]=="-j.txt"}
  S3.get_list(Local_json_shiku).select{|f| f.match(/#{shiku}\d{4}/) and f[-6,6]=="-j.txt"}.
      map{|f| f.match(/#{shiku}(\d+)/)[1]}.
      map{|yymm| yymm[0]=='9' ? '19'+yymm : '20'+yymm}.
      each do |yyyymm|
        yyyy_ary << yyyymm[0,4]
        option_ary << ' '*18+'<option value="'+yyyymm+'">'+get_ggemd(yyyymm)+'</option>'
      end
  option_ary = option_ary.sort.reverse
  option_ary[0]=' '*18+'<option value="new" selected>　　 最新</option>'
  str = option_ary.join("\n")
  syorai = S3.read(Local_syorai_option).split("\n").
           select{|line| not yyyy_ary.include? line.match(/\d{4}/)[0] }.
           map{|line| ' '*18+line}.
           join("\n")
  if shiku=="age"
    ayumi = S3.read(Local_ayumi_option)
    [syorai,str,ayumi].join("\n")
  else
    [syorai,str].join("\n")
  end
end

