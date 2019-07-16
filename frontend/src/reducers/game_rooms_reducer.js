import { RECEIVE_GAME_ROOM, 
         REMOVE_GAME_ROOM,
         RECEIVE_ALL_GAME_ROOMS } from "../actions/game_room_actions";

const gameRoomsReducer = (state ={}, action) => {
    Object.freeze(state);
    switch (action.type) {
        case RECEIVE_GAME_ROOM:
            debugger;
            return Object.assign({}, state, {[action.gameRoom.data.id]: action.gameRoom.data });
        case REMOVE_GAME_ROOM:
            let new_state = Object.assign({}, state)
            delete new_state[action.gameRoom]
            return new_state;
        case RECEIVE_ALL_GAME_ROOMS: 
            debugger
            return Object.assign({}, state, action.gameRoom.data)
        default:
            return state;
    }
}

export default gameRoomsReducer;