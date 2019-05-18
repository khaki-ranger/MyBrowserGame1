'use strict';
import $ from 'jquery';
import io from 'socket.io-client';

const gameObj = {
  fieldCanvasWidth: 500,
  fieldCanvasHeight: 500,
  scoreCanvasWidth: 200,
  scoreCanvasHeight: 500,
  movingDistance: 10,
  itemRadius: 4,
  playerCellPx: 32,
  enemyCellPx: 32,
  missileCellPx: 32,
  bomCellPx: 32,
  obstacleImageWidth: 40,
  obstacleImageHeight: 43,
  counter: 0,
  pointByDirection: {
    'left': {x: 0, y: 32},
    'up': {x: 32, y: 0},
    'down': {x: 0, y: 0},
    'right': {x: 32, y: 32}
  },
  myDisplayName: $('#main').attr('data-displayName'),
  myThumbUrl: $('#main').attr('data-thumbUrl'),
  fieldWidth: null,
  fieldHeight: null,
  itemsMap: new Map(),
  obstacleMap: new Map(),
  flyingMissilesMap: new Map()
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
  gameObj.playerImage  = new Image();
  gameObj.playerImage.src = '/images/player.png';

  // 敵キャラの画像
  gameObj.enemyImage = new Image();
  gameObj.enemyImage.src = '/images/player.png';

  // 障害物の画像
  gameObj.obstacleImage = new Image();
  gameObj.obstacleImage.src = '/images/obstacle.png';

  // ミサイルの画像
  gameObj.missileImage = new Image();
  gameObj.missileImage.src = '/images/missile.png';

  // 爆発の画像集
  gameObj.bomListImage = new Image();
  gameObj.bomListImage.src = '/images/bomlist.png';
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
  if (gameObj.myPlayerObj.isAlive === false && gameObj.myPlayerObj.deadCount > 60) {
    drawGameOver(gameObj.ctxField);
  }

  // スコアの画面を初期化する
  gameObj.ctxScore.clearRect(0, 0, gameObj.scoreCanvasWidth, gameObj.scoreCanvasHeight);
  drawMissiles(gameObj.ctxScore, gameObj.myPlayerObj.missilesMany);
  drawScore(gameObj.ctxScore, gameObj.myPlayerObj.score);
  drawRanking(gameObj.ctxScore, gameObj.playersMap);

  moveFlyingMissileInClient(gameObj.myPlayerObj, gameObj.flyingMissilesMap);

  gameObj.counter = (gameObj.counter + 1) % 10000;
}
setInterval(ticker, 33);

function drawGameOver(ctxField) {
  ctxField.font = 'bold 76px Verdana';
  ctxField.fillStyle = "rgb(0, 220, 250)";
  ctxField.fillText('Game Over', gameObj.fieldCanvasWidth / 2, 270);
  ctxField.strokeStyle = "rgb(0, 0, 0)";
  ctxField.lineWidth = 3;
  ctxField.strokeText('Game Over', gameObj.fieldCanvasWidth / 2, 270);
}

function drawPlayer(ctxField, myPlayerObj) {

  if (myPlayerObj.isAlive === false) {
    drawBom(ctxField, gameObj.fieldCanvasWidth / 2, gameObj.fieldCanvasHeight / 2, myPlayerObj.deadCount);
    return;
  }
  const cropPoint = gameObj.pointByDirection[myPlayerObj.direction]
  ctxField.save();
  ctxField.translate(gameObj.fieldCanvasWidth / 2, gameObj.fieldCanvasHeight / 2);

  ctxField.drawImage(
    gameObj.playerImage,
    cropPoint.x, cropPoint.y,
    gameObj.playerCellPx, gameObj.playerCellPx,
    -(gameObj.playerCellPx / 2), -(gameObj.playerCellPx / 2),
    gameObj.playerCellPx, gameObj.playerCellPx,
  ); // 画像データ、切り抜き左、切り抜き上、幅、幅、表示x、表示y、幅、幅
  
  ctxField.restore();
}

function drawBom(ctxField, drawX, drawY, deadCount) {
  if (deadCount >= 60) return;

  const drawBomNumber = Math.floor(deadCount / 6);
  const cropX = (drawBomNumber % (gameObj.bomListImage.width / gameObj.bomCellPx)) * gameObj.bomCellPx;
  const cropY = Math.floor(drawBomNumber / (gameObj.bomListImage.width / gameObj.bomCellPx)) * gameObj.bomCellPx;

  ctxField.drawImage(
    gameObj.bomListImage,
    cropX, cropY,
    gameObj.bomCellPx, gameObj.bomCellPx,
    drawX - gameObj.bomCellPx / 2, drawY - gameObj.bomCellPx / 2,
    gameObj.bomCellPx, gameObj.bomCellPx
  ); // 画像データ、切り抜き左、切り抜き上、幅、幅、表示x、表示y、幅、幅
}

function drawMissiles(ctxScore, missilesMany) {
  for (let i = 0; i < missilesMany; i++) {
    ctxScore.drawImage(gameObj.missileImage, gameObj.missileCellPx * i, 80);
  }
}

function getRadian(kakudo) {
  return kakudo * Math.PI / 180
}

function drawScore(ctxScore, score) {
  ctxScore.fillStyle = "rgb(255, 255, 255)";
  ctxScore.font = '28px Arial';
  ctxScore.fillText(`score: ${score}`, 10, 180);
}

function drawRanking(ctxScore, playersMap) {
  const playersArray = [].concat(Array.from(playersMap));
  playersArray.sort(function(a, b) {
    return b[1].score - a[1].score;
  });

  ctxScore.fillStyle = "rgb(255, 255, 255)";
  ctxScore.fillRect(0, 220, gameObj.scoreCanvasWidth, 3);

  ctxScore.fillStyle = "rgb(255, 255, 255)";
  ctxScore.font = '16px Verdana';

  for (let i = 0; i < 10; i++) {
    if (!playersArray[i]) return;

    const rank = i + 1;
    ctxScore.fillText(
      `${rank} ${playersArray[i][1].displayName} ${playersArray[i][1].score}`,
      10, 220 + (rank * 24)
    );
  }
}

socket.on('start data', (startObj) => {
  gameObj.fieldWidth = startObj.fieldWidth;
  gameObj.fieldHeight = startObj.fieldHeight;
  gameObj.myPlayerObj = startObj.playerObj;
  gameObj.missileSpeed = startObj.missileSpeed;
});

socket.on('map data', (compressed) => {
  const playersArray = compressed[0];
  const itemsArray = compressed[1];
  const obstacleArray = compressed[2];
  const flyingMissilesArray = compressed[3];

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
    player.deadCount = compressedPlayerData[8];

    gameObj.playersMap.set(player.playerId, player);

    // 自分の情報も更新
    if (player.playerId === gameObj.myPlayerObj.playerId) {
      gameObj.myPlayerObj.x = compressedPlayerData[0];
      gameObj.myPlayerObj.y = compressedPlayerData[1];
      gameObj.myPlayerObj.displayName = compressedPlayerData[3];
      gameObj.myPlayerObj.score = compressedPlayerData[4];
      gameObj.myPlayerObj.isAlive = compressedPlayerData[5];
      gameObj.myPlayerObj.missilesMany = compressedPlayerData[7];
      gameObj.myPlayerObj.deadCount = compressedPlayerData[8];
    }
  }

  gameObj.itemsMap = new Map();
  itemsArray.forEach((compressedItemData, index) => {
    gameObj.itemsMap.set(index, { x: compressedItemData[0], y: compressedItemData[1] });       
  });

  gameObj.obstacleMap = new Map();
  obstacleArray.forEach((compressedObstacleData, index) => {
    gameObj.obstacleMap.set(index, { x: compressedObstacleData[0], y: compressedObstacleData[1] });     
  });

  gameObj.flyingMissilesMap = new Map();
  flyingMissilesArray.forEach((compressedFlyingMissileData, index) => {
    gameObj.flyingMissilesMap.set(index, {
      x: compressedFlyingMissileData[0],
      y: compressedFlyingMissileData[1],
      direction: compressedFlyingMissileData[2],
      emitPlayerId: compressedFlyingMissileData[3]
    });
  });
});

function drawMap(gameObj) {

  // 敵プレイヤーと COM の描画
  for (let [key, tekiPlayerObj] of gameObj.playersMap) {
    if (key === gameObj.myPlayerObj.playerId) { continue; } // 自分は描画しない

    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,
      tekiPlayerObj.x, tekiPlayerObj.y,
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.fieldCanvasWidth, gameObj.fieldCanvasHeight
    );

    if (distanceObj.distanceX <= (gameObj.fieldCanvasWidth / 2) && distanceObj.distanceY <= (gameObj.fieldCanvasHeight / 2)) {

      if (tekiPlayerObj.isAlive === false) {
        drawBom(gameObj.ctxField, distanceObj.drawX, distanceObj.drawY, tekiPlayerObj.deadCount);
        continue;
      }

      const cropPoint  = gameObj.pointByDirection[tekiPlayerObj.direction];
      gameObj.ctxField.save();
      gameObj.ctxField.translate(distanceObj.drawX, distanceObj.drawY);

      gameObj.ctxField.drawImage(
        gameObj.enemyImage,
        cropPoint.x, cropPoint.y,
        gameObj.enemyCellPx, gameObj.enemyCellPx,
        -(gameObj.enemyCellPx / 2), -(gameObj.enemyCellPx / 2),
        gameObj.enemyCellPx, gameObj.enemyCellPx,
      ); // 画像データ、切り抜き左、切り抜き上、幅、幅、表示x、表示y、幅、幅
      
      gameObj.ctxField.restore();

      if (tekiPlayerObj.displayName === 'anonymous') {
        gameObj.ctxField.fillStyle = 'rgba(255, 255, 255, 1)';
        gameObj.ctxField.font = '8px Verdana';
        gameObj.ctxField.textAlign = 'center';
        gameObj.ctxField.fillText('anonymous', distanceObj.drawX, distanceObj.drawY - (gameObj.enemyCellPx / 2) - 4);
      } else if (tekiPlayerObj.displayName) {
        gameObj.ctxField.fillStyle = 'rgba(255, 255, 255, 1)';
        gameObj.ctxField.font = '8px Verdana';
        gameObj.ctxField.textAlign = 'center';
        gameObj.ctxField.fillText(tekiPlayerObj.displayName, distanceObj.drawX, distanceObj.drawY - (gameObj.enemyCellPx / 2) - 4);
      }
    }
  }

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

  // 飛んでいるミサイルの描画
  for (let [missileId, flyingMissile] of gameObj.flyingMissilesMap) {

    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,
      flyingMissile.x, flyingMissile.y,
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.fieldCanvasWidth, gameObj.fieldCanvasHeight
    );

    if (
      distanceObj.distanceX <= (gameObj.fieldCanvasWidth / 2 + 50) &&
      distanceObj.distanceY <= (gameObj.fieldCanvasHeight / 2 + 50)
    ) {

      const drawRadius = gameObj.counter % 8 + 1;
      const clearRadius = drawRadius - 2;

      gameObj.ctxField.fillStyle = 'rgba(255, 0, 0, .5)';
      gameObj.ctxField.beginPath();
      gameObj.ctxField.arc(distanceObj.drawX, distanceObj.drawY, drawRadius, 0, Math.PI * 2, true);
      gameObj.ctxField.fill();
     
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
        movePlayerInClient(gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'left');
      break;
    case 'ArrowUp':
      if (gameObj.myPlayerObj.direction !== 'up') {
        gameObj.myPlayerObj.direction = 'up';
        drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
        movePlayerInClient(gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'up');
      break;
    case 'ArrowDown':
      if (gameObj.myPlayerObj.direction !== 'down') {
        gameObj.myPlayerObj.direction = 'down';
        drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
        movePlayerInClient(gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'down');
      break;
    case 'ArrowRight':
      if (gameObj.myPlayerObj.direction !== 'right') {
        gameObj.myPlayerObj.direction = 'right';
        drawPlayer(gameObj.ctxField, gameObj.myPlayerObj);
        movePlayerInClient(gameObj.myPlayerObj);
      }
      sendChangeDirection(socket, 'right');
      break;
    case ' ': // スペースキー
      if (gameObj.myPlayerObj.missilesMany <= 0) break; // ミサイルのストックが 0
 
      gameObj.myPlayerObj.missilesMany -= 1;
      const missileId = Math.floor(Math.random() * 100000) + ',' + gameObj.myPlayerObj.socketId + ',' + gameObj.myPlayerObj.x + ',' + gameObj.myPlayerObj.y;

      const missileObj = {
        emitPlayerId: gameObj.myPlayerObj.playerId,
        x: gameObj.myPlayerObj.x,
        y: gameObj.myPlayerObj.y,
        direction: gameObj.myPlayerObj.direction,
        id: missileId
      };
      gameObj.flyingMissilesMap.set(missileId, missileObj);
      sendMissileEmit(socket, gameObj.myPlayerObj.direction);
      break;
  }
});

function sendChangeDirection(socket, direction) {
  socket.emit('change direction', direction);
}

function sendMissileEmit(socket, direction) {
  socket.emit('missile emit', direction);
}

function movePlayerInClient(myPlayerObj) {
  // 移動
  switch (myPlayerObj.direction) {
    case 'left':
      myPlayerObj.x -= gameObj.movingDistance;
      break;
    case 'up':
      myPlayerObj.y -= gameObj.movingDistance;
      break;
    case 'down':
      myPlayerObj.y += gameObj.movingDistance;
      break;
    case 'right':
      myPlayerObj.x += gameObj.movingDistance;
      break;
  }
  if (myPlayerObj.x > gameObj.fieldWidth) myPlayerObj.x -= gameObj.fieldWidth;
  if (myPlayerObj.x < 0) myPlayerObj.x += gameObj.fieldWidth;
  if (myPlayerObj.y < 0) myPlayerObj.y += gameObj.fieldHeight;
  if (myPlayerObj.y > gameObj.fieldHeight) myPlayerObj.y -= gameObj.fieldHeight;
}

function moveFlyingMissileInClient(myPlayerObj, flyingMissilesMap) {
  if (myPlayerObj.isAlive === false) {
    if (myPlayerObj.deadCount < 60) {
      myPlayerObj.deadCount += 1;
    }
    return;
  }

  // 飛んでいるミサイルの移動
  for (let [missileId, flyingMissile] of flyingMissilesMap) {

    switch (flyingMissile.direction) {
      case 'left':
        flyingMissile.x -= gameObj.missileSpeed;
        break;
      case 'up':
        flyingMissile.y -= gameObj.missileSpeed;
        break;
      case 'down':
        flyingMissile.y += gameObj.missileSpeed;
        break;
      case 'right':
        flyingMissile.x += gameObj.missileSpeed;
        break;
    }
    if (flyingMissile.x > gameObj.fieldWidth) flyingMissile.x -= gameObj.fieldWidth;
    if (flyingMissile.x < 0) flyingMissile.x += gameObj.fieldWidth;
    if (flyingMissile.y < 0) flyingMissile.y += gameObj.fieldHeight;
    if (flyingMissile.y > gameObj.fieldHeight) flyingMissile.y -= gameObj.fieldHeight;
  }

  myPlayerObj.aliveTime.clock += 1;
  if (myPlayerObj.aliveTime.clock === 30) {
    myPlayerObj.aliveTime.clock = 0;
    myPlayerObj.aliveTime.seconds += 1;
  }
}
