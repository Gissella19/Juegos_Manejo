(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function setLife(container, life) {
    container.style.width = life + "%";
  }

  document.onkeydown = function (e) {
    if (e.keyCode === 32) {
      window.location.reload();
    }
  };

  (function () {
    var startGame = function () {
      $("loading").style.visibility = "hidden";
      $("arena").style.visibility = "visible";
      $("utils").style.visibility = "visible";
    };

    function initGame(isHost, gameName) {
      $("loading").style.visibility = "visible";
      var selectedArena = parseInt($("arenaSelect").value, 10);

      var options = {
        arena: {
          container: document.getElementById("arena"),
          arena: selectedArena,
        },
        fighters: [{ name: "Subzero" }, { name: "Kano" }],
        callbacks: {
          attack: function (f, o, l) {
            if (o.getName() === "kano") {
              setLife($("player2Life"), o.getLife());
            } else {
              setLife($("player1Life"), o.getLife());
            }
          },
          "game-end": function (loser) {
            var isKano = loser.getName() === "kano";
            var winnerName = isKano ? "Sub-Zero" : "Kano";

            $("endGameTitle").innerText =
              "¡" + winnerName + " gana el combate!";
            $("endGameMessage").innerText =
              "Excelente pelea. El perdedor debe levantarse, entrenar más duro y prepararse para la revancha.";
            $("endGameModal").style.display = "flex";
          },
        },
        isHost: isHost,
        gameName: gameName,
        gameType: "network",
      };

      mk.start(options).ready(function () {
        startGame();
      });
    }

    var modal = $("setupModal");
    var btnHost = $("btnHost");
    var btnJoin = $("btnJoin");
    var inputName = $("roomName");

    btnHost.onclick = function () {
      if (inputName.value.trim() !== "") {
        modal.style.display = "none";
        initGame(true, inputName.value.trim());
      }
    };

    btnJoin.onclick = function () {
      if (inputName.value.trim() !== "") {
        modal.style.display = "none";
        initGame(false, inputName.value.trim());
      }
    };

    var btnRestart = $("btnRestart");

    btnRestart.onclick = function () {
      window.location.reload();
    };

    var btnInfo = $("btnInfo");
    var btnCloseInfo = $("btnCloseInfo");
    var infoPanel = $("infoPanel");

    btnInfo.onclick = function () {
      infoPanel.classList.add("open");
    };

    btnCloseInfo.onclick = function () {
      infoPanel.classList.remove("open");
    };

    var btnBack = $("btnBack");
    btnBack.onclick = function () {
      window.location.href = "http://127.0.0.1:5500/index.html";
    };
  })();
})();
