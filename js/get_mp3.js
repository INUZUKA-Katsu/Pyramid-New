window.onload = function(){
  var elms = document.getElementsByTagName('audio');
  var elmsArray = Array.from(elms);
  var targetElmsArray = elmsArray.filter((elm)=>{
    return elm.readyState==0
  });
  if(targetElmsArray.length>0){
    
    const sendData = getSendData(targetElmsArray);
    ajax("missingMp3="+sendData); 
  
  }else{
    //alert("All mp3 are ready.");
  }
}
function ajax(sendData){
  var xmlHttp = new XMLHttpRequest();
  if(null == xmlHttp ) { // 初期化失敗時
    return ;
  }
  //応答時の処理定義
  xmlHttp.onreadystatechange = function(){
     if(xmlHttp.readyState == 4 && xmlHttp.status == 200){
       //alert("done");
       //キャッシュを使ってページをリロードする.
       window.location.reload(false);
     }
  }
  xmlHttp.open("POST" , "/get_mp3.cgi" , true);
  xmlHttp.setRequestHeader("content-type",
      "application/x-www-form-urlencoded");
  xmlHttp.send(sendData);
}

function getSendData(elmsArray){
  var urls=[];
  elmsArray.forEach(function(elm){
      var mp3_uri  = decodeURI(elm.getAttribute('src'));
      urls.push(mp3_uri);
  });
  return encodeURI(JSON.stringify(urls));
}
