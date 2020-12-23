var id;
var i=0;
window.onload=function(){
  var elms = document.getElementsByTagName('audio');
  var elm  = elms[elms.length-2]
  setTimeout(function(){reload(elm)},1500);
}
function reload(elm){  
  if(elm.readyState==0){
    window.location.href = window.location.href;
  }
}

