import React, { Component } from 'react'
import socketIOClient from 'socket.io-client';
import $ from 'jquery';

class MultiGame extends Component {
  constructor(props) {
    super(props)
    this.state = {
      // Sockets
      ownHealthBar: 100,
      enemyHealthBar: 100,
      // socket: socketIOClient("http://127.0.0.1:5000"),
      socket: socketIOClient("https://typefighter.herokuapp.com"),

      // Gameplay
      gameTime: this.props.gameTime,
      initialWords: [],
      wordCount: 0,
      currentWPM: 0,
      elapsedTime: 0,
      decrementAmt: 0,
      correctWords: [],
      currentWord: '',
      currentInput: '',
      modal: this.props.modal,
      ownHealthBarDisplay: 250,
      enemyHealthBarDisplay: 250,
      enemyWPM: 0,
      enemyId: "",
      twoPlayers: true,
    }


    // Sockets
    this.handleHealthBarUpdate = this.handleHealthBarUpdate.bind(this);
    this.openSocket = this.openSocket.bind(this);

    // Helper function bindings
    this.createWordsArray = this.createWordsArray.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.createWordsDisplay = this.createWordsDisplay.bind(this);
    this.updateUserOutput = this.updateUserOutput.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.calculateWPM = this.calculateWPM.bind(this);
    this.calculateHealthBarDecrement = this.calculateHealthBarDecrement.bind(this);
    this.updateHealthBarDisplay = this.updateHealthBarDisplay.bind(this);
    this.correctInputDisplay = this.correctInputDisplay.bind(this);
    this.incorrectInputDisplay = this.incorrectInputDisplay.bind(this);
    this.resetInputDisplay = this.resetInputDisplay.bind(this);
    this.removeGameRoom = this.removeGameRoom.bind(this);

    // Moves


    // moves
    this.callPlayerAnimation = this.callPlayerAnimation.bind(this);
    this.punch = this.punch.bind(this);
    this.kick = this.kick.bind(this);
    this.rkick = this.rkick.bind(this);
    this.tatsumaki = this.tatsumaki.bind(this);
    this.hadoken = this.hadoken.bind(this);
    this.shoryuken = this.shoryuken.bind(this);
    this.jump = this.jump.bind(this);
    this.walkLeft = this.walkLeft.bind(this);
    this.walkRight = this.walkRight.bind(this);
  }

  openSocket() {
    this.state.socket.on(this.props.activeGameRoom.id, data => {
      if (data.myUserId !== this.props.currentUser.id) {
        
        this.setState({ ownHealthBar: data.enemyHealthBar, 
          enemyWPM: data.myCurrentWPM, 
          enemyId: data.myUserId })
      }
      if (data.players.length >= 3) {
        this.setState({twoPlayers: false})
      }
    });

    let data = {
      gameRoomId: this.props.activeGameRoom.id,
      myUserId: this.props.currentUser.id,
      enemyHealthBar: this.state.enemyHealthBar,
      myCurrentWPM: this.state.currentWPM,
    }
    this.state.socket.emit("gameRoom", data);
  }

  removeGameRoom(e) {
    if (e) {
      e.preventDefault();
    }
      let gameOver = this.state.gameTime <= this.state.elapsedTime;
      let activeGameRoom = this.props.activeGameRoom.id ? true : false;
      let twoPlayers = this.props.activeGameRoom.player1Id && this.props.activeGameRoom.player2Id;

    if (activeGameRoom) {
      let deleteData = {
        gameRoomId: this.props.activeGameRoom.id,
        currentUserId: this.props.currentUser.id
      }
      this.props.deleteGameRoom(deleteData);
    }
    
    if (!gameOver) {
      this.props.history.push('/options/multi');
    }
  }

  componentWillUnmount() {
    let data = {
      gameRoomId: this.props.activeGameRoom.id,
      myUserId: null,
      enemyHealthBar: this.state.enemyHealthBar,
      myCurrentWPM: this.state.currentWPM,
    }
    this.state.socket.emit("gameRoom", data);
    this.state.socket.disconnect();
    this.removeGameRoom();
    window.removeEventListener('beforeunload', this.removeGameRoom);
  }

  componentDidMount() {
    window.onbeforeunload = this.removeGameRoom;
    window.addEventListener('beforeunload', this.removeGameRoom);
    // Sockets
    this.openSocket();
    if (!this.props.activeGameRoom.id) {
      this.props.history.push('/options/multi');
    } else {
      this.props.openModal('gamestart-multi-modal')
    }

    // Gameplay
    this.createWordsArray();
    setTimeout(() => {
      this.calculateHealthBarDecrement();
    }, 1000);
  }

  componentDidUpdate(prevProps, prevState) {
    let { currentUser, openModal, updateMultiGameWpm, updateUser, activeGameRoom } = this.props;
    if (this.props.modal === null && this.state.elapsedTime === 0) this.startTimer();
    if (prevState.ownHealthBar > this.state.ownHealthBar) {
      this.callPlayerAnimation('player2');
      this.updateHealthBarDisplay();
    }

    if (!this.state.modal && (this.state.ownHealthBar === 0 || this.state.enemyHealthBar === 0 || this.state.gameTime <= 0 || (!this.state.twoPlayers && this.state.elapsedTime > 0) )) {
      this.setState({ modal: true });
      updateMultiGameWpm({ myOwnWPM: parseInt(this.state.currentWPM), enemyWPM: parseInt(this.state.enemyWPM), });
      let updateLoss;
      let updateWin;
      if (this.state.ownHealthBar === 0) {
        updateLoss = 1;
        updateWin = 0;
      } else if (this.state.enemyHealthBar === 0) {
        updateLoss = 0;
        updateWin = 1;
      }
      let updatedUser = {
        id: currentUser.id,
        multiplayerWins: updateWin,
        multiplayerLosses: updateLoss
      };
      updateUser(updatedUser);
      openModal('gameend-multi-modal');
      this.removeGameRoom();
    }
  }

  handleHealthBarUpdate() {
    let newEnemyHealthBar = this.state.enemyHealthBar - this.state.decrementAmt;
  
    if (newEnemyHealthBar <= 0) {
      newEnemyHealthBar = 0;
    }
    this.setState({enemyHealthBar: newEnemyHealthBar});
  }

  createWordsDisplay() {
    let passage = this.props.activeGameRoom.passage || ''
    let wordsArr = passage.split(' ').map((word, idx) => {
      return <span key={idx} id={idx} className="word__span">{word}&nbsp;</span>
    })

    return wordsArr;
  }

  startTimer() {
    const startSeconds = this.state.gameTime; 
    const startTime = Date.now()
    let timer = setInterval(() => {
      let delta = Date.now() - startTime;
      let timePassed = Math.floor(delta / 1000);
      this.setState( prevState =>({
        gameTime: startSeconds - timePassed,
        elapsedTime: timePassed
      }), () => {
        if (startSeconds <= timePassed) {
          clearInterval(timer)
        }
      })
    }, 1000);
  }

  createWordsArray() {
    let passage = this.props.activeGameRoom.passage || ''
    let words = passage.split(' ');
    let wordCount = words.length;

    let initialWords = words.map((word, idx) => {
      if (idx === (wordCount - 1)) {
        return `${word}`;
      } else {
        return `${word} `;
      }
    });
    
    let currentWord = initialWords.shift();
    this.setState({
      initialWords,
      currentWord: currentWord,
      wordCount: wordCount
    });

  }

  async handleInput(e) {
    e.persist();
    if (this.state.gameTime !== 0 && this.state.ownHealthBar !== 0) {
      let wordSoFar = e.target.value;

      await this.setState({
        currentInput: wordSoFar
      });
      this.updateUserOutput();
      this.handleSubmit();
    }
  }

  updateUserOutput() {
    return this.state.currentInput;
  }

  calculateWPM() {
    let numCorrectWords = this.state.correctWords.join('').length;
    let elapsedTime = this.state.elapsedTime;

    let currentWPM = ((numCorrectWords / 5 / elapsedTime) * 60).toFixed(0);
    this.setState({
      currentWPM: currentWPM
    });
  }

  calculateHealthBarDecrement() {
    let totalWords = this.state.wordCount;
    let decrementAmt = 100 / totalWords;

    this.setState({
      decrementAmt: decrementAmt
    })
  }
  
  handleSubmit() {
    let { currentWord, currentInput } = this.state;
    
    if (currentWord.length > currentInput.length) {
      this.resetInputDisplay();
    }

    if (currentWord === currentInput) {

      // audio
      let soundEffects = [
        new Audio('assets/audio/01-punch.mp3'),
        new Audio('assets/audio/02-punch.mp3'),
        new Audio('assets/audio/03-punch.mp3'),
        new Audio('assets/audio/04-punch.mp3'),
        new Audio('assets/audio/05-punch.mp3'),
        new Audio('assets/audio/06-punch.mp3'),
        new Audio('assets/audio/07-punch.mp3'),
      ];
      let randomSound = soundEffects[Math.floor(Math.random() * soundEffects.length)];
      randomSound.play();

      // animation
      this.callPlayerAnimation('player1');
      // health bar
      this.updateHealthBarDisplay();
      // input rendering
      this.resetInputDisplay();
      this.correctInputDisplay();
      // update live WPM
      this.calculateWPM();
      
      // update correct words in local state
      let correctWords = [...this.state.correctWords];
      correctWords.push(this.state.currentWord);
      let lastCorrectIdx = [...this.state.correctWords].length;
      // color correct words
      let word = document.getElementById(`${lastCorrectIdx}`);
      word.classList.add('word__span--correct')
      
      // update local state with new values (next word)
      this.setState({
        currentInput: '',
        initialWords: this.state.initialWords.slice(1),
        correctWords: correctWords,
        currentWord: this.state.initialWords[0]
      }, () => {
        // update healthbar on successful state update
        this.handleHealthBarUpdate();
      })
    }

    // red input on incorrect word
    if (currentWord.length < currentInput.length) {
      this.incorrectInputDisplay();
    }
  }

  // update health bar for both players
  updateHealthBarDisplay() {
    let ownHealth = this.state.ownHealthBar;
    let enemyHealth = this.state.enemyHealthBar;

    let ownBarDisplayPos = (250 * ownHealth) / 100;
    let enemyBarDisplayPos = (250 * enemyHealth) / 100;
    
    this.setState({
      ownHealthBarDisplay: ownBarDisplayPos,
      EnemyHealthBarDisplay: enemyBarDisplayPos,
    })
    let data = {
      gameRoomId: this.props.activeGameRoom.id,
      myUserId: this.props.currentUser.id,
      enemyHealthBar: this.state.enemyHealthBar,
      myCurrentWPM: this.state.currentWPM,
    }
    this.state.socket.emit("gameRoom", data);
  }


  // character animations (randomized)
  callPlayerAnimation(player) {

    let moves = ["punch", "kick", "rkick", "tatsumaki", "hadoken", "shoryuken", "jump", "kneel", "walkLeft", "walkRight"];
    let randomMoveNum = Math.floor(Math.random() * moves.length);

    switch (randomMoveNum) {
      case 0:
        this.punch(player);
        break;
      case 1:
        this.kick(player);
        break;
      case 2:
        this.rkick(player);
        break;
      case 3:
        this.tatsumaki(player);
        break;
      case 4:
        this.punch(player);
        break;
      case 5:
        this.shoryuken(player);
        break;
      case 6:
        this.hadoken(player);
        break;
      case 7:
        this.hadoken(player);
        break;
      case 8:
        this.hadoken(player);
        break;
      case 9:
        this.walkLeft(player);
        break;
      default:
        this.walkRight(player);
        break;
    }
  }

  punch(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('punch');
    setTimeout(function () { $ken.removeClass('punch'); }, 150);
  };

  kick(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('kick');
    setTimeout(function () { $ken.removeClass('kick'); }, 500);
  };

  rkick(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('reversekick');
    setTimeout(function () { $ken.removeClass('reversekick'); }, 500);
  };

  tatsumaki(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('tatsumaki');
    setTimeout(function () { $ken.addClass('down'); }, 1500);
    setTimeout(function () { $ken.removeClass('tatsumaki down'); }, 2000);
  };

  hadoken(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('hadoken');
    setTimeout(function () { $ken.removeClass('hadoken'); }, 500);
    setTimeout(function () {
      var $fireball = $('<div/>', { class: 'fireball' });
      $fireball.appendTo($ken);

      var isFireballColision = function () {
        return $fireballPos.left + 75 > $(window).width() ? true : false;
      };

      var explodeIfColision = setInterval(function () {
        $fireballPos = $fireball.offset();

        if (isFireballColision()) {
          $fireball.addClass('explode').removeClass('moving').css('marginLeft', '+=22px');
          clearInterval(explodeIfColision);
          setTimeout(function () { $fireball.remove(); }, 500);
        }

      }, 50);

      setTimeout(function () { $fireball.addClass('moving'); }, 20);

      setTimeout(function () {
        $fireball.remove();
        clearInterval(explodeIfColision);
      }, 3020);

    }, (250));
  };

  shoryuken(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('shoryuken');
    setTimeout(function () { $ken.addClass('down'); }, 500);
    setTimeout(function () { $ken.removeClass('shoryuken down'); }, 1000);
  };

  jump() {
    let $ken = $('.player1');
    let $kenPos, $fireballPos;
    $ken.addClass('jump');
    setTimeout(function () { $ken.addClass('down'); }, 500);
    setTimeout(function () { $ken.removeClass('jump down'); }, 1000);
  };

  walkLeft(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('walk').css({ marginLeft: '-=10px' });
  };

  walkRight(player) {
    let $ken;
    if (player === 'player1') {
      $ken = $('.player1');
    } else {
      $ken = $('.player2');
    }
    let $kenPos, $fireballPos;
    $ken.addClass('walk').css({ marginLeft: '+=10px' });
  };

  // green input box
  correctInputDisplay() {
    let input = document.querySelector(".game__input-box");
    
    input.classList.add('input__bg--green');
    setTimeout(() => {
      input.classList.remove('input__bg--green');
    }, 200);
  }
  
  // red input box
  incorrectInputDisplay() {
    let input = document.querySelector(".game__input-box");
    input.classList.add('input__bg--red');
  }
  
  // default input box
  resetInputDisplay() {
    let input = document.querySelector(".game__input-box");
    input.classList.remove('input__bg--red');
  }

  render() {
    let { currentUser, openModal, updateSingleGameWpm, updateUser, selectUser } = this.props;
    let enemyUser = selectUser(this.state.enemyId) || {};
    let enemyUsername = enemyUser.username;

    // show modal on game end

    return (
      <div className="multigame__container">
        <div className="multigame__fight-container">
            <div className="multigame__top">
              <div className="multigame__top-stats-wrapper">
                <div className="multigame__top-player">
                  <div className="multigame__player-name">{currentUser.username}</div>

                  <div className="multigame__player-health" style={{backgroundPosition: `${this.state.ownHealthBarDisplay}px`}}>
                  </div>
                  <div className="multigame__player-wpm">WPM: {this.state.currentWPM }</div>
                </div>
                <div className="multigame__top-timer">
                  <h4 className="multigame__top-time">00:{this.state.gameTime > 9 ? this.state.gameTime : `0${this.state.gameTime}`}</h4>
                </div>
                <div className="multigame__top-player">
                  <div className="multigame__player-name">{enemyUsername}</div>
                  <div className="multigame__player-health" style={{ backgroundPosition: `${this.state.EnemyHealthBarDisplay}px`}}></div>
                  <div className="multigame__player-wpm">WPM: {this.state.enemyWPM}</div>
                </div>
              </div>
            <div className="multigame__fight-inner">
              <div className="player1 stance"></div>
              <div className="player2 stance flip"></div>
            </div>
          </div>
        </div>
        <div className="game__input-container">
          <div className="game__display-paragraph">
            {this.createWordsDisplay()}
          </div>
          <div className="game__input-box-outer">
            <p className="game__input-preview">
              {this.state.currentInput === '' ? '       ' : this.state.currentInput}
            </p>
            <input
              type="text"
              className="game__input-box"
              placeholder="Type here.."
              value={this.state.currentInput}
              onChange={(e) => this.handleInput(e)}
              autoFocus />
          </div>
          </div>
        </div>
    )
  }
}

export default MultiGame;
