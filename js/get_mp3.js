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
  audio.src = get_audio_src(seibu);
  if(typeof t_ranges==='undefined'){
    audio.currentTime = 0;
  }else{
    t_range=t_ranges[seibu][part];
    audio.currentTime = t_range.split(",")[0];
  }
  audio.play();
  audio.addEventListener('timeupdate',loop, false);
}
function loop() {
  if(typeof t_ranges==='undefined'){
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
function plus_password(target){
  var password = prompt("Please enter the password:");
  if (password != null && password !== "") {
    window.location.href = target + "&password=" + password;
  }
}
