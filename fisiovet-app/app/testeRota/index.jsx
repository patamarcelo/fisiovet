import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";


const TesteRotaPage = () => {
    return (
        <ThemedView
            style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center'

            }}>
            <ThemedText

            >Teste de nova rota</ThemedText>

        </ThemedView>
    );
}

export default TesteRotaPage;