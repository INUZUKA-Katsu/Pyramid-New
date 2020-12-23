var id;
var i=0;
window.onload=function(){
  var elms = document.getElementsByTagName('audio');
  var elm  = elms[elms.length-2]
  id=setInterval(function(){reload(elm)},1500)
}
function reload(elm){
  Location.reload;
  console.log(i);
  i++
  console.log('readyState => ' + elm.readyState);
  if(elm.readyState>0){
    clearInterval(id);
  }
}
