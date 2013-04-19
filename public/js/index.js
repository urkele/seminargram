var url = "/tags";

$(document).ready(function(){
  $("form").submit(function(e){
    var query = $("#searchbox").val().trim().split(" ");
    console.log(query);
    e.preventDefault();
    $.get(url,{tags: query},
      function(data){
        for (var i = 0; i < data.length; i++) {
          console.log(data[i]);
          var img = document.createElement("img");
          img.src = data[i].recentImage.imageUrl;
          $("#result").append(img);
        };
        console.log("succesfuly got data: ", data);
      },"json")
  });
})