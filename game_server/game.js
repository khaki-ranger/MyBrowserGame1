'use strict';
const crypto = require('crypto');
	
const gameObj = {
  playersMap: new Map(),
  itemsMap: new Map(),
  gasMap: new Map(),
  obstacleMap: new Map(),
  fieldWidth: 1000,
  fieldHeight: 1000,
  itemTotal: 15,
  gasTotal: 10,
  obstacleTotal: 30,
  distance: 10
};

function init() {
  for (let i = 0; i < gameObj.itemTotal; i++) {
    addItem();
  }
  for (let a = 0; a < gameObj.gasTotal; a++) {
    addGas();
  }
  for (let o = 0; o < gameObj.obstacleTotal; o++) {
    addObstacle();
  }
}
init(); // 初期化（初期化はサーバー起動時に行う

const gameTicker = setInterval(() => {
}, 33);

function movePlayers(playersMap) {
  for (let [playerId, player] of playersMap) {

    if (player.isAlive === false) {
      continue;
    }

    switch (player.direction) {
      case 'left':
        player.x -= gameObj.distance;
        break;
      case 'up':
        player.y -= gameObj.distance;
        break;
      case 'down':
        player.y += gameObj.distance;
        break;
      case 'right':
        player.x += gameObj.distance;
        break;
    }
    if (player.x > gameObj.fieldWidth) player.x -= gameObj.fieldWidth;
    if (player.x < 0) player.x += gameObj.fieldWidth;
    if (player.y < 0) player.y += gameObj.fieldHeight;
    if (player.y > gameObj.fieldHeight) player.y -= gameObj.fieldHeight;
  }
}

function newConnection(socketId, displayName, thumbUrl) {
  const playerX = Math.floor(Math.random() * gameObj.fieldWidth);
  const playerY = Math.floor(Math.random() * gameObj.fieldHeight);
  const playerId = crypto.createHash('sha1').update(socketId).digest('hex');
    
  const playerObj = {
    x: playerX,
    y: playerY,
    playerId: playerId,
    displayName: displayName,
    thumbUrl: thumbUrl,
    isAlive: true,
    direction: 'left',
    score: 0
  };
  gameObj.playersMap.set(socketId, playerObj);

  const startObj = {
    playerObj: playerObj,
    fieldWidth: gameObj.fieldWidth,
    fieldHeight: gameObj.fieldHeight
  };
  return startObj;
}

function getMapData() {
  const playersArray = [];
  const itemsArray = [];
  const gasArray = [];
  const obstacleArray = [];
    
  for (let [socketId, plyer] of gameObj.playersMap) {
    const playerDataForSend = [];

    playerDataForSend.push(plyer.x);
    playerDataForSend.push(plyer.y);
    playerDataForSend.push(plyer.playerId);
    playerDataForSend.push(plyer.displayName);
    playerDataForSend.push(plyer.score);
    playerDataForSend.push(plyer.isAlive);
    playerDataForSend.push(plyer.direction);

    playersArray.push(playerDataForSend);
  }

  for (let [id, item] of gameObj.itemsMap) {
    const itemDataForSend = [];

    itemDataForSend.push(item.x);
    itemDataForSend.push(item.y);

    itemsArray.push(itemDataForSend);
  }
    
  for (let [id, gas] of gameObj.gasMap) {
    const gasDataForSend = [];

    gasDataForSend.push(gas.x);
    gasDataForSend.push(gas.y);

    gasArray.push(gasDataForSend);
  }
    
  for (let [id, obstacle] of gameObj.obstacleMap) {
    const obstacleDataForSend = [];

    obstacleDataForSend.push(obstacle.x);
    obstacleDataForSend.push(obstacle.y);

    obstacleArray.push(obstacleDataForSend);
  }
    
  return [playersArray, itemsArray, gasArray, obstacleArray];
}

function updatePlayerDirection(socketId, direction) {
  const playerObj = gameObj.playersMap.get(socketId);
  playerObj.direction = direction;
  movePlayers(gameObj.playersMap);
}

function disconnect(socketId) {
  gameObj.playersMap.delete(socketId);
}

function addItem() {
  const itemX = Math.floor(Math.random() * gameObj.fieldWidth);
  const itemY = Math.floor(Math.random() * gameObj.fieldHeight);
  const itemKey = `${itemX},${itemY}`;

  if (gameObj.itemsMap.has(itemKey)) { // アイテムの位置が被ってしまった場合は
    return addItem(); // 場所が重複した場合は作り直し
  }

  const itemObj = {
    x: itemX,
    y: itemY,
  };
  gameObj.itemsMap.set(itemKey, itemObj);
}

function addGas() {
  const gasX = Math.floor(Math.random() * gameObj.fieldWidth);
  const gasY = Math.floor(Math.random() * gameObj.fieldHeight);
  const gasKey = `${gasX},${gasY}`;

  if (gameObj.gasMap.has(gasKey)) { // アイテムの位置が被ってしまった場合は
    return addGas(); // 場所が重複した場合は作り直し
  }

  const gasObj = {
    x: gasX,
    y: gasY,
  };
  gameObj.gasMap.set(gasKey, gasObj);
}

function addObstacle() {
  const obstacleX = Math.floor(Math.random() * gameObj.fieldWidth);
  const obstacleY = Math.floor(Math.random() * gameObj.fieldHeight);
  const obstacleKey = `${obstacleX},${obstacleY}`;

  if (gameObj.obstacleMap.has(obstacleKey)) { // アイテムの位置が被ってしまった場合は
    return addObstacle(); // 場所が重複した場合は作り直し
  }

  const obstacleObj = {
    x: obstacleX,
    y: obstacleY,
  };
  gameObj.obstacleMap.set(obstacleKey, obstacleObj);
}

module.exports = {
  newConnection,
  getMapData,
  updatePlayerDirection,
  disconnect
};
