'use strict';
const crypto = require('crypto');
	
const gameObj = {
  playersMap: new Map(),
  itemsMap: new Map(),
  gasMap: new Map(),
  fieldWidth: 1000,
  fieldHeight: 1000,
  itemTotal: 15,
  gasTotal: 10
};

function init() {
  for (let i = 0; i < gameObj.itemTotal; i++) {
    addItem();
  }
  for (let a = 0; a < gameObj.gasTotal; a++) {
    addGas();
  }
}
init(); // 初期化（初期化はサーバー起動時に行う

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
    direction: 'right',
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
    
  return [playersArray, itemsArray, gasArray];
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

module.exports = {
  newConnection,
  getMapData,
  disconnect
};
