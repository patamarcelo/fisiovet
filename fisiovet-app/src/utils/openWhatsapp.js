// src/utils/openWhatsapp.js
import { Linking, Alert } from "react-native";

export async function openWhatsapp(phone, message = "") {
    if (!phone) {
        Alert.alert("WhatsApp", "Número de telefone não disponível.");
        return;
    }
    // remove não dígitos e garante DDI 55 (Brasil) por padrão
    const clean = phone.replace(/\D/g, "");
    const withDdi = clean.startsWith("55") ? clean : `55${clean}`;

    const url = `https://wa.me/${withDdi}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
        await Linking.openURL(url);
    } else {
        Alert.alert("WhatsApp", "Não foi possível abrir o WhatsApp.");
    }
}