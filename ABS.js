(function() {

    Scene_Boot.prototype.start = function() {
        Scene_Base.prototype.start.call(this);
        SoundManager.preloadImportantSounds();
        if (DataManager.isBattleTest()) {
            DataManager.setupBattleTest();
            SceneManager.goto(Scene_Battle);
        } else {
            this.checkPlayerLocation();
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
        }
        this.updateDocumentTitle();
        $gamePlayer._currentSpell = 9;
    };

    var _GameEvent_initialize = Game_Event.prototype.initialize;
    Game_Event.prototype.initialize = function(mapId, eventId) {
        _GameEvent_initialize.call(this, mapId, eventId);

        if (this.isEnemy()) {
            this._eventEnemyId = Number($dataMap.events[this._eventId].meta.enemy);
            this._eventEnemyHp = $dataEnemies[this._eventEnemyId].params[0];
            this._eventEnemyOrigHp = this._eventEnemyHp;
            this._eventEnemyMp = $dataEnemies[this._eventEnemyId].params[1];
            this._eventEnemyAlive = true;
            this._eventEnemyTouching = 0;
            $dataMap.events[this._eventId].obj = this;
        }
    };

    Game_Event.prototype.isEnemy = function() {
        return $dataMap.events[this._eventId].meta.enemy;
    };

    var _GameEvent_update = Game_Event.prototype.update;
    Game_Event.prototype.update = function() {
        _GameEvent_update.call(this);

        this.updateAction();
        if (this.isEnemy()) {
            if (this._eventEnemyAlive) {
                if (this._eventEnemyHp <= 0) {
                    AudioManager.playSe({
                        name: 'MDSFX_FoeDown_1_0',
                        pan: 0,
                        pitch: 100,
                        volume: 90
                    });
                    
                    $gameMap.eraseEvent(this._eventId);
                    this.erase();
                    this._eventEnemyAlive = false;
                }
            }
        }

        $dataMap.events[this._eventId].obj = this;
    };

    Game_Event.prototype.updateAction = function() {
        if (this.isEnemy()) {
            if (this._eventEnemyAlive) {
                var sx = Math.abs(this.deltaXFrom($gamePlayer.x));
                var sy = Math.abs(this.deltaYFrom($gamePlayer.y));
                if ((sx + sy) == 1) {
                    this._eventEnemyTouching += 1;
                    if (Input.isTriggered('ok')) {  
                        this.requestAnimation(6);
                        AudioManager.playSe({
                            name: 'MDSFX_FoeAtk_1_0',
                            pan: 0,
                            pitch: 100,
                            volume: 55
                        });
                        this.setMoveSpeed(6);
                        this.moveAwayFromPlayer();
                        this.moveAwayFromPlayer();
                        this.setMoveSpeed(4);
                        this.setTransparent(true);
                        this.setTransparent(false);
                        this.setTransparent(true);
                        this.setTransparent(false);
                        this._eventEnemyHp -= 100;
                        $dataMap.events[this._eventId]._eventEnemyHp -= 100;
                    } else {
                        // enemy reaction time
                        if (this._eventEnemyTouching >= 20) {
                            $gamePlayer.requestAnimation(1);
                            $gamePlayer.setTransparent(true);
                            $gamePlayer.setTransparent(false);
                            $gamePlayer.setTransparent(true);
                            $gamePlayer.setTransparent(false);
                            $gamePlayer.moveBackward();
                            $gamePlayer.moveBackward();
                            $gameActors.actor(1).gainHp(-50);
                        }
                    }
                } else {
                    this._eventEnemyTouching = 0;
                }
            }
        }
    };

    var _SceneMap_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _SceneMap_start.call(this);
        this._healthBar = new HUD(100,100);
        this.addWindow(this._healthBar);
    };

    var _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _SceneMap_update.call(this);

        if (Input.isTriggered('shift')) {
            var _skill = $dataSkills[$gamePlayer._currentSpell];
            if (_skill.meta) {
                if (_skill.meta.heal) {
                    $gameActors.actor(1).gainHp(Number(_skill.meta.heal));
                    $gamePlayer.requestAnimation(_skill.animationId);
                }

                if (_skill.meta.fireball) {
                    var _eid = -1;
                    switch(Number($gamePlayer._direction)) {
                        case 2:
                            // down
                            _eid = $gameMap.eventIdXy($gamePlayer.x, $gamePlayer.y+2);
                            break;
                        case 6:
                            // right
                            _eid = $gameMap.eventIdXy($gamePlayer.x+2, $gamePlayer.y); 
                            break;
                        case 8:
                            // up
                            _eid = $gameMap.eventIdXy($gamePlayer.x, $gamePlayer.y-2);
                            break;
                        case 4:
                            // left
                            _eid = $gameMap.eventIdXy($gamePlayer.x-2, $gamePlayer.y); 
                            break;
                    }
                    
                    if (_eid > 0) {
                       var _ev = $dataMap.events[_eid];
                       if (_ev.meta.enemy) {
                            if (_ev.obj !== 'undefined') {
                                _ev.obj.requestAnimation(_skill.animationId);
                                _ev.obj._eventEnemyHp -= 100;
                            }
                       }
                    }
                }
            }
        }

        // cycle through skills
        if (Input.isTriggered('pagedown')) {

        } else if (Input.isTriggered('pageup')) {

        }

        this._healthBar.refresh();
    };

    function HUD() {
        this.initialize.apply(this, arguments);
    }

    // HUD

    HUD.prototype = Object.create(Window_Base.prototype);
    HUD.prototype.constructor = HUD;


    HUD.prototype.initialize = function(x, y) {
        Window_Base.prototype.initialize.call(this, 0, 0, this.windowWidth(), this.windowHeight());
        this._value = -1;
        this.refresh();
        this.opacity = 0;
    };

    HUD.prototype.refresh = function(){

        this.contents.clear();
        this.drawActorHp($gameParty.leader(), 0, 0, 200)
    };

    HUD.prototype.windowWidth = function(){
        return 240;
    };

    HUD.prototype.windowHeight = function(){
        return 80;
    };

})();



