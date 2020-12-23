window.onload=function(){
  var elms = document.getElementsByTagName('audio');
  var reload = function(){
    Location.reload;
    console.log('reloaded');
    if(elms[elms.length-1].readyState>0){
      //alert("ready!");
      clearInterval(id);
    }
  }
  var id=setInterval(reload,1500)
}
