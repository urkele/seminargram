var socket = io.connect('http://localhost:3000');
socket.on('debug', function (data) {
  console.log(data);
});
socket.on('connection', function(data){
  if(data == 'connected'){
    console.log("connection:", data);
  }
  else{
    console.log("something wrong with the socket.io connection");
  };
});

var url = "/tags";

$(document).ready(function(){
  $("form").submit(function(e){
    $("#result").empty();
    var query = $("#searchbox").val().trim().split(" ");
    console.log(query);
    e.preventDefault();
    socket.emit('query', query);
    $.get(url,{tags: query},
      function(data){
        for (var i = 0; i < data.length; i++) {
          console.log(data[i]);
          var img = document.createElement("img");
          img.src = data[i].recentImage.imageUrl;
          img.alt = data[i].tagName;
          img.title = data[i].tagName;
          $("#result").append(img);
        };
        console.log("succesfuly got data: ", data);
      },"json")
  });
})