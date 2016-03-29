function getCredentials(cb) {
  getClarifaiCredentials(cb)
}

function getClarifaiCredentials(cb) {
  var data = {
    'grant_type': 'client_credentials',
    'client_id': CLARIFAI_CLIENT_ID,
    'client_secret': CLARIFAI_CLIENT_SECRET
  };

  return $.ajax({
    'url': 'https://api.clarifai.com/v1/token',
    'data': data,
    'type': 'POST'
  })
  .then(function(r) {
    localStorage.setItem('token', r.access_token);
    localStorage.setItem('tokenTimestamp', Math.floor(Date.now() / 1000));
    cb();
  });
}

function convertImgToDataURLviaCanvas(url, callback, outputFormat){
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function(){
        var canvas = document.createElement('CANVAS');
        var ctx = canvas.getContext('2d');
        var dataURL;
        canvas.height = this.height;
        canvas.width = this.width;
        ctx.drawImage(this, 0, 0);
        dataURL = canvas.toDataURL(outputFormat);
        callback(dataURL);
        canvas = null; 
    };
    img.src = url;
}

function postImage(imgurl) {
  BGcolor(imgurl);
  postClarifai(imgurl);
  postImagga(imgurl);
  postMetamind(imgurl);
  //postGoogle(imgurl);
}

function BGcolor(imgurl) {
  var accessToken = localStorage.getItem('token');

  return $.ajax({
    'url': 'https://api.clarifai.com/v1/color/?url=' + imgurl,
    'headers': {
      'Authorization': 'Bearer ' + accessToken
    },
    'type': 'GET'
  }).then(function(r){

    document.body.style.background=r.results[0].colors[0].hex;
  });
}

function postClarifai(imgurl) {
  var accessToken = localStorage.getItem('token');

  return $.ajax({
    'url': 'https://api.clarifai.com/v1/tag/?url=' + imgurl,
    'headers': {
      'Authorization': 'Bearer ' + accessToken
    },
    'type': 'GET'
  }).then(function(r){
    parseClarifaiResponse(r, imgurl);
  });
}

function parseClarifaiResponse(resp, imgurl) {
  var probs = [];
  if (resp.status_code === 'OK') {
    var results = resp.results;
    tags = results[0].result.tag.classes.slice(0, 10);
    probs = results[0].result.tag.probs.slice(0, 10);

    $('#photos').append('<div><img src="' + imgurl + '" /></div>');

    $('#clarifai').append('<h2>Clarifai</h2><br>');
    for (i=0; i < tags.length; i++) {
      $('#clarifai').append('<span style="opacity:' + probs[i] + '">' + tags[i] + '</span><br></div>');
    }
  
  } else {
    console.log('Sorry, something is wrong.');
  }
}

function postImagga(imgurl) {
  return $.ajax({
    'url': 'https://api.imagga.com/v1/tagging?url=' + imgurl,
    'headers': {
      'Authorization': 'Basic YWNjXzlmMGJlYjFlNmU4YjRlNzphZTFjZDAyMTRjNGQzYjJhOTI3NTUyY2M1ZDA0MGU1Yg=='
    },
    'type': 'GET'
  }).then(function(r){
    parseImaggaResponse(r, imgurl);
  });
}

function parseImaggaResponse(resp, imgurl) {
  var results = resp.results[0];
  tags = [];
  probs = [];
  for (i=0; i < 10; i++) {
    tags.push(results.tags[i].tag);
    probs.push(results.tags[i].confidence);
  }

  $('#imagga').append('<h2>Imagga</h2><br>');
  for (i=0; i < tags.length; i++) {
    $('#imagga').append('<span style="opacity:' + probs[i]/100 + '"">' + tags[i] + '</span><br></div>');
  }
}

function postMetamind(imgurl) {
  return fetch('https://www.metamind.io/vision/classify', {
    method: 'post',
    body: JSON.stringify({ 
      "classifier_id": "imagenet-1k-net",
      "image_url": imgurl 
    }),
    headers: {
      'Authorization': 'Basic cXMuk8b0fDaRfPjO2OLbrToPiTBoZmy1ryxfqg6MtsaW48SkeB'
    } }).then(function(resp){ return resp.json()})
        .then(function(r){
    parseMetamindResponse(r, imgurl);
  });
}

function parseMetamindResponse(resp, imgurl) {
  var results = resp.predictions;
  tags = [];
  probs = [];
  for (i=0; i < Math.min(5,results.length); i++) {
    tags.push(results[i].class_name);
    probs.push(results[i].prob);
  }

  $('#metamind').append('<h2>Metamind</h2><br>'); 
  for (i=0; i < tags.length; i++) {
    $('#metamind').append('<span style="opacity:' + probs[i]*4 + '">' + tags[i] + '</span><br></div>');
  } 
}

function postGoogle(imgurl) {
  convertImgToDataURLviaCanvas(imgurl, function(imageData) { GoogleRequest(imageData)});
}
  
function GoogleRequest(imageData) {
  return fetch('https://vision.googleapis.com/v1/images:annotate?key=AIzaSyAgG6wcRuTN1Sz85StvjYt8wD2_PoHB1T8', {
    method: 'post',
    mode: 'no-cors',
    body: JSON.stringify({ 
      "requests": [
        {
          "image":{
            "content": imageData.split(",")[1]
          },
          "features":[
            {
              "type":"LABEL_DETECTION",
              "maxResults":10
            }
          ]
        }
      ]
    }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }).then(function(resp){
    return resp.json()
  }).then(function(r){ 
    parseGoogleResponse(r, imgurl) 
  }).catch(function(e){
    console.log(e)
  });

}



  // return $.ajax({
  //   'url': 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyAgG6wcRuTN1Sz85StvjYt8wD2_PoHB1T8',
  //   'dataType': "xml/html/script/json", // expected format for response
  //   'contentType': "application/json", // send as JSON
  //   'body': {
  //     "requests":[
  //       {
  //         "image":{
  //           "content":imageData
  //         },
  //         "features":[
  //           {
  //             "type":"LABEL_DETECTION",
  //             "maxResults":10
  //           }
  //         ]
  //       }
  //     ]
  //   },
  //   'type': 'POST'
  // }).then(function(r){
  //   parseGoogleResponse(r, imgurl);
  // });

function parseGoogleResponse(resp, imgurl) {
  var results = resp.responses.labelAnnotations;
  tags = [];
  probs = [];
  for (i=0; i < Math.min(5,results.length); i++) {
    tags.push(results[i].description);
    probs.push(results[i].score);
  }

  $('#metamind').append('<h2>Metamind</h2><br>'); 
  for (i=0; i < tags.length; i++) {
    $('#metamind').append('<span style="opacity:' + probs[i] + '">' + tags[i] + '</span><br></div>');
  } 
}

function run(imgurl) {
  $('#clarifai').html("");
  $('#metamind').html("");
  $('#imagga').html("");
  $('#photos').html("");
  if (localStorage.getItem('tokenTimeStamp') - Math.floor(Date.now() / 1000) > 86400
    || localStorage.getItem('token') === null) {
    getCredentials(function() {
      postImage(imgurl);
    });
  } else {
    postImage(imgurl);
  }
}
