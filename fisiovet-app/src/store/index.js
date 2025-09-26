import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
	persistStore,
	persistReducer,
	FLUSH,
	REHYDRATE,
	PAUSE,
	PERSIST,
	PURGE,
	REGISTER
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import userReducer from "./slices/userSlice";
import tutoresReduce from './slices/tutoresSlice'
import petsReducer from './slices/petsSlice'
import agendaReducer from './slices/agendaSlice'
import systemReducer from './slices/systemSlice'

const rootReducer = combineReducers(
	{ 
		user: userReducer,
		tutores: tutoresReduce,
		pets: petsReducer,
		agenda: agendaReducer,
		system: systemReducer,
	}
);

const persistConfig = {
	key: "root",
	storage: AsyncStorage,
	version: 2,
	whitelist: ["user", "tutores", 'pets', 'agenda', 'system'] // persista o que fizer sentido
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [
					FLUSH,
					REHYDRATE,
					PAUSE,
					PERSIST,
					PURGE,
					REGISTER
				]
			}
		})
});

export const persistor = persistStore(store);


