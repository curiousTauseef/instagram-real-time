require('dotenv').load();

var express = require("express");
var app = express();
var port = process.env.PORT || 3000;
var io = require('socket.io').listen(app.listen(port));
var Instagram = require('instagram-node-lib');
var http = require('http');
var url = require('url');
var Promise = require("bluebird");
var bhttp = require("bhttp");
var FifoQueue = require("./lib/fifo-queue");
var intervalID;

/**
 * Set the paths for your files
 * @type {[string]}
 */
var pub = __dirname + '/public',
    view = __dirname + '/views';

/**
 * Set the 'client ID' and the 'client secret' to use on Instagram
 * @type {String}
 */
var clientID = process.env.INSTAGRAM_CLIENT_ID,
    clientSecret = process.env.INSTAGRAM_CLIENT_SECRET,
    callbackUrl = url.resolve(process.env.BASE_URL, "callback"),
    subscribeTags = process.env.SUBSCRIBE_TAGS.split(",");

/**
 * Bookkeeping for images that were already seen - this is because the Instagram API gives us tag rather than image notifications.
 */
var knownThreshold = 200;
var knownQueues = {};
var responseThreshold = 3;
var lastResponses = {};
var removedImages = {};

subscribeTags.forEach(function(tag){
  knownQueues[tag] = FifoQueue(knownThreshold, {simpleValues: true});
  lastResponses[tag] = FifoQueue(responseThreshold);
});

function isKnown(tag, id) {
  return knownQueues[tag].has(id);
}

function setKnown(tag, id) {
  /* Returns whether the image in question is a new one. */
  return knownQueues[tag].pushIfNew(id);
}

/**
 * Set the configuration
 */
Instagram.set('client_id', clientID);
Instagram.set('client_secret', clientSecret);
Instagram.set('callback_url', callbackUrl);
Instagram.set('redirect_uri', process.env.BASE_URL);
Instagram.set('maxSockets', 10);

subscribeTags.forEach(function(tag){
  Instagram.subscriptions.subscribe({
    object: 'tag',
    object_id: tag,
    aspect: 'media',
    callback_url: callbackUrl,
    type: 'subscription',
    id: '#'
  });
});

// https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
io.configure(function () {
  io.set("transports", [
    'websocket'
    , 'xhr-polling'
    , 'flashsocket'
    , 'htmlfile'
    , 'jsonp-polling'
  ]);
  io.set("polling duration", 10);
});

function getLatestForTag(tagName) {
  return Promise.try(function(){
    return 'https://api.instagram.com/v1/tags/' + tagName + '/media/recent?client_id=' + clientID;
  }).then(function(tagUrl){
    return bhttp.get(tagUrl, {decodeJSON: true});
  }).then(function(response){
    return response.body.data;
  }).map(function(item){
    return {id: item.id, url: item.images.standard_resolution.url, caption: (item.caption && item.caption.text), tag: tagName};
  })
  .filter(filterDeleted)
  .then(function() {
    return list.concat([]).reverse();
  }
  .tap(function(response) {
    lastResponses[tagName].push(response);
  });
}

function sendLatestForTags(tagNames) {
  return Promise.map(tagNames, function(tagName){
    return getLatestForTag(tagName);
  }).reduce(function(itemList, items){
    return itemList.concat(items);
  }, []).filter(function(item){
    return setKnown(item.tag, item.id);
  }).each(function(item){
    io.sockets.emit("image", item);
  });
}

function filterDeleted(item) {
  return (removedImages[item.id] == null);
}

/**
 * Set your app main configuration
 */

app.use(require("body-parser").urlencoded({
  extended: true
}));

app.use(require("body-parser").json());

//app.use(express.methodOverride());
//app.use(app.router);
app.use(express.static(pub));
app.use(express.static(view));
//app.use(express.errorHandler());

/**
 * Render your index/view "my choice was not use jade"
 */
app.get("/views", function(req, res){
  res.render("index");
});

// check subscriptions
// https://api.instagram.com/v1/subscriptions?client_secret=YOUR_CLIENT_ID&client_id=YOUR_CLIENT_SECRET

var initialFetch = sendLatestForTags(subscribeTags);

/**
 * On socket.io connection we get the most recent posts
 * and send to the client side via socket.emit
 */
io.sockets.on('connection', function (socket) {
  Promise.map(subscribeTags, function(tag){
    /* Ensure that we've at least completed the initial image retrieval. */
    return initialFetch.then(function(){
      return lastResponses[tag].get(lastResponses[tag].length() - 1).filter(filterDeleted);
    });
  }).reduce(function(newList, response){
    return newList.concat(response);
  }, []).then(function(data){
    socket.emit('firstShow', data);
  });
});

router = express.Router();

/**
 * Needed to receive the handshake
 */
router.get('/callback', function(req, res){
  var handshake =  Instagram.subscriptions.handshake(req, res);
});

router.param("authKey", function(req, res, next) {
  if(req.params.authKey !== process.env.AUTH_KEY) {
    return res.redirect("/");
  } else {
    next();
  }
})

router.get("/admin/:authKey", function(req, res){
  res.sendfile("views/index.html");
});

router.post("/admin/:authKey/remove", function(req, res){
  io.sockets.emit("remove", req.body.id);
  removedImages[req.body.id] = true;
  console.log("---------- REMOVED", removedImages);
  res.end();
});

/**
 * for each new post Instagram send us the data
 */
router.post('/callback', function(req, res) {
  var data = req.body;
  
  Promise.map(data, function(tag){
    return tag.object_id;
  }).then(function(tagNames){
    sendLatestForTags(tagNames);
  });

  res.end();
});

app.use(router);

console.log("Listening on port " + port);
