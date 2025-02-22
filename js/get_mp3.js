var elms;
var btns;
var audio;

window.onload = function(){
  elms = document.getElementsByTagName('audio');
  audio = new Audio();
  btns=document.getElementsByTagName("button");
  console.log(elms);
  var elmsArray = Array.from(elms);
  set_addEventListener(elmsArray);
  var targetElmsArray = elmsArray.filter((elm)=>{
    return elm.readyState==0
  });
  if(targetElmsArray.length>0){
    
    const sendData = getSendData(targetElmsArray);
    console.log(sendData);
    ajax("missingMp3="+sendData,targetElmsArray); 
  
  }else{
    //alert("All mp3 are ready.");
  }
  let textAreas = document.getElementsByTagName("textarea");
  if(textAreas.length>0){
    if(window.innerWidth>650){
      textAreas[0].cols=80;
    }else if(window.innerWidth>400){
      textAreas[0].cols=50;
    }
  } 
}

function set_addEventListener(elmsArray){
  elmsArray.forEach(elm => {
    elm.addEventListener('play', () => {
        elmsArray.forEach(otherElm => {
          if (otherElm !== elm) {
            //console.log(otherElm.src);
            otherElm.pause();
          }
        });
        if(audio!=undefined){
          audio.pause();
          recolor_all();
        }
    });    
  });
}
function get_mp3(elm){
  let data = getSendData([elm]);
  ajax("missingMp3="+data,[elm]);
}
function ajax(sendData,elmsArray){
  var xmlHttp = new XMLHttpRequest();
  if(null == xmlHttp ) { // 初期化失敗時
    return ;
  }
  //応答時の処理定義
  xmlHttp.onreadystatechange = function(){
    if(xmlHttp.readyState == 4 && xmlHttp.status == 200){
      //alert("done");
      //キャッシュを使ってページをリロードする.
      //window.location.reload(false);
      elmsArray.forEach(function(elm){
        elm.load();
      });
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
function play_repeat(seibu,part,btn){
  stop_audio_controls();
  button_color(btn);
  console.log("step1");
  if(get_audio_src(seibu)!=null){
    console.log("step2-1");
    if(get_audio_src(seibu).length==1){
      console.log("step2-1-1");      
      audio.src = get_audio_src(seibu);
    }else{
      console.log("step2-1-2");      
      //一部分再生用に専用のオーディオファイルを用意している場合
      audio.src = get_audio_src(seibu,part);
    }
  }else{
    console.log("step2-2");
    audio.src = get_src(seibu);
  }
  if(typeof get_trange==='undefined'){
    audio.currentTime = 0;
  }else{
    if(get_trange.length==3){
      t_range=get_trange(seibu,tempo,part);
    }else{
      t_range=get_trange(seibu,part);
    }
    console.log(t_range);
    audio.currentTime = t_range.split(",")[0];
  }
  audio.play();
  audio.addEventListener('timeupdate',loop, false);
}
function loop() {
  if(typeof get_trange==='undefined'){
    let startTime=0;
    if( audio.ended ) {
      audio.currentTime = startTime;
      sleepSetTimeout(3000,() => audio.play());
    }  
  }else{
    let startTime=t_range.split(",")[0];
    let endTime=t_range.split(",")[1];
      if( audio.currentTime >= endTime ) {
        audio.currentTime = startTime;
        sleepSetTimeout(3000,() => audio.play());
      }
    }
}
function sleepSetTimeout(ms,callback){
  setTimeout(callback,ms);
}
function stop_audio_controls(){
  let audios=document.querySelectorAll("audio");
  audios.forEach(audio=>{
    //console.log(audio.src);
    audio.pause();
  })
}
function stop_audio(){
  audio.pause();
  recolor_all();
  stop_audio_controls();
}
function button_color(btn){
  recolor_all();
  //btn.style.color="red";
  btn.style.fontWeight="bold";
}
function recolor_all(){
  let btnsArray = Array.from(btns);
  btnsArray.forEach(btn=>{btn.style.fontWeight="";})
}
function get_audio_src(seibu){
  let elm=document.getElementById(seibu);
  console.log(elm==null);
  if(elm!=null){
    console.log("step_get_audio_src-1");
    return elm.src;
  }else{
    console.log("step_get_audio_src-2");
    return null;
  }
}
function plus_password(target,add_info){
  var password = prompt("Please enter the password:");
  if (password != null && password !== "") {
    if(add_info==undefined){
      window.location.href = target + "&password=" + password;
    }else{
      //連絡事項欄の書き込みに係る処理
      var data={"password":password,"info":target};
      return JSON.stringify(data);
    }
  }
}
//以下は、連絡事項のテキストエリアの書き込みに係る処理
function cancelText(){
  document.getElementById("returnText").value="";
}
function addText(){
  var elm=document.getElementById("returnText");

  if(elm.value==""){
    alert("追記する内容が何も入力されていません。");
    return ;
  }  
  var sendData=plus_password(elm.value,"addText");
  //sendDataは、{"info":テキストデータ,"password":password}のjsonデータ
  //alert(sendData);
  var xmlHttp = new XMLHttpRequest();
  //応答時の処理定義
  xmlHttp.onreadystatechange = function(){
    if(xmlHttp.readyState == 4 && xmlHttp.status == 200){
      var response=xmlHttp.responseText;
      if(response=="パスワードが違います."){
        alert("パスワードが違います！");
      }else{
        elm.value="";
        document.getElementById("comuBoard").value=response;
      }
    }
  }
  //POSTリクエスト
  xmlHttp.open("POST","./Choir.cgi" , true);
  xmlHttp.setRequestHeader('content-type', 'application/json;charset=UTF-8');
  xmlHttp.send(sendData);
}