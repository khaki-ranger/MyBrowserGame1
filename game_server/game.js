'use strict';
const crypto = require('crypto');
	
const gameObj = {
  playersMap: new Map(),
  itemsMap: new Map(),
  gasMap: new Map(),
  COMMap: new Map(),
  addingCOMPlayerNum: 9,
  obstacleMap: new Map(),
  flyingMissilesMap: new Map(),
  missileAliveFlame: 180,
  missileSpeed: 3,
  missileWidth: 30,
  missileHeight: 30,
  directions: ['left', 'up', 'down', 'right'],
  fieldWidth: 1000,
  fieldHeight: 1000,
  itemTotal: 15,
  gasTotal: 10,
  obstacleTotal: 30,
  movingDistance: 10,
  gasTotal: 10,
  itemRadius: 4,
  gasRadius: 6,
  addGasTime: 30,
  itemPoint: 3,
  killPoint: 500,
  playerImageWidth: 48
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
  COMMoveDecision(gameObj.COMMap); // COM の行動選択
  const playersAndCOMMap = new Map(Array.from(gameObj.playersMap).concat(Array.from(gameObj.COMMap)));
  moveMissile(gameObj.flyingMissilesMap);
  checkGetItem(playersAndCOMMap, gameObj.itemsMap, gameObj.gasMap, gameObj.flyingMissilesMap); // アイテムの取得チェック
  addCOM();
}, 33);

function COMMoveDecision(COMMap) {
  for (let [COMId, COMObj] of COMMap) {

    switch (COMObj.level) {
      case 1:
        if (Math.floor(Math.random() * 10) === 1) {
          movePlayer(COMObj);
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

function movePlayer(player) {
  if (player.isAlive === false) return;

  switch (player.direction) {
    case 'left':
      player.x -= gameObj.movingDistance;
      break;
    case 'up':
      player.y -= gameObj.movingDistance;
      break;
    case 'down':
      player.y += gameObj.movingDistance;
      break;
    case 'right':
      player.x += gameObj.movingDistance;
      break;
  }
  if (player.x > gameObj.fieldWidth) player.x -= gameObj.fieldWidth;
  if (player.x < 0) player.x += gameObj.fieldWidth;
  if (player.y < 0) player.y += gameObj.fieldHeight;
  if (player.y > gameObj.fieldHeight) player.y -= gameObj.fieldHeight;
}

function checkGetItem(playersMap, itemsMap, gasMap, flyingMissilesMap) {
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
      decreaseGas(playerObj);
      playerObj.score += 1;
    }

    // アイテムのミサイル（赤丸）
    for (let [itemKey, itemObj] of itemsMap) {

      const distanceObj = calculationBetweenTwoPoints(
        playerObj.x, playerObj.y, itemObj.x, itemObj.y, gameObj.fieldWidth, gameObj.fieldHeight
      );

      if (
        distanceObj.distanceX <= (gameObj.playerImageWidth / 2 + gameObj.itemRadius) &&
        distanceObj.distanceY <= (gameObj.playerImageWidth / 2 + gameObj.itemRadius)
      ) { // got item!

        gameObj.itemsMap.delete(itemKey);
        playerObj.missilesMany = playerObj.missilesMany > 5 ? 6 : playerObj.missilesMany + 1;
        playerObj.score += gameObj.itemPoint;
        addItem();
      }
    }

    // アイテムの空気（青丸）
    for (let [gasKey, gasObj] of gasMap) {

      const distanceObj = calculationBetweenTwoPoints(
        playerObj.x, playerObj.y, gasObj.x, gasObj.y, gameObj.fieldWidth, gameObj.fieldHeight
      );

      if (
        distanceObj.distanceX <= (gameObj.playerImageWidth / 2 + gameObj.gasRadius) &&
        distanceObj.distanceY <= (gameObj.playerImageWidth / 2 + gameObj.gasRadius)
      ) { // got gas!

        gameObj.gasMap.delete(gasKey);
        if (playerObj.gasTime + gameObj.addGasTime > 99) {
          playerObj.gasTime = 99;
        } else {
          playerObj.gasTime += gameObj.addGasTime;
        }
        playerObj.score += gameObj.itemPoint;
        addGas();
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
          emitPlayer.score += gameObj.killPoint;
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

function decreaseGas(playerObj) {
  playerObj.gasTime -= 1;
  if (playerObj.gasTime === 0) {
    playerObj.isAlive = false;
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
    missilesMany: 0,
    gasTime: 99,
    aliveTime: { 'clock': 0, 'seconds': 0 },
    deadCount: 0,
    score: 0
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
  const gasArray = [];
  const flyingMissilesArray = [];
  const obstacleArray = [];
  const playersAndCOMMap = new Map(Array.from(gameObj.playersMap).concat(Array.from(gameObj.COMMap)));
    
  for (let [socketId, plyer] of playersAndCOMMap) {
    const playerDataForSend = [];

    playerDataForSend.push(plyer.x);
    playerDataForSend.push(plyer.y);
    playerDataForSend.push(plyer.playerId);
    playerDataForSend.push(plyer.displayName);
    playerDataForSend.push(plyer.score);
    playerDataForSend.push(plyer.isAlive);
    playerDataForSend.push(plyer.direction);
    playerDataForSend.push(plyer.missilesMany);
    playerDataForSend.push(plyer.gasTime);
    playerDataForSend.push(plyer.deadCount);

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
    
  for (let [id, flyingMissile] of gameObj.flyingMissilesMap) {
    const flyingMissileDataForSend = [];

    flyingMissileDataForSend.push(flyingMissile.x);
    flyingMissileDataForSend.push(flyingMissile.y);
    flyingMissileDataForSend.push(flyingMissile.direction);
    flyingMissileDataForSend.push(flyingMissile.emitPlayerId);

    flyingMissilesArray.push(flyingMissileDataForSend);
  }

  return [playersArray, itemsArray, gasArray, obstacleArray, flyingMissilesArray];
}

function updatePlayerDirection(socketId, direction) {
  const playerObj = gameObj.playersMap.get(socketId);
  playerObj.direction = direction;
  movePlayer(playerObj);
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
        direction: 'right',
        missilesMany: 0,
        airTime: 99,
        aliveTime: { 'clock': 0, 'seconds': 0 },
        score: 0,
        level: level,
        displayName: 'COM',
        thumbUrl: 'COM',
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
