# -*- coding: utf-8 -*-

# 町名リストを管理するクラス
class ChoMeiList
  attr_reader :cho_mei, :html
  
  def initialize(csv_data)
    @cho_mei = extract_cho_mei(csv_data)
    @html = generate_html
  end
  
  private
  
  # CSVデータから町名を抽出
  def extract_cho_mei(csv_data)
    csv = []
    csv_data.each_line { |line| csv << line.split(",")[0] }
    
    csv.uniq.select do |ch|
      ch.size < 30 && 
      !ch.match("町名") && 
      !ch.match("合計")
    end
  end
  
  # HTMLを生成
  def generate_html
    col_num = 8 # 町丁名リストの列数
    
    if @cho_mei.size % col_num == 0
      num = @cho_mei.size / col_num
    else
      num = @cho_mei.size / col_num.to_i + 1
    end
    
    html_parts = []
    
    @cho_mei.each_with_index do |ch, i|
      html_parts << "<div class=\"cho\">\n" if i == 0
      html_parts << "</div><div class=\"cho\">\n" if i > 0 && i % num == 0
      html_parts << create_checkbox_html(ch, i)
    end
    
    html_parts << "</div>"
    html_parts.join
  end
  
  # チェックボックスのHTMLを作成
  def create_checkbox_html(cho_name, index)
    %Q{  <li><input name="cho_list" value="#{cho_name}" type="checkbox" id="cho#{index}"><label for="cho#{index}">#{cho_name}</label></li>\n}
  end
end

