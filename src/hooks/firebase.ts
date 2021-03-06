import firebase from "firebase/app";
import "firebase/database";

import { GameHandler, GamesHandler, Network } from "~/hooks/network";
import IGameState, { fillEmptyValues, GameMode, IGameStatus, IPlayer } from "~/lib/state";

export function setupFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      // Local database configuration using firebase-server
      ...(process.env.FIREBASE_DATABASE_URL && {
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      }),
      // Online database configuration
      ...(process.env.FIREBASE_API_KEY && {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      }),
    });
  }

  return firebase.database();
}

function gameIsPublic(game: IGameState) {
  return (
    !game.options.private &&
    game.status === IGameStatus.LOBBY &&
    game.options.gameMode === GameMode.NETWORK &&
    game.players.length &&
    game.players.length < game.options.playersCount
  );
}

export default class FirebaseNetwork implements Network {
  db: firebase.database.Database;

  constructor(db?: firebase.database.Database) {
    this.db = db || setupFirebase();
  }

  loadPublicGames(): Promise<IGameState[]> {
    const ref = this.db
      .ref("/games")
      // Only games created less than 10 minutes ago
      .orderByChild("createdAt")
      .startAt(Date.now() - 10 * 60 * 1000);

    return new Promise(resolve => {
      ref.once("value", event => {
        const games = Object.values(event.val() || {})
          .map(fillEmptyValues)
          // Game is public
          .filter(gameIsPublic);

        resolve(games);
      });
    });
  }

  subscribeToPublicGames(callback: GamesHandler) {
    const ref = this.db
      .ref("/games")
      // Only games created less than 10 minutes ago
      .orderByChild("createdAt")
      .startAt(Date.now() - 10 * 60 * 1000);

    ref.on("value", event => {
      const games = Object.values(event.val() || {})
        .map(fillEmptyValues)
        // Game is public
        .filter(gameIsPublic);

      callback(games);
    });

    return () => ref.off();
  }

  subscribeToOnGoingGames(callback: GamesHandler) {
    const ref = this.db
      .ref("/games")
      // Only games created less than 5 hours ago
      .orderByChild("createdAt")
      .startAt(Date.now() - 5 * 60 * 60 * 1000);

    ref.on("value", event => {
      const games = Object.values(event.val() || {}).map(fillEmptyValues);

      callback(games);
    });

    return () => ref.off();
  }

  loadGame(gameId: string): Promise<IGameState> {
    const ref = this.db.ref(`/games/${gameId}`);

    return new Promise(resolve => {
      ref.once("value", event => {
        resolve(fillEmptyValues(event.val()));
      });
    });
  }

  subscribeToGame(gameId: string, callback: GameHandler) {
    const ref = this.db.ref(`/games/${gameId}`);

    ref.on("value", event => {
      callback(fillEmptyValues(event.val() as IGameState));
    });

    return () => ref.off();
  }

  async updateGame(game: IGameState) {
    await this.db.ref(`/games/${game.id}`).set(game);
  }

  async setReaction(game: IGameState, player: IPlayer, reaction: string) {
    await this.db.ref(`/games/${game.id}/players/${player.index}/reaction`).set(reaction);
  }

  async setNotification(game: IGameState, player: IPlayer, notified: boolean) {
    await this.db.ref(`/games/${game.id}/players/${player.index}/notified`).set(notified);
  }
}
