(function() {

    /*Scene_Boot.prototype.start = function() {
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
        $gamePlayer._currentSpell = 8;
    };*/

    var ABS = ABS || {};
    ABS.Player_Spells = {
        all: ['heal', 'fireball'],
        known: []
    };

    ABS.Projectiles = [];

    Sprite.prototype.createProjectile = function(x, y) {
        var _img = ImageManager.loadPicture("projectile");
        var _sprite = new Sprite(this._img);
        _sprite.x = x;
        _sprite.y = y;
        this.addChild(_sprite);
        ABS.Projectiles.push(_sprite);
    };

    var GamePlayer_initMembers = Game_Player.prototype.initMembers;
    Game_Player.prototype.initMembers = function() {
        GamePlayer_initMembers.call(this);

        this._currentSpell = 0;
        this._skillId = $gameActors.actor(1)._skills[this._currentSpell];
        this._immunity = 60;
        ABS.Player_Spells.known = ['heal', 'fireball'];
    };

    var _GameEvent_initialize = Game_Event.prototype.initialize;
    Game_Event.prototype.initialize = function(mapId, eventId) {
        _GameEvent_initialize.call(this, mapId, eventId);

        if (this.isEnemy()) {
            this._eventEnemyId = Number($dataMap.events[this._eventId].meta.enemy);

            var _enemy = $dataEnemies[this._eventEnemyId];
            this._eventEnemyHp = _enemy.params[0];
            this._eventEnemyMp = _enemy.params[1];
            this._eventEnemyAlive = true;
            this._eventEnemyTouching = 0;

            // is this enemy a prop?
            // props cannot hurt the player, but the player can
            // hurt them
            if (_enemy.meta.prop)
                this._prop = true;

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
                    
                    if ($dataMap.events[this._eventId].pages.length > 1) {
                        $dataMap.events[this._eventId].meta = {};
                        var _mapId = $gameMap._mapId;
                        $gameSelfSwitches.setValue([_mapId, this._eventId, 'A'], true);

                    } else {
                        $gameMap.eraseEvent(this._eventId);
                        this.erase();
                    }
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
                    var _weaponId = $gameActors.actor(1)._equips[0]._itemId;
                    if (Input.isTriggered('ok') && _weaponId > 0) {  
                        this.requestAnimation(121);
                        /*AudioManager.playSe({
                            name: 'MDSFX_FoeAtk_1_0',
                            pan: 0,
                            pitch: 100,
                            volume: 55
                        });*/
                        this.setMoveSpeed(6);
                        this.moveBackward();
                        this.moveBackward();
                        this.setMoveSpeed(4);
                        this.setTransparent(true);
                        this.setTransparent(false);
                        this.setTransparent(true);
                        this.setTransparent(false);
                        var _dmg = $dataWeapons[_weaponId].params[2];
                        this._eventEnemyHp -= _dmg;
                        //$dataMap.events[this._eventId]._eventEnemyHp -= _dmg;
                    } else {
                        if (this._eventEnemyTouching >= 20 && Number($gamePlayer._immunity) >= 60 && !this._prop) {
                            $gamePlayer.requestAnimation(1);
                            $gamePlayer.setTransparent(true);
                            $gamePlayer.setTransparent(false);
                            $gamePlayer.setTransparent(true);
                            $gamePlayer.setTransparent(false);
                            $gamePlayer.moveBackward();
                            $gamePlayer.moveBackward();
                            $gameActors.actor(1).gainHp(-50);
                            $gamePlayer._immunity = 0;
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
        /*var bitmap = ImageManager.loadPicture('projectile');
        var sprite = new Sprite(bitmap);
        sprite.x = 100;
        sprite.y = 100;
        this.addChild(sprite);*/
    };

    function _shootFireball(_skill) {
        var _eid = -1;
        for (var i = 0; i < 5; i++) {
            switch(Number($gamePlayer._direction)) {
                case 2:
                    // down
                    _eid = $gameMap.eventIdXy($gamePlayer.x, $gamePlayer.y+i);
                    break;
                case 6:
                    // right
                    _eid = $gameMap.eventIdXy($gamePlayer.x+i, $gamePlayer.y); 
                    break;
                case 8:
                    // up
                    _eid = $gameMap.eventIdXy($gamePlayer.x, $gamePlayer.y-i);
                    break;
                case 4:
                    // left
                    _eid = $gameMap.eventIdXy($gamePlayer.x-i, $gamePlayer.y); 
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

    var _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _SceneMap_update.call(this);

        if ($gamePlayer._immunity < 60) $gamePlayer._immunity += 1;
        if (Input.isTriggered('shift')) {
            var _skill = $dataSkills[$gamePlayer._skillId];
            if (_skill && _skill.meta) {
                if (_skill.meta.heal) {
                    $gameActors.actor(1).gainHp(Number(_skill.meta.heal));
                    $gamePlayer.requestAnimation(_skill.animationId);
                }

                if (_skill.meta.fireball) {
                    _shootFireball(_skill);
                }
            }
        }

        // cycle through skills
        if (Input.isTriggered('pagedown')) {
            var _len = $gameActors.actor(1)._skills.length-1;
            if ($gamePlayer._currentSpell+1 > _len) {
                $gamePlayer._currentSpell = 0;
            } else {
                $gamePlayer._currentSpell += 1;
            }

            $gamePlayer._skillId = $gameActors.actor(1)._skills[$gamePlayer._currentSpell];
        } else if (Input.isTriggered('pageup')) {
            if ($gamePlayer._currentSpell-1 >= 0) {
                $gamePlayer._currentSpell -= 1;
                $gamePlayer._skillId = $gameActors.actor(1)._skills[$gamePlayer._currentSpell];
            }
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

    HUD.prototype.refresh = function() {
        this.contents.clear();
        
        this.drawActorHp($gameParty.leader(), 0, 0, 200);
        this.drawActorMp($gameParty.leader(), 0, 48, 200);
        if ($gamePlayer && $gamePlayer._skillId) {
            if ($dataSkills[$gamePlayer._skillId]) {
                this.drawText("Spell: " + $dataSkills[$gamePlayer._skillId].name, 0, 96, 200);
            }
        }
        //this.drawText("Skill: ", 0, 96, 100)
    };

    HUD.prototype.windowWidth = function(){
        return 240;
    };

    HUD.prototype.windowHeight = function(){
        return 240;
    };

})();



