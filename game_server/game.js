'use strict';
const crypto = require('crypto');
	
const gameObj = {
  playersMap: new Map(),
  itemsMap: new Map(),
  COMMap: new Map(),
  obstacleMap: new Map(),
  flyingMissilesMap: new Map(),
  addingCOMPlayerNum: 9,
  missileAliveFlame: 180,
  missileSpeed: 3,
  missileWidth: 30,
  missileHeight: 30,
  directions: ['left', 'up', 'down', 'right'],
  fieldWidth: 1000,
  fieldHeight: 1000,
  itemTotal: 30,
  obstacleTotal: 15,
  movingDistance: 10,
  itemRadius: 4,
  playerImageWidth: 32,
  obstacleImageWidth: 32
};

function init() {
  for (let i = 0; i < gameObj.itemTotal; i++) {
    addItem();
  }
  for (let o = 0; o < gameObj.obstacleTotal; o++) {
    addObstacle();
  }
}
init(); // 初期化（初期化はサーバー起動時に行う

const gameTicker = setInterval(() => {
  COMMoveDecision(gameObj.COMMap); // COM の行動選択
  const playersAndCOMMap = new Map(Array.from(gameObj.playersMap).concat(Array.from(gameObj.COMMap)));
  moveMissile(gameObj.flyingMissilesMap);
  checkGetItem(playersAndCOMMap, gameObj.itemsMap, gameObj.flyingMissilesMap, gameObj.obstacleMap); // 当たり判定
  addCOM();
}, 33);

function COMMoveDecision(COMMap) {
  for (let [COMId, COMObj] of COMMap) {

    switch (COMObj.level) {
      case 1:
        if (Math.floor(Math.random() * 10) === 1) {
          movePlayer(COMObj, gameObj.obstacleMap);
        }
        if (Math.floor(Math.random() * 60) === 1) {
          COMObj.direction = gameObj.directions[Math.floor(Math.random() * gameObj.directions.length)];
        }
        if (COMObj.missilesMany > 0 && Math.floor(Math.random() * 90) === 1) {
          missileEmit(COMObj.playerId, COMObj.direction);
        }
        break;
      case 2:
      case 3:
    }
  }
}

function movePlayer(player, obstacleMap) {
  if (player.isAlive === false) return;

  switch (player.direction) {
    case 'left':
      for (let [obstacleId, obstacleObj] of obstacleMap) {
        const distanceObj = calculationBetweenTwoPoints(
          player.x - gameObj.movingDistance, player.y, obstacleObj.x, obstacleObj.y, gameObj.fieldWidth, gameObj.fieldHeight
        )
        if (
          distanceObj.distanceX <= (gameObj.obstacleImageWidth / 4 + gameObj.playerImageWidth  / 4) &&
          distanceObj.distanceY <= (gameObj.obstacleImageWidth / 5 + gameObj.playerImageWidth / 5)
        ) {
          return;
        }
      }
      player.x -= gameObj.movingDistance;
      break;
    case 'up':
      for (let [obstacleId, obstacleObj] of obstacleMap) {
        const distanceObj = calculationBetweenTwoPoints(
          player.x, player.y - gameObj.movingDistance, obstacleObj.x, obstacleObj.y, gameObj.fieldWidth, gameObj.fieldHeight
        )
        if (
          distanceObj.distanceX <= (gameObj.obstacleImageWidth / 4 + gameObj.playerImageWidth  / 4) &&
          distanceObj.distanceY <= (gameObj.obstacleImageWidth / 5 + gameObj.playerImageWidth / 5)
        ) {
          return;
        }
      }
      player.y -= gameObj.movingDistance;
      break;
    case 'down':
      for (let [obstacleId, obstacleObj] of obstacleMap) {
        const distanceObj = calculationBetweenTwoPoints(
          player.x, player.y + gameObj.movingDistance, obstacleObj.x, obstacleObj.y, gameObj.fieldWidth, gameObj.fieldHeight
        )
        if (
          distanceObj.distanceX <= (gameObj.obstacleImageWidth / 4 + gameObj.playerImageWidth  / 4) &&
          distanceObj.distanceY <= (gameObj.obstacleImageWidth / 5 + gameObj.playerImageWidth / 5)
        ) {
          return;
        }
      }
      player.y += gameObj.movingDistance;
      break;
    case 'right':
      for (let [obstacleId, obstacleObj] of obstacleMap) {
        const distanceObj = calculationBetweenTwoPoints(
          player.x + gameObj.movingDistance, player.y, obstacleObj.x, obstacleObj.y, gameObj.fieldWidth, gameObj.fieldHeight
        )
        if (
          distanceObj.distanceX <= (gameObj.obstacleImageWidth / 4 + gameObj.playerImageWidth  / 4) &&
          distanceObj.distanceY <= (gameObj.obstacleImageWidth / 5 + gameObj.playerImageWidth / 5)
        ) {
          return;
        }
      }
      player.x += gameObj.movingDistance;
      break;
  }
  if (player.x > gameObj.fieldWidth) player.x -= gameObj.fieldWidth;
  if (player.x < 0) player.x += gameObj.fieldWidth;
  if (player.y < 0) player.y += gameObj.fieldHeight;
  if (player.y > gameObj.fieldHeight) player.y -= gameObj.fieldHeight;
}

function checkGetItem(playersMap, itemsMap, flyingMissilesMap, obstacleMap) {

  // 弾と障害物の当たり判定
  for (let [obstacleId, obstacleObj] of obstacleMap) {
    for (let [missileId, flyingMissile] of flyingMissilesMap) {

      const distanceObj = calculationBetweenTwoPoints(
        obstacleObj.x, obstacleObj.y, flyingMissile.x, flyingMissile.y, gameObj.fieldWidth, gameObj.fieldHeight
      );

      if (
        distanceObj.distanceX <= (gameObj.obstacleImageWidth / 4 + gameObj.missileWidth / 4) &&
        distanceObj.distanceY <= (gameObj.obstacleImageWidth / 4 + gameObj.missileHeight / 4)
      ) {
        flyingMissilesMap.delete(missileId); // ミサイルの削除
      }
    }
  }

  // プレイヤーの当たり判定
  for (let [hashKey, playerObj] of playersMap) {

    if (playerObj.isAlive === false) {
      if (playerObj.deadCount < 70) {
        playerObj.deadCount += 1;
      } else {
        gameObj.playersMap.delete(hashKey);
        gameObj.COMMap.delete(hashKey);
      }
      continue;
    }

    playerObj.aliveTime.clock += 1;
    if (playerObj.aliveTime.clock === 30) {
      playerObj.aliveTime.clock = 0;
      playerObj.aliveTime.seconds += 1;
    }

    // アイテムのミサイル（赤丸）
    for (let [itemKey, itemObj] of itemsMap) {

      const distanceObj = calculationBetweenTwoPoints(
        playerObj.x, playerObj.y, itemObj.x, itemObj.y, gameObj.fieldWidth, gameObj.fieldHeight
      );

      if (
        distanceObj.distanceX <= (gameObj.playerImageWidth / 2 + gameObj.itemRadius) &&
        distanceObj.distanceY <= (gameObj.playerImageWidth / 2 + gameObj.itemRadius)
      ) {
        gameObj.itemsMap.delete(itemKey);
        playerObj.missilesMany = playerObj.missilesMany > 5 ? 6 : playerObj.missilesMany + 1;
        addItem();
      }
    }

    // 撃ち放たれているミサイル
    for (let [missileId, flyingMissile] of flyingMissilesMap) {

      const distanceObj = calculationBetweenTwoPoints(
        playerObj.x, playerObj.y, flyingMissile.x, flyingMissile.y, gameObj.fieldWidth, gameObj.fieldHeight
      );

      if (
        distanceObj.distanceX <= (gameObj.playerImageWidth / 2 + gameObj.missileWidth / 2) &&
        distanceObj.distanceY <= (gameObj.playerImageWidth / 2 + gameObj.missileHeight / 2) &&
        playerObj.playerId !== flyingMissile.emitPlayerId
      ) {
        playerObj.isAlive = false;

        // 得点の更新
        if (playersMap.has(flyingMissile.emitPlayerSocketId)) {
          const emitPlayer = playersMap.get(flyingMissile.emitPlayerSocketId);
          emitPlayer.killCount += 1;
          playersMap.set(flyingMissile.emitPlayerSocketId, emitPlayer);
        }

        flyingMissilesMap.delete(missileId); // ミサイルの削除
      }
    }
  }
}

function moveMissile(flyingMissilesMap) { // ミサイルの移動
  for (let [missileId, flyingMissile] of flyingMissilesMap) {
    const missile = flyingMissile;

    if (missile.aliveFlame === 0) {
      flyingMissilesMap.delete(missileId);
      continue;
    }

    flyingMissile.aliveFlame -= 1;

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
    direction: 'down',
    missilesMany: 0,
    aliveTime: { 'clock': 0, 'seconds': 0 },
    deadCount: 0,
    killCount: 0
  };
  gameObj.playersMap.set(socketId, playerObj);

  const startObj = {
    playerObj: playerObj,
    fieldWidth: gameObj.fieldWidth,
    fieldHeight: gameObj.fieldHeight,
    missileSpeed: gameObj.missileSpeed
  };
  return startObj;
}

function getMapData() {
  const playersArray = [];
  const itemsArray = [];
  const flyingMissilesArray = [];
  const obstacleArray = [];
  const playersAndCOMMap = new Map(Array.from(gameObj.playersMap).concat(Array.from(gameObj.COMMap)));
    
  for (let [socketId, plyer] of playersAndCOMMap) {
    const playerDataForSend = [];

    playerDataForSend.push(plyer.x);
    playerDataForSend.push(plyer.y);
    playerDataForSend.push(plyer.playerId);
    playerDataForSend.push(plyer.displayName);
    playerDataForSend.push(plyer.aliveTime.seconds);
    playerDataForSend.push(plyer.killCount);
    playerDataForSend.push(plyer.isAlive);
    playerDataForSend.push(plyer.direction);
    playerDataForSend.push(plyer.missilesMany);
    playerDataForSend.push(plyer.deadCount);

    playersArray.push(playerDataForSend);
  }

  for (let [id, item] of gameObj.itemsMap) {
    const itemDataForSend = [];

    itemDataForSend.push(item.x);
    itemDataForSend.push(item.y);

    itemsArray.push(itemDataForSend);
  }
    
  for (let [id, obstacle] of gameObj.obstacleMap) {
    const obstacleDataForSend = [];

    obstacleDataForSend.push(obstacle.x);
    obstacleDataForSend.push(obstacle.y);

    obstacleArray.push(obstacleDataForSend);
  }
    
  for (let [id, flyingMissile] of gameObj.flyingMissilesMap) {
    const flyingMissileDataForSend = [];

    flyingMissileDataForSend.push(flyingMissile.x);
    flyingMissileDataForSend.push(flyingMissile.y);
    flyingMissileDataForSend.push(flyingMissile.direction);
    flyingMissileDataForSend.push(flyingMissile.emitPlayerId);

    flyingMissilesArray.push(flyingMissileDataForSend);
  }

  return [playersArray, itemsArray, obstacleArray, flyingMissilesArray];
}

function updatePlayerDirection(socketId, direction) {
  const playerObj = gameObj.playersMap.get(socketId);
  playerObj.direction = direction;
  movePlayer(playerObj, gameObj.obstacleMap);
}

function missileEmit(socketId, direction) {
  const playersAndCOMMap = new Map(Array.from(gameObj.playersMap).concat(Array.from(gameObj.COMMap)));
  if (!playersAndCOMMap.has(socketId)) return;

  let emitPlayerObj = playersAndCOMMap.get(socketId);

  if (emitPlayerObj.missilesMany <= 0) return; // 撃てないやん
  if (emitPlayerObj.isAlive === false) return; // 死んでるやんけ

  emitPlayerObj.missilesMany -= 1;
  const missileId = Math.floor(Math.random() * 100000) + ',' + socketId + ',' + emitPlayerObj.x + ',' + emitPlayerObj.y;

  const missileObj = {
    emitPlayerId: emitPlayerObj.playerId,
    emitPlayerSocketId: socketId,
    x: emitPlayerObj.x,
    y: emitPlayerObj.y,
    aliveFlame: gameObj.missileAliveFlame,
    direction: direction,
    id: missileId
  };
  gameObj.flyingMissilesMap.set(missileId, missileObj);
}

function disconnect(socketId) {
  gameObj.playersMap.delete(socketId);
}

function setElementsPosition() {
  const elementX = Math.floor(Math.random() * gameObj.fieldWidth);
  const elementY = Math.floor(Math.random() * gameObj.fieldHeight);
  const elementKey = `${elementX},${elementY}`;

  if (gameObj.obstacleMap.has(elementKey) || gameObj.itemsMap.has(elementKey)) {
    return setElementsPosition(); // 場所が重複した場合は作り直し
  }
  
  const elementObj = {
    x: elementX,
    y: elementY,
  };
  const returnObj = {
    elementKey: elementKey,
    elementObj: elementObj
  };
  return returnObj;
}

function addItem() {
  const element = setElementsPosition();
  gameObj.itemsMap.set(element.elementKey, element.elementObj);
}

function addObstacle() {
  const element = setElementsPosition();
  gameObj.obstacleMap.set(element.elementKey, element.elementObj);
}

function addCOM() {
  if (gameObj.playersMap.size + gameObj.COMMap.size < gameObj.addingCOMPlayerNum) {
    const addMany = gameObj.addingCOMPlayerNum - gameObj.playersMap.size - gameObj.COMMap.size;

    for (let i = 0; i < addMany; i++) {

      const playerX = Math.floor(Math.random() * gameObj.fieldWidth);
      const playerY = Math.floor(Math.random() * gameObj.fieldHeight);
      const level = Math.floor(Math.random() * 1) + 1;
      const id = Math.floor(Math.random() * 100000) + ',' + playerX + ',' + playerY + ',' + level;
      const playerObj = {
        x: playerX,
        y: playerY,
        isAlive: true,
        deadCount: 0,
        direction: 'down',
        missilesMany: 0,
        airTime: 99,
        aliveTime: { 'clock': 0, 'seconds': 0 },
        killCount: 0,
        level: level,
        displayName: 'Lv' + level,
        thumbUrl: 'images/anonymouse.jpg',
        playerId: id
      };
      gameObj.COMMap.set(id, playerObj);
    }
  }
}

function calculationBetweenTwoPoints(pX, pY, oX, oY, gameWidth, gameHeight) {
  let distanceX = 99999999;
  let distanceY = 99999999;

  if (pX <= oX) {
    // 右から
    distanceX = oX - pX;
    // 左から
    let tmpDistance = pX + gameWidth - oX;
    if (distanceX > tmpDistance) {
      distanceX = tmpDistance;
    }
  } else {
    // 右から
    distanceX = pX - oX;
    // 左から
    let tmpDistance = oX + gameWidth - pX;
    if (distanceX > tmpDistance) {
      distanceX = tmpDistance;
    }
  }

  if (pY <= oY) {
    // 下から
    distanceY = oY - pY;
    // 上から
    let tmpDistance = pY + gameHeight - oY;
    if (distanceY > tmpDistance) {
      distanceY = tmpDistance;
    }
  } else {
    // 上から
    distanceY = pY - oY;
    // 下から
    let tmpDistance = oY + gameHeight - pY;
    if (distanceY > tmpDistance) {
      distanceY = tmpDistance;
    }
  }

  return {
    distanceX,
    distanceY
  };
}

module.exports = {
  newConnection,
  getMapData,
  updatePlayerDirection,
  missileEmit,
  disconnect
};
