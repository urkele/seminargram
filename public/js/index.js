var url = "/tags";

$(document).ready(function(){
  $("form").submit(function(e){
    // var query = $("#searchbox").val().split(" ");
    // console.log(query);
    // e.preventDefault();
    $.get(url)
  });
})