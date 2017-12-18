import Pubnub from "pubnub";
import { config } from "./config";
import _ from "lodash";

const presenceSubscription = new Set();
const messageSubscription = new Set();

const identifier = () =>
  Math.random()
    .toString(10)
    .slice(12);

let connection;

export const connect = () => {
  if (connection) {
    return connection;
  }

  connection = new Promise((resolve, reject) => {
    const uuid = identifier();
    const options = Object.assign({}, config.pubnub, { uuid });

    const pubnub = new Pubnub(options);

    const initialHandler = {
      status: statusEvent => {
        switch (statusEvent.category) {
          case "PNConnectedCategory":
          case "PNNetworkUpCategory":
            resolve(pubnub);
            break;
          case "PNDisconnectCategory":
          case "PNNetworkDownCategory":
            reject(new Error("Network is Down"));
            break;
          default:
            return;
        }

        pubnub.removeListener(initialHandler);

        pubnub.addListener({
          message: () => {
            messageSubscription.forEach(handler =>
              handler.apply(undefined, arguments)
            );
          },
          presence: () => {
            presenceSubscription.forEach(handler.apply(undefined, arguments));
          },
          status: statusEvent => {
            switch (statusEvent.category) {
              case "PNDisconnectedCategory":
              case "PNNetworkDownCategory":
                connect();
                break;
            }
          }
        });
      }
    };

    pubnub.addListener(initialHandler);

    const handshake = pubnub =>
      new Promise((resolve, reject) => {
        pubnub.time(status => {
          if (status.error) {
            reject(
              new Error("Pubnub service error on handshalke" + status.error)
            );
          } else {
            resolve(pubnub);
          }
        });
      });

    return handshake(pubnub)
      .then(() => resolve({ uuid, pubnub }))
      .catch(reject);
  });

  return connection;
};

export function subscribe(channel, presenceHandler, messageHandler) {
  presenceSubscription.add(presenceHandler);
  messageSubscription.add(messageHandler);

  connect().then(({ pubnub }) => {
    pubnub.subscribe({
      channels: [channel],
      withPresence: true
    });

    return {
      unsubscribe: () => {
        presenceSubscription.delete(presenceHandler);
        messageSubscription.delete(messageHandler);

        return connect().then(handle => handle.unsubscribe({ channel }));
      }
    };
  });
}

export function publishMessage(channel, message) {
  return new Promise((resolve, reject) => {
    connect().then(({ pubnub }) =>
      pubnub.publish(
        {
          channel,
          message
        },
        (status, response) => {
          if (status.error) {
            reject(status.category);
          } else {
            resolve();
          }
        }
      )
    );
  });
}

export function generateHeart(broadcaster_id, numberOfTimes) {
  _.range(numberOfTimes).forEach(() => {
    publishMessage(broadcaster_id.toString(), {
      type: "heart",
      sender: {
        id: 100,
        name: "uwuwuwuwuuw",
        avatar: "https://robohash.org/312wqeq3"
      },
      text: ""
    });
  });
}
