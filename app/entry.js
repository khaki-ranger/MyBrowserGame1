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
  obstacleImageWidth: 40,
  obstacleImageHeight: 43,
  deg: 0,
  rotationDegreeByDirection: {
    'left': 0,
    'up': 270,
    'down': 90,
    'right': 0
  },
  myDisplayName: $('#main').attr('data-displayName'),
  myThumbUrl: $('#main').attr('data-thumbUrl'),
  fieldWidth: null,
  fieldHeight: null,
  itemsMap: new Map(),
  gasMap: new Map(),
  obstacleMap: new Map()
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

  // 障害物の画像
  gameObj.obstacleImage = new Image();
  gameObj.obstacleImage.src = '/images/obstacle.png';

  // ミサイルの画像
  gameObj.missileImage = new Image();
  gameObj.missileImage.src = '/images/missile.png';
}
init();

function ticker() {
  if (!gameObj.myPlayerObj || !gameObj.playersMap) return;
  // フィールドの画面を初期化する
  gameObj.ctxField.clearRect(0, 0, gameObj.fieldCanvasWidth, gameObj.fieldCanvasHeight);
  // アイテムなどの要素を描画する
  drawMap(gameObj);
  // プレイヤーを描画する
  drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
  // スコアの画面を初期化する
  gameObj.ctxScore.clearRect(0, 0, gameObj.scoreCanvasWidth, gameObj.scoreCanvasHeight);
  drawGasTimer(gameObj.ctxScore, gameObj.myPlayerObj.gasTime);
  drawMissiles(gameObj.ctxScore, gameObj.myPlayerObj.missilesMany);
}
setInterval(ticker, 33);

function drawPlayer(ctxField, myPlayerObj) {

  const rotationDegree = gameObj.rotationDegreeByDirection[myPlayerObj.direction];

  ctxField.save();
  ctxField.translate(gameObj.fieldCanvasWidth / 2, gameObj.fieldCanvasHeight / 2);
  ctxField.rotate(getRadian(rotationDegree));
  if (myPlayerObj.direction === 'right') {
    ctxField.scale(-1, 1);
  }
  
  ctxField.drawImage(
      gameObj.playerImage, -(gameObj.playerImage.width / 2), -(gameObj.playerImage.height / 2)
  );
  ctxField.restore();
}

function drawMissiles(ctxScore, missilesMany) {
  for (let i = 0; i < missilesMany; i++) {
    ctxScore.drawImage(gameObj.missileImage, 50 * i, 80);
  }
}

function drawGasTimer(ctxScore, gasTime) {
  ctxScore.fillStyle = "rgb(0, 220, 250)";
  ctxScore.font = 'bold 40px Arial';
  ctxScore.fillText(gasTime, 110, 50);
}

function getRadian(kakudo) {
  return kakudo * Math.PI / 180
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
  const obstacleArray = compressed[3];

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
    player.missilesMany = compressedPlayerData[7];
    player.gasTime = compressedPlayerData[8];

    gameObj.playersMap.set(player.playerId, player);

    // 自分の情報も更新
    if (player.playerId === gameObj.myPlayerObj.playerId) {
      gameObj.myPlayerObj.x = compressedPlayerData[0];
      gameObj.myPlayerObj.y = compressedPlayerData[1];
      gameObj.myPlayerObj.displayName = compressedPlayerData[3];
      gameObj.myPlayerObj.score = compressedPlayerData[4];
      gameObj.myPlayerObj.isAlive = compressedPlayerData[5];
      gameObj.myPlayerObj.missilesMany = compressedPlayerData[7];
      gameObj.myPlayerObj.gasTime = compressedPlayerData[8];
    }
  }

  gameObj.itemsMap = new Map();
  itemsArray.forEach((compressedItemData, index) => {
    gameObj.itemsMap.set(index, { x: compressedItemData[0], y: compressedItemData[1] });       
  });

  gameObj.gasMap = new Map();
  gasArray.forEach((compressedGasData, index) => {
    gameObj.gasMap.set(index, { x: compressedGasData[0], y: compressedGasData[1] });     
  });

  gameObj.obstacleMap = new Map();
  obstacleArray.forEach((compressedObstacleData, index) => {
    gameObj.obstacleMap.set(index, { x: compressedObstacleData[0], y: compressedObstacleData[1] });     
  });

});

function drawMap(gameObj) {

  // アイテムの描画
  for (let [index, item] of gameObj.itemsMap) {

    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,
      item.x, item.y,
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.fieldCanvasWidth, gameObj.fieldCanvasHeight
    );

    if (distanceObj.distanceX <= (gameObj.fieldCanvasWidth / 2) && distanceObj.distanceY <= (gameObj.fieldCanvasHeight / 2)) {

      gameObj.ctxField.fillStyle = 'rgba(255, 165, 0, 1)';
      gameObj.ctxField.beginPath();
      gameObj.ctxField.arc(distanceObj.drawX, distanceObj.drawY, gameObj.itemRadius, 0, Math.PI * 2, true);
      gameObj.ctxField.fill();
    }
  }

  // ガスの描画
  for (const [gasKey, gasObj] of gameObj.gasMap) {

    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,
      gasObj.x, gasObj.y,
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.fieldCanvasWidth, gameObj.fieldCanvasHeight
    );

    if (distanceObj.distanceX <= (gameObj.fieldCanvasWidth / 2) && distanceObj.distanceY <= (gameObj.fieldCanvasHeight / 2)) {

      gameObj.ctxField.fillStyle = 'rgb(0, 220, 255, 1)';
      gameObj.ctxField.beginPath();
      gameObj.ctxField.arc(distanceObj.drawX, distanceObj.drawY, gameObj.gasRadius, 0, Math.PI * 2, true);
      gameObj.ctxField.fill();
    }
  }

  // 障害物の描画
  for (const [obstacleKey, obstacleObj] of gameObj.obstacleMap) {

    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,
      obstacleObj.x, obstacleObj.y,
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.fieldCanvasWidth, gameObj.fieldCanvasHeight
    );

    if (distanceObj.distanceX <= (gameObj.fieldCanvasWidth / 2) && distanceObj.distanceY <= (gameObj.fieldCanvasHeight / 2)) {

      gameObj.ctxField.drawImage(
        gameObj.obstacleImage, distanceObj.drawX, distanceObj.drawY
      );
    }
  }
}

function calculationBetweenTwoPoints(pX, pY, oX, oY, gameWidth, gameHeight, fieldCanvasWidth, fieldCanvasHeight) {
  let distanceX = 99999999;
  let distanceY = 99999999;
  let drawX = null;
  let drawY = null;

  if (pX <= oX) {
    // 右から
    distanceX = oX - pX;
    drawX = (fieldCanvasWidth / 2) + distanceX;
    // 左から
    let tmpDistance = pX + gameWidth - oX;
    if (distanceX > tmpDistance) {
      distanceX = tmpDistance;
      drawX = (fieldCanvasWidth / 2) - distanceX;
    }

  } else {
    // 右から
    distanceX = pX - oX;
    drawX = (fieldCanvasWidth / 2) - distanceX;
    // 左から
    let tmpDistance = oX + gameWidth - pX;
    if (distanceX > tmpDistance) {
      distanceX = tmpDistance;
      drawX = (fieldCanvasWidth / 2) + distanceX;
    }
  }

  if (pY <= oY) {
    // 下から
    distanceY = oY - pY;
    drawY = (fieldCanvasHeight / 2) + distanceY;
    // 上から
    let tmpDistance = pY + gameHeight - oY;
    if (distanceY > tmpDistance) {
      distanceY = tmpDistance;
      drawY = (fieldCanvasHeight / 2) - distanceY;
    }

  } else {
    // 上から
    distanceY = pY - oY;
    drawY = (fieldCanvasHeight / 2) - distanceY;
    // 下から
    let tmpDistance = oY + gameHeight - pY;
    if (distanceY > tmpDistance) {
      distanceY = tmpDistance;
      drawY = (fieldCanvasHeight / 2) + distanceY;
    }
  }

  const degree = calcTwoPointsDegree(drawX, drawY, fieldCanvasWidth / 2, fieldCanvasHeight / 2);

  return {
    distanceX,
    distanceY,
    drawX,
    drawY,
    degree
  };
}

function calcTwoPointsDegree(x1, y1, x2, y2) {
  const radian = Math.atan2(y2 - y1, x2 - x1);
  const degree = radian * 180 / Math.PI + 180;
  return degree;
}

$(window).keydown(function(event) {
  if (!gameObj.myPlayerObj || gameObj.myPlayerObj.isAlive === false) return;

  switch (event.key) {
    case 'ArrowLeft':
      if (gameObj.myPlayerObj.direction !== 'left') {
        gameObj.myPlayerObj.direction = 'left';
        drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'left');
      break;
    case 'ArrowUp':
      if (gameObj.myPlayerObj.direction !== 'up') {
        gameObj.myPlayerObj.direction = 'up';
        drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'up');
      break;
    case 'ArrowDown':
      if (gameObj.myPlayerObj.direction !== 'down') {
        gameObj.myPlayerObj.direction = 'down';
        drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'down');
      break;
    case 'ArrowRight':
      if (gameObj.myPlayerObj.direction !== 'right') {
        gameObj.myPlayerObj.direction = 'right';
        drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'right');
      break;
  }
});

function sendChangeDirection(socket, direction) {
  socket.emit('change direction', direction);
}
