import React from "react";
import PlayerGame from "./playerGame";

export default ({ game, player, onSelectPlayer }) => {
  const otherPlayers = (game.players || []).filter(
    p => player && p.id !== player.id
  );

  return (
    <div className="flex flex-column h-100 overflow-y-scroll">
      <div className="flex-column pa2 pa4-l bg-gray-light">
        {otherPlayers.map((otherPlayer, i) => (
          <div key={i} className="mb2 mb4-l">
            <PlayerGame
              game={game}
              player={otherPlayer}
              onSelectPlayer={onSelectPlayer}
              active={otherPlayer === game.currentPlayer}
            />
          </div>
        ))}
      </div>
      {player && (
        <div
          className="flex-grow-1 pa2 pa4-l bg-gray-light b--gray-light bt"
          style={{ marginTop: "auto" }}
        >
          <PlayerGame
            game={game}
            player={player}
            self={true}
            onSelectPlayer={onSelectPlayer}
            active={player === game.currentPlayer}
          />
        </div>
      )}
    </div>
  );
};