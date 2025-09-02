import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import firebase from "@react-native-firebase/app";

export default function FirebaseCheck() {
    const [status, setStatus] = useState("⏳ Testando...");

    useEffect(() => {
        try {
            if (firebase.apps.length) {
                console.log("Firebase apps:", firebase.apps);
                setStatus("✅ Firebase inicializado");
            } else {
                setStatus("❌ Nenhum app inicializado");
            }
        } catch (e) {
            console.error(e);
            setStatus("⚠️ Erro ao inicializar Firebase");
        }
    }, []);

    return (
        <View className="flex-1 items-center justify-center">
            <Text>{status}</Text>
        </View>
    );
}
