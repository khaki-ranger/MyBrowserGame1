'use strict';
import $ from 'jquery';
import io from 'socket.io-client';

const gameObj = {
  fieldCanvasWidth: 500,
  fieldCanvasHeight: 500,
  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  deg: 0,
  myDisplayName: $('#main').attr('data-displayName'),
  myThumbUrl: $('#main').attr('data-thumbUrl')
};

const socketQueryParameters = `displayName=${gameObj.myDisplayName}&thumbUrl=${gameObj.myThumbUrl}`;
const socket = io($('#main').attr('data-ipAddress') + '?' + socketQueryParameters);

function init() {
  // ゲーム用のキャンバス
  const fieldCanvas = $('#field')[0];
  fieldCanvas.width = gameObj.fieldCanvasWidth;
  fieldCanvas.height = gameObj.fieldCanvasHeight;
  gameObj.ctxField = fieldCanvas.getContext('2d');
  
  // ランキング用のキャンバス
  const scoreCanvas = $('#score')[0];
  scoreCanvas.width = gameObj.scoreCanvasWidth;
  scoreCanvas.height = gameObj.scoreCanvasHeight;
  gameObj.ctxScore = scoreCanvas.getContext('2d');
  
  // プレイヤーの画像
  const playerImage = new Image();
  playerImage.src = gameObj.myThumbUrl;
  gameObj.playerImage = playerImage;
}
init();

function ticker() {
  // フィールドの画面を初期化する
  gameObj.ctxField.clearRect(0, 0, gameObj.fieldCanvasWidth, gameObj.fieldCanvasHeight);
  // プレイヤーを描画する
  drawPlayer(gameObj.ctxField);
}
setInterval(ticker, 33);

function drawPlayer(ctxField) {
  ctxField.save();
  ctxField.translate(gameObj.fieldCanvasWidth / 2, gameObj.fieldCanvasHeight / 2);
  
  ctxField.drawImage(
      gameObj.playerImage, -(gameObj.playerImage.width / 2), -(gameObj.playerImage.height / 2)
  );
  ctxField.restore();
}

socket.on('start data', (startObj) => {
  console.log('start data came');
});

socket.on('map data', (compressed) => {
  console.log('map data came');
});

