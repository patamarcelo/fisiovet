// store/index.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import userReducer from "./slices/userSlice";
import tutoresReduce from './slices/tutoresSlice';
import petsReducer from './slices/petsSlice';
import agendaReducer from './slices/agendaSlice';
import systemReducer from './slices/systemSlice';
import avaliacaoReducer from './slices/avaliacaoSlice';
import bootstrapReducer from './bootstrapSlice';
import subscriptionReducer from "./slices/subscriptionSlice";
import syncQueueReducer from "./slices/syncQueueSlice";
import financeiroReducer from './slices/financeiroSlice';

import { clearSession } from "./sessionActions";

const appReducer = combineReducers({
	user: userReducer,
	tutores: tutoresReduce,
	pets: petsReducer,
	agenda: agendaReducer,
	financeiro:financeiroReducer,
	system: systemReducer,
	avaliacao: avaliacaoReducer,
	bootstrap: bootstrapReducer, // ⬅️ novo
	subscription: subscriptionReducer,
	syncQueue: syncQueueReducer,

});

const persistConfig = {
	key: "root",
	storage: AsyncStorage,
	version: 3,
	whitelist: ["user", "tutores", "pets", "agenda", "financeiro", "system", "avaliacao", "subscription"],
};

// ⬇️ rootReducer que zera tudo quando receber session/clear
const rootReducer = (state, action) => {
	if (action.type === clearSession.type) {
		// zera todo o estado redux na memória (volta aos initialStates dos slices)
		state = undefined;
	}
	return appReducer(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
			},
		}),
});

export const persistor = persistStore(store);