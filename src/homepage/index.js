var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');
var request = require('superagent');
var header = require('../header');
var axios = require('axios');
var io = require('socket.io-client')
var Webcam = require('webcamjs');
var picture = require('../picture-card');
var utils = require('../utils')

var socket = io.connect('http://localhost:5151')

page('/', utils.loadAuth, header, loading, asyncLoad, function(ctx, next)
{
  title('Platzigram');
  var main = document.getElementById('main-container');

  empty(main).appendChild(template(ctx.pictures));

  const picturePreview = $('#picture-preview');
  const camaraInput = $('#camara-input');
  const cancelPicture = $('#cancelPicture');
  const shootButton = $('#shoot');
  const uploadButton = $('#uploadButton');

  function reset()
  {
    picturePreview.addClass('hide');
    cancelPicture.addClass('hide');
    uploadButton.addClass('hide');
    shootButton.removeClass('hide');
    camaraInput.removeClass('hide');
  }

  cancelPicture.click(reset);

  $( document ).ready(function()
  {
      $('.modal').modal({ // inicializa todos los modales
        ready: function()
        {
          Webcam.attach('#camara-input');
          shootButton.click((ev) => {
            Webcam.snap((data_uri) => {
              picturePreview.html (`<img src="${data_uri}"/>`);
              picturePreview.removeClass('hide');
              cancelPicture.removeClass('hide');
              uploadButton.removeClass('hide');
              shootButton.addClass('hide');
              camaraInput.addClass('hide');
              uploadButton.off('click');
              uploadButton.click(() => {
                const pic = {
                  url: data_uri,
                  likes: 0,
                  liked: false,
                  createdAt: +new Date(),
                  user:
                  {
                    username: 'JuanDS',
                    avatar: 'https://static.platzi.com/media/public/uploads/foto3-1207f840-b386-4056-8c49-1136f2137abb.jpg'
                  }
                }

                $('#picture-cards').prepend(picture(pic));
                reset();
                $('#modalCamara').modal('close');
              })
            });
          })
        },
        complete: function(){
          Webcam.reset();
          reset();
        }
      });

      $('#modal-trigger').on('click', function() // abrir el modal click
      {
        $('#modalCamara').modal('open'); // el #href debe ser el mismo id del modal.
      });

    });
});

socket.on('image', function (image) {
  var picturesEl = document.getElementById('picture-cards');
  var first = picturesEl.firstChild;
  var img = picture(image);
  picturesEl.insertBefore(img, first);
});

function loading(ctx, next)
{
  var el = document.createElement('div');
  el.classList.add('loader');
  document.getElementById('main-container').appendChild(el);
  next();
}

function loadPictures(ctx, next)
{
  request
    .get('/api/pictures')
    .end(function(err, res)
    {
      if (err) return console.log(err);

      ctx.pictures = res.body;
      next();
    })
}

function loadPicturesAxios(ctx, next)
{
  axios
    .get('/api/pictures')
    .then(function(res)
    {
      ctx.pictures = res.data;
      next();
    })
    .catch(function (err){
      console.log(err);
    })
}

function loadPicturesFetch(ctx, next)
{
  fetch('./api/pictures')
    .then(function (res)
    {
      return res.json();
    })
    .then(function (pictures)
    {
      ctx.pictures = pictures;
      next();
    })
    .catch(function (err)
    {
      console.log(err);
    })
}

async function asyncLoad(ctx, next)
{
  try
  {
    ctx.pictures = await fetch('/api/pictures'). then(res => res.json());
    next();
  }

  catch (err)
  {
    return console.log(err);
  }
}


