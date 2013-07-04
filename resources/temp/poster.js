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

var url = "/fakesubscriptions";

$(document).ready(function(){
  $("form").submit(function(e){
    e.preventDefault();
    var arr = [];
    var obj1 = {};
    var obj2 = {};
    obj1.subscription_id = $("#subscription_id1").val();
    obj1.object = $("#object1").val();
    obj1.object_id = $("#object_id1").val();
    obj1.changed_aspect = "media";
    obj1.time = Math.floor((new Date).getTime()/1000);
    obj2.subscription_id = $("#subscription_id2").val();
    obj2.object = $("#object2").val();
    obj2.object_id = $("#object_id2").val();
    obj2.changed_aspect = "media";
    obj2.time = Math.floor((new Date).getTime()/1000);
    console.log(obj1,obj2);
    arr.push(obj1);
    arr.push(obj2);
    console.log(arr);
    $.post(url,{data: arr},function(){console.log("cool")});
  });
})



/*[
    {
        "subscription_id": "1",
        "object": "user",
        "object_id": "1234",
        "changed_aspect": "media",
        "time": 1297286541
    },
    {
        "subscription_id": "2",
        "object": "tag",
        "object_id": "nofilter",
        "changed_aspect": "media",
        "time": 1297286541
    },
    ...
]*/
