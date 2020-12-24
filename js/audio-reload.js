
window.onload=function(){
  var id   = setInterval(function(){reload(id)},1500);
}

function reload(id){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
      
      if(xhr.readyState === 4 && xhr.status === 200) {
        //var re = xhr.responseDocument;
        var re = xhr.responseText;
        var new_html = re.replace(/<.*?>/m,"")
        //console.log( new_html );
        document.innerHTML = new_html ;
        var elms = document.getElementsByTagName('audio');
        var elm  = elms[elms.length-2]
        console.log(elm.readyState);
        if(elm.readyState>0){
          clearInterval(id);
        }
      }
  
  }
  xhr.open('GET', document.location);
  xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  xhr.send( null );
}
 
