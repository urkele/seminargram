var url = "/tags";

$(document).ready(function(){
  $("form").submit(function(e){
    var query = $("#searchbox").val().trim().split(" ");
    console.log(query);
    e.preventDefault();
    $.get(url,{tags: query},
      function(data){
        console.log("succesfuly got data: ", data);
      },"json")
  });
})