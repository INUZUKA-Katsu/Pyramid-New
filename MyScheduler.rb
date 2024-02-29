#8時から22時までの間、10分おきに横浜市の人口ミラミッドサイトをリクエストしてスリープに入るのを防止する。
#22時から8時まではユーザーのリクエストがあるまでスリープして課金時間を節約する。
require 'net/http'
require 'uri'

jst = Time.at(Time.now, in: "+09:00").hour
if (8..22)===jst
  #`curl http://toshin-kensaku.herokuapp.com/`
  p Net::HTTP.get(URI.parse('http://pyramid-yokohama.herokuapp.com/'))
end
