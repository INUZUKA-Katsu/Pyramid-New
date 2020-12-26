
window.onload=function(){
  var elms = document.getElementsByTagName('audio');
  var elm  = elms[elms.length-2]
  //console.log(elm.readyState);
  if(elm.readyState==0){
    var mp3_uri  = elm.getAttribute('src');
    wait_mp3(mp3_uri,0);
  }
}

function wait_mp3(mp3_uri,count){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
      if(xhr.readyState === 4 && xhr.status === 200) {
        //console.log(xhr.responseText);
        if(xhr.responseText=='true'){
          //alert('Mp3 is exist.');
          document_reload();
        }else{
          if (count<10){
            count++;
            setTimeout(function(){wait_mp3(mp3_uri,count)},1500);
          }
        }
      }
  }
  xhr.open('GET', '/exist.cgi?' + mp3_uri);
  xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  xhr.send( null );
}

function document_reload(){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
      
      if(xhr.readyState === 4 && xhr.status === 200) {
        var html = xhr.responseText.replace(/<.*?>/m,'');
        document.documentElement.innerHTML = html ; 
      }
  }
  xhr.open('GET', document.location.href);
  xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  xhr.send( null );
}
 
