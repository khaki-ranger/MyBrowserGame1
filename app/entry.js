'use strict';
import $ from 'jquery';
import io from 'socket.io-client';

const gameObj = {
  fieldCanvasWidth: 500,
  fieldCanvasHeight: 500,
  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  itemRadius: 4,
  gasRadius: 6,
  deg: 0,
  myDisplayName: $('#main').attr('data-displayName'),
  myThumbUrl: $('#main').attr('data-thumbUrl'),
  fieldWidth: null,
  fieldHeight: null,
  itemsMap: new Map(),
  gasMap: new Map()
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
  gameObj.fieldWidth = startObj.fieldWidth;
  gameObj.fieldHeight = startObj.fieldHeight;
  gameObj.myPlayerObj = startObj.playerObj;
});

socket.on('map data', (compressed) => {
  const playersArray = compressed[0];
  const itemsArray = compressed[1];
  const gasArray = compressed[2];

  gameObj.playersMap = new Map();
  for (let compressedPlayerData of playersArray) {

    const player = {};
    player.x = compressedPlayerData[0];
    player.y = compressedPlayerData[1];
    player.playerId = compressedPlayerData[2];
    player.displayName = compressedPlayerData[3];
    player.score = compressedPlayerData[4];
    player.isAlive = compressedPlayerData[5];
    player.direction = compressedPlayerData[6];

    gameObj.playersMap.set(player.playerId, player);

    // 自分の情報も更新
    if (player.playerId === gameObj.myPlayerObj.playerId) {
      gameObj.myPlayerObj.x = compressedPlayerData[0];
      gameObj.myPlayerObj.y = compressedPlayerData[1];
      gameObj.myPlayerObj.displayName = compressedPlayerData[3];
      gameObj.myPlayerObj.score = compressedPlayerData[4];
      gameObj.myPlayerObj.isAlive = compressedPlayerData[5];
    }
  }

  gameObj.itemsMap = new Map();
  itemsArray.forEach((compressedItemData, index) => {
    gameObj.itemsMap.set(index, { x: compressedItemData[0], y: compressedItemData[1] });       
  });

  gameObj.gasMap = new Map();
  gasArray.forEach((compressedAirData, index) => {
    gameObj.gasMap.set(index, { x: compressedAirData[0], y: compressedAirData[1] });     
  });
});

