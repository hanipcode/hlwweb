import { connect, subscribe, publishMessage, generateHeart } from "./pubnub";
import _ from "lodash";

subscribe("43", null, res => console.log(res));

// generateHeart(43, 15);
